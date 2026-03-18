import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearLastResume,
  loadLastResume,
  saveLastResume,
} from './lastResumeCache'

type OpenRequest = {
  result: IDBDatabase
  error: DOMException | null
  onsuccess: ((this: IDBOpenDBRequest, ev: Event) => unknown) | null
  onerror: ((this: IDBOpenDBRequest, ev: Event) => unknown) | null
  onupgradeneeded:
    | ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown)
    | null
}

type StoreRequest<T> = {
  result: T
  error: DOMException | null
  onsuccess: ((this: IDBRequest<T>, ev: Event) => unknown) | null
  onerror: ((this: IDBRequest<T>, ev: Event) => unknown) | null
}

class FakeIndexedDbFactory {
  private readonly store = new Map<string, unknown>()
  private created = false

  seed(key: string, value: unknown) {
    this.store.set(key, value)
  }

  open(): IDBOpenDBRequest {
    const db = this.createDb()
    const request: OpenRequest = {
      result: db,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    }

    setTimeout(() => {
      if (!this.created && request.onupgradeneeded) {
        request.onupgradeneeded.call(
          request as unknown as IDBOpenDBRequest,
          new Event('upgradeneeded') as IDBVersionChangeEvent,
        )
      }
      this.created = true
      request.onsuccess?.call(
        request as unknown as IDBOpenDBRequest,
        new Event('success'),
      )
    }, 0)

    return request as unknown as IDBOpenDBRequest
  }

  private createDb(): IDBDatabase {
    const factory = this
    const db = {
      objectStoreNames: {
        contains(name: string) {
          return factory.created && name === 'files'
        },
      },
      createObjectStore() {
        factory.created = true
        return {} as IDBObjectStore
      },
      transaction() {
        return {
          objectStore() {
            return {
              put(value: unknown) {
                const record = value as { id: string }
                factory.store.set(record.id, value)
                return makeStoreRequest(undefined)
              },
              get(key: string) {
                return makeStoreRequest(factory.store.get(key))
              },
              delete(key: string) {
                factory.store.delete(key)
                return makeStoreRequest(undefined)
              },
            } as unknown as IDBObjectStore
          },
        } as IDBTransaction
      },
      close() {
        return
      },
    }

    return db as unknown as IDBDatabase
  }
}

function makeStoreRequest<T>(result: T): IDBRequest<T> {
  const request: StoreRequest<T> = {
    result,
    error: null,
    onsuccess: null,
    onerror: null,
  }

  setTimeout(() => {
    request.onsuccess?.call(
      request as unknown as IDBRequest<T>,
      new Event('success'),
    )
  }, 0)

  return request as unknown as IDBRequest<T>
}

describe('lastResumeCache', () => {
  let fakeIndexedDb: FakeIndexedDbFactory

  beforeEach(() => {
    fakeIndexedDb = new FakeIndexedDbFactory()
    vi.stubGlobal('indexedDB', {
      open: () => fakeIndexedDb.open(),
    })
  })

  it('saves and loads the last resume file', async () => {
    const file = new File(['resume-data'], 'resume.txt', {
      type: 'text/plain',
      lastModified: 123,
    })

    await saveLastResume(file)
    const loaded = await loadLastResume()

    expect(loaded).not.toBeNull()
    expect(loaded?.name).toBe('resume.txt')
    expect(loaded?.type).toBe('text/plain')
    expect(loaded?.lastModified).toBe(123)
    expect(loaded?.size).toBe(file.size)
  })

  it('returns null when no cached resume exists', async () => {
    const loaded = await loadLastResume()
    expect(loaded).toBeNull()
  })

  it('returns null for malformed cached resume', async () => {
    fakeIndexedDb.seed('lastResume', {
      id: 'lastResume',
      name: 'broken.pdf',
      type: 'application/pdf',
      lastModified: Date.now(),
      cachedAt: Date.now(),
      blob: 'invalid',
    })

    const loaded = await loadLastResume()
    expect(loaded).toBeNull()
  })

  it('fails open when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined)

    await expect(saveLastResume(new File(['x'], 'resume.txt'))).resolves.toBe(
      undefined,
    )
    await expect(loadLastResume()).resolves.toBeNull()
    await expect(clearLastResume()).resolves.toBe(undefined)
  })
})
