const DB_NAME = 'careeros-upload-cache'
const DB_VERSION = 1
const STORE_NAME = 'files'
const LAST_RESUME_KEY = 'lastResume'

type CachedResumeRecord = {
  id: string
  name: string
  type: string
  lastModified: number
  cachedAt: number
  blob: Blob
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB is not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

function getStore(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  const transaction = db.transaction(STORE_NAME, mode)
  return transaction.objectStore(STORE_NAME)
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

export async function saveLastResume(file: File): Promise<void> {
  try {
    const db = await openDb()
    try {
      const store = getStore(db, 'readwrite')
      const payload: CachedResumeRecord = {
        id: LAST_RESUME_KEY,
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        cachedAt: Date.now(),
        blob: file,
      }

      await promisifyRequest(store.put(payload))
    } finally {
      db.close()
    }
  } catch (error) {
    console.warn('[lastResumeCache] Failed to save resume:', error)
  }
}

export async function loadLastResume(): Promise<File | null> {
  try {
    const db = await openDb()
    try {
      const store = getStore(db, 'readonly')
      const record = (await promisifyRequest(store.get(LAST_RESUME_KEY))) as
        | CachedResumeRecord
        | undefined

      if (!record) {
        return null
      }

      if (!(record.blob instanceof Blob) || typeof record.name !== 'string') {
        console.warn('[lastResumeCache] Invalid cached resume format')
        return null
      }

      return new File([record.blob], record.name, {
        type: record.type,
        lastModified: record.lastModified,
      })
    } finally {
      db.close()
    }
  } catch (error) {
    console.warn('[lastResumeCache] Failed to load resume:', error)
    return null
  }
}

export async function clearLastResume(): Promise<void> {
  try {
    const db = await openDb()
    try {
      const store = getStore(db, 'readwrite')
      await promisifyRequest(store.delete(LAST_RESUME_KEY))
    } finally {
      db.close()
    }
  } catch (error) {
    console.warn('[lastResumeCache] Failed to clear resume cache:', error)
  }
}
