import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useResumeStore } from '@typst-compiler/resumeState'
import {
  MessageType,
  getFailedTaskType,
  isTaskCompletedEvent,
  isTaskFailedEvent,
} from '@type/websocket.event.type'
import type {
  ChecklistMatchingCompletedEvent,
  ChecklistParsingCompletedEvent,
  JobFailedEvent,
  ResumeParsingCompletedEvent,
  ResumeTailoringCompletedEvent,
  ScoreUpdatingCompletedEvent,
  WebSocketMessage,
} from '@type/websocket.event.type'
import { API_BASE_URL } from '@/api/jobs'

interface UseEditorWebSocketOptions {
  jobId: string | undefined
  enabled: boolean
}

const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_BASE_DELAY_MS = 1000

function nextReconnectDelay(attempt: number): number {
  return RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1)
}

function handleScoreUpdating(
  message: ScoreUpdatingCompletedEvent,
  context: {
    jobId: string
    queryClient: ReturnType<typeof useQueryClient>
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
  message: ChecklistParsingCompletedEvent,
  context: {
    jobId: string
    queryClient: ReturnType<typeof useQueryClient>
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
  message: ChecklistMatchingCompletedEvent,
  context: {
    jobId: string
    queryClient: ReturnType<typeof useQueryClient>
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
  message: ResumeParsingCompletedEvent,
  context: {
    jobId: string
    queryClient: ReturnType<typeof useQueryClient>
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
  message: ResumeTailoringCompletedEvent,
  context: {
    jobId: string
    queryClient: ReturnType<typeof useQueryClient>
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

function updateFailedTaskInCache(
  message: JobFailedEvent,
  context: {
    jobId: string
    queryClient: ReturnType<typeof useQueryClient>
  },
): void {
  const failedTaskType = getFailedTaskType(message)
  if (!failedTaskType) {
    return
  }

  context.queryClient.setQueryData(['jobApplication', context.jobId], (old: any) => {
    if (!old) return old

    return {
      ...old,
      failedTasks: {
        ...old.failedTasks,
        [failedTaskType]: new Date().toISOString(),
      },
    }
  })
}

export default function useEditorWebSocket({
  jobId,
  enabled,
}: UseEditorWebSocketOptions) {
  const queryClient = useQueryClient()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldReconnectRef = useRef(true)

  const setParsingResume = useResumeStore((state) => state.setParsingResume)
  const setParsingChecklist = useResumeStore((state) => state.setParsingChecklist)
  const setTailoringResume = useResumeStore((state) => state.setTailoringResume)
  const setMatchingTailoredResume = useResumeStore(
    (state) => state.setMatchingTailoredResume,
  )

  useEffect(() => {
    if (!jobId || !enabled) {
      return
    }

    shouldReconnectRef.current = true
    reconnectAttemptsRef.current = 0

    const wsBaseUrl = API_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '')
    const wsUrl = `${wsBaseUrl}/jobs/${jobId}/events`

    const resetAllAIFlags = () => {
      setParsingResume(false)
      setParsingChecklist(false)
      setTailoringResume(false)
      setMatchingTailoredResume(false)
    }

    const handleFailedMessage = (message: JobFailedEvent) => {
      const failedTaskType = getFailedTaskType(message)
      console.warn('[Editor WS] Task failed:', failedTaskType ?? 'unknown')

      updateFailedTaskInCache(message, { jobId, queryClient })

      switch (failedTaskType) {
        case 'resume.parsing':
          setParsingResume(false)
          break
        case 'checklist.parsing':
          setParsingChecklist(false)
          break
        case 'resume.tailoring':
          setTailoringResume(false)
          setMatchingTailoredResume(false)
          break
        case 'checklist.matching':
          setMatchingTailoredResume(false)
          break
        case 'score.updating':
          break
        default:
          resetAllAIFlags()
      }
    }

    const connect = () => {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0
        console.log('[Editor WS] Connected for job:', jobId)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage

          if (isTaskFailedEvent(message)) {
            handleFailedMessage(message)
            return
          }

          if (!isTaskCompletedEvent(message)) {
            console.warn('[Editor WS] Unknown event payload:', message)
            resetAllAIFlags()
            return
          }

          switch (message.type) {
            case MessageType.SCORE_UPDATING_COMPLETED:
              handleScoreUpdating(message, { jobId, queryClient })
              break
            case MessageType.CHECKLIST_MATCHING_COMPLETED:
              handleChecklistMatching(message, { jobId, queryClient })
              setMatchingTailoredResume(false)
              break
            case MessageType.CHECKLIST_PARSING_COMPLETED:
              handleChecklistParsing(message, { jobId, queryClient })
              setParsingChecklist(false)
              break
            case MessageType.RESUME_PARSING_COMPLETED:
              handleResumeParsing(message, { jobId, queryClient })
              setParsingResume(false)
              break
            case MessageType.RESUME_TAILORING_COMPLETED:
              handleResumeTailoring(message, { jobId, queryClient })
              setTailoringResume(false)
              setMatchingTailoredResume(true)
              break
            default:
              console.warn('[Editor WS] Unhandled completed event:', message)
              resetAllAIFlags()
          }
        } catch (error) {
          console.warn('[Editor WS] Failed to parse message:', error)
          resetAllAIFlags()
        }
      }

      ws.onerror = (error) => {
        console.error('[Editor WS] Error:', error)
      }

      ws.onclose = (event) => {
        if (wsRef.current === ws) {
          wsRef.current = null
        }

        console.log('[Editor WS] Disconnected for job:', jobId, event.code)

        if (!shouldReconnectRef.current) {
          return
        }

        if (event.code === 1000) {
          return
        }

        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.warn('[Editor WS] Max reconnect attempts reached for job:', jobId)
          return
        }

        reconnectAttemptsRef.current += 1
        const delayMs = nextReconnectDelay(reconnectAttemptsRef.current)

        console.log(
          '[Editor WS] Scheduling reconnect attempt',
          reconnectAttemptsRef.current,
          'in',
          delayMs,
          'ms for job:',
          jobId,
        )

        reconnectTimerRef.current = setTimeout(() => {
          if (shouldReconnectRef.current) {
            connect()
          }
        }, delayMs)
      }
    }

    connect()

    return () => {
      shouldReconnectRef.current = false

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }

      const ws = wsRef.current
      wsRef.current = null
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('[Editor WS] Closing WebSocket for job:', jobId)
        ws.close()
      }
    }
  }, [
    enabled,
    jobId,
    queryClient,
    setMatchingTailoredResume,
    setParsingChecklist,
    setParsingResume,
    setTailoringResume,
  ])
}
