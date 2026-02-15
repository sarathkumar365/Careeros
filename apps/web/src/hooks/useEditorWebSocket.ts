import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useResumeStore } from '@typst-compiler/resumeState'
import { MessageType } from '@type/websocket.event.type'
import type { QueryClient } from '@tanstack/react-query'
import type {
  ChecklistMatchingEvent,
  ChecklistParsingEvent,
  JobFailedEvent,
  ResumeParsingEvent,
  ResumeTailoringEvent,
  ScoreUpdatingEvent,
  WebSocketMessage,
} from '@type/websocket.event.type'
import { API_BASE_URL } from '@/api/jobs'

interface UseEditorWebSocketOptions {
  jobId: string | undefined
  enabled: boolean
}

function handleScoreUpdating(
  message: ScoreUpdatingEvent,
  context: {
    jobId: string
    queryClient: QueryClient
  },
): void {
  context.queryClient.setQueryData(
    ['jobApplication', context.jobId],
    (old: any) => {
      if (!old) return old
      return {
        ...old,
        matchPercentage: message.matchPercentage,
      }
    },
  )
}

function handleChecklistParsing(
  message: ChecklistParsingEvent,
  context: {
    jobId: string
    queryClient: QueryClient
  },
): void {
  context.queryClient.setQueryData(
    ['jobApplication', context.jobId],
    (old: any) => {
      if (!old) return old
      return {
        ...old,
        checklist: message.checklist,
      }
    },
  )
}

function handleChecklistMatching(
  message: ChecklistMatchingEvent,
  context: {
    jobId: string
    queryClient: QueryClient
  },
): void {
  context.queryClient.setQueryData(
    ['jobApplication', context.jobId],
    (old: any) => {
      if (!old) return old
      return {
        ...old,
        checklist: message.checklist,
      }
    },
  )
}

function handleResumeParsing(
  message: ResumeParsingEvent,
  context: {
    jobId: string
    queryClient: QueryClient
  },
): void {
  context.queryClient.setQueryData(
    ['jobApplication', context.jobId],
    (old: any) => {
      if (!old) return old
      return {
        ...old,
        tailoredResume: message.resumeStructure,
      }
    },
  )
}

function handleResumeTailoring(
  message: ResumeTailoringEvent,
  context: {
    jobId: string
    queryClient: QueryClient
  },
): void {
  context.queryClient.setQueryData(
    ['jobApplication', context.jobId],
    (old: any) => {
      if (!old) return old
      return {
        ...old,
        tailoredResume: message.resumeStructure,
      }
    },
  )
}

function handleJobFailed(
  message: JobFailedEvent,
  context: {
    setParsingResume: (isLoading: boolean) => void
    setParsingChecklist: (isLoading: boolean) => void
    setTailoringResume: (isLoading: boolean) => void
    setMatchingTailoredResume: (isLoading: boolean) => void
  },
): void {
  console.warn('[Editor WS] Job failed:', message.error || 'unknown task')

  // Turn off the appropriate loading spinner based on which task failed
  if (message.error === 'resume.parsing') {
    context.setParsingResume(false)
  } else if (message.error === 'resume.tailoring') {
    context.setTailoringResume(false)
    context.setMatchingTailoredResume(false)
  } else if (message.error === 'checklist.parsing') {
    context.setParsingChecklist(false)
  } else if (message.error === 'checklist.matching') {
    context.setMatchingTailoredResume(false)
  } else {
    // Unknown task type, turn off all spinners to be safe
    context.setParsingResume(false)
    context.setParsingChecklist(false)
    context.setTailoringResume(false)
    context.setMatchingTailoredResume(false)
  }
}

export default function useEditorWebSocket({
  jobId,
  enabled,
}: UseEditorWebSocketOptions) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const hasConnectedRef = useRef(false)
  const setParsingResume = useResumeStore((state) => state.setParsingResume)
  const setParsingChecklist = useResumeStore(
    (state) => state.setParsingChecklist,
  )
  const setTailoringResume = useResumeStore((state) => state.setTailoringResume)
  const setMatchingTailoredResume = useResumeStore(
    (state) => state.setMatchingTailoredResume,
  )
  const isMatchingTailoredResume = useResumeStore(
    (state) => state.isMatchingTailoredResume,
  )

  useEffect(() => {
    if (!jobId || !enabled || hasConnectedRef.current) {
      console.log('[Editor WS] Skipping connection:', {
        jobId,
        enabled,
        hasConnected: hasConnectedRef.current,
      })
      return
    }

    // Mark that we've connected for this job
    hasConnectedRef.current = true

    const wsBaseUrl = API_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '')
    const wsUrl = `${wsBaseUrl}/jobs/${jobId}/events`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[Editor WS] Connected for job:', jobId)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage

        if (message.type === MessageType.FAILED) {
          handleJobFailed(message, {
            setParsingResume,
            setParsingChecklist,
            setTailoringResume,
            setMatchingTailoredResume,
          })

          // Update query cache with new failed task
          queryClient.setQueryData(['jobApplication', jobId], (old: any) => {
            if (!old || !message.error) return old
            return {
              ...old,
              failedTasks: {
                ...old.failedTasks,
                [message.error]: new Date().toISOString(),
              },
            }
          })
        } else if (message.type === MessageType.SCORE_UPDATING) {
          handleScoreUpdating(message, { jobId, queryClient })
        } else if (message.type === MessageType.CHECKLIST_MATCHING) {
          handleChecklistMatching(message, { jobId, queryClient })
          // If this is after tailoring, clear the matching state
          if (isMatchingTailoredResume) {
            setMatchingTailoredResume(false)
          }
        } else if (message.type === MessageType.CHECKLIST_PARSING) {
          handleChecklistParsing(message, { jobId, queryClient })
          setParsingChecklist(false)
        } else if (message.type === MessageType.RESUME_PARSING) {
          handleResumeParsing(message, { jobId, queryClient })
          setParsingResume(false)
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (message.type === MessageType.RESUME_TAILORING) {
          handleResumeTailoring(message, { jobId, queryClient })
          // After tailoring completes, start waiting for checklist matching
          setTailoringResume(false)
          setMatchingTailoredResume(true)
        } else {
          console.log('[Editor WS] unknown event ', message)
          throw new Error('[Editor WS] Unknown event should never happens')
        }
      } catch (error) {
        console.warn('[Editor WS] Failed to parse message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('[Editor WS] Error:', error)
    }

    ws.onclose = () => {
      console.log('[Editor WS] Disconnected for job:', jobId)
      if (wsRef.current === ws) {
        wsRef.current = null
      }
    }

    return () => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        console.log('[Editor WS] Closing WebSocket')
        ws.close()
      }
      wsRef.current = null
    }
  }, [
    jobId,
    enabled,
    queryClient,
    setParsingResume,
    setParsingChecklist,
    setTailoringResume,
    setMatchingTailoredResume,
    isMatchingTailoredResume,
  ])

  useEffect(() => {
    // Reset connection flag when jobId changes
    hasConnectedRef.current = false
  }, [jobId])
}
