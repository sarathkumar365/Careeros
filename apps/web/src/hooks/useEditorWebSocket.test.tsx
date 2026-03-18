import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useResumeStore } from '@typst-compiler/resumeState'
import useEditorWebSocket from './useEditorWebSocket'

class FakeWebSocket {
  static instances: Array<FakeWebSocket> = []
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = FakeWebSocket.CONNECTING
  url: string
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(url: string | URL) {
    this.url = url.toString()
    FakeWebSocket.instances.push(this)
  }

  send() {}

  close() {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.({ code: 1000, wasClean: true } as CloseEvent)
  }

  serverOpen() {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  serverMessage(payload: unknown) {
    this.onmessage?.({
      data: JSON.stringify(payload),
    } as MessageEvent)
  }

  serverClose(code = 1006, wasClean = false) {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.({ code, wasClean } as CloseEvent)
  }
}

function HookHarness({ jobId = 'job-1' }: { jobId?: string }) {
  useEditorWebSocket({
    jobId,
    enabled: Boolean(jobId),
  })
  return null
}

describe('useEditorWebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeWebSocket.instances = []
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)

    useResumeStore.setState({
      isParsingResume: false,
      isParsingChecklist: false,
      isTailoringResume: false,
      isMatchingTailoredResume: false,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('handles resume tailoring failed events and updates failedTasks', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['jobApplication', 'job-1'], {
      failedTasks: {},
    })

    render(
      <QueryClientProvider client={queryClient}>
        <HookHarness />
      </QueryClientProvider>,
    )

    expect(FakeWebSocket.instances).toHaveLength(1)

    useResumeStore.setState({
      isTailoringResume: true,
      isMatchingTailoredResume: true,
    })

    act(() => {
      FakeWebSocket.instances[0].serverMessage({
        type: 'resume.tailoring.failed',
        jobId: 'job-1',
        error: 'resume.tailoring',
        timestamp: new Date().toISOString(),
      })
    })

    expect(useResumeStore.getState().isTailoringResume).toBe(false)
    expect(useResumeStore.getState().isMatchingTailoredResume).toBe(false)

    const job = queryClient.getQueryData<{ failedTasks: Record<string, string> }>([
      'jobApplication',
      'job-1',
    ])
    expect(job).toBeTruthy()
    if (!job) {
      throw new Error('Missing cached job data')
    }
    expect(job.failedTasks['resume.tailoring']).toBeTruthy()
  })

  it('handles legacy failed events and clears parsing checklist flag', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['jobApplication', 'job-1'], {
      failedTasks: {},
    })

    render(
      <QueryClientProvider client={queryClient}>
        <HookHarness />
      </QueryClientProvider>,
    )

    expect(FakeWebSocket.instances).toHaveLength(1)

    useResumeStore.setState({
      isParsingChecklist: true,
    })

    act(() => {
      FakeWebSocket.instances[0].serverMessage({
        type: 'failed',
        jobId: 'job-1',
        error: 'checklist.parsing',
        timestamp: new Date().toISOString(),
      })
    })

    expect(useResumeStore.getState().isParsingChecklist).toBe(false)

    const job = queryClient.getQueryData<{ failedTasks: Record<string, string> }>([
      'jobApplication',
      'job-1',
    ])
    expect(job).toBeTruthy()
    if (!job) {
      throw new Error('Missing cached job data')
    }
    expect(job.failedTasks['checklist.parsing']).toBeTruthy()
  })

  it('resets all ai flags for unknown failed payloads', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['jobApplication', 'job-1'], {
      failedTasks: {},
    })

    render(
      <QueryClientProvider client={queryClient}>
        <HookHarness />
      </QueryClientProvider>,
    )

    expect(FakeWebSocket.instances).toHaveLength(1)

    useResumeStore.setState({
      isParsingResume: true,
      isParsingChecklist: true,
      isTailoringResume: true,
      isMatchingTailoredResume: true,
    })

    act(() => {
      FakeWebSocket.instances[0].serverMessage({
        type: 'failed',
        jobId: 'job-1',
        error: 'unknown.task',
        timestamp: new Date().toISOString(),
      })
    })

    const state = useResumeStore.getState()
    expect(state.isParsingResume).toBe(false)
    expect(state.isParsingChecklist).toBe(false)
    expect(state.isTailoringResume).toBe(false)
    expect(state.isMatchingTailoredResume).toBe(false)
  })

  it('handles completed tailoring -> matching transition deterministically', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['jobApplication', 'job-1'], {
      checklist: null,
      tailoredResume: null,
      matchPercentage: 0,
      failedTasks: {},
    })

    render(
      <QueryClientProvider client={queryClient}>
        <HookHarness />
      </QueryClientProvider>,
    )

    expect(FakeWebSocket.instances).toHaveLength(1)

    useResumeStore.setState({
      isTailoringResume: true,
      isMatchingTailoredResume: false,
    })

    act(() => {
      FakeWebSocket.instances[0].serverMessage({
        type: 'resume.tailoring.completed',
        jobId: 'job-1',
        resumeStructure: { summary: { text: 'tailored' } },
        timestamp: new Date().toISOString(),
      })
    })

    expect(useResumeStore.getState().isTailoringResume).toBe(false)
    expect(useResumeStore.getState().isMatchingTailoredResume).toBe(true)

    act(() => {
      FakeWebSocket.instances[0].serverMessage({
        type: 'checklist.matching.completed',
        jobId: 'job-1',
        checklist: {
          hardRequirements: [],
          softRequirements: [],
          preferredSkills: [],
          needTailoring: [],
        },
        timestamp: new Date().toISOString(),
      })
    })

    expect(useResumeStore.getState().isMatchingTailoredResume).toBe(false)
  })

  it('reconnects on abnormal close with bounded retry', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['jobApplication', 'job-1'], {
      failedTasks: {},
    })

    render(
      <QueryClientProvider client={queryClient}>
        <HookHarness />
      </QueryClientProvider>,
    )

    expect(FakeWebSocket.instances).toHaveLength(1)

    act(() => {
      FakeWebSocket.instances[0].serverClose(1006, false)
    })

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(FakeWebSocket.instances).toHaveLength(2)
  })
})
