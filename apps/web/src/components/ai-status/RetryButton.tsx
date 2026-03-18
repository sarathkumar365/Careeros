import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAITaskStore } from './aiTaskStore'
import { TASK_MESSAGE_TYPES, retryFailedTasks } from '@/api/jobs'

const HOLD_DURATION = 1500 // 1.5 seconds

interface RetryButtonProps {
  jobId?: string
  jsonSchema?: Record<string, unknown>
}

export function RetryButton({ jobId, jsonSchema }: RetryButtonProps) {
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null)
  const holdStartRef = useRef<number>(0)
  const queryClient = useQueryClient()

  // Store state
  const isHolding = useAITaskStore((state) => state.retry.isHolding)
  const holdProgress = useAITaskStore((state) => state.retry.holdProgress)
  const isRetrying = useAITaskStore((state) => state.retry.isRetrying)
  const isHovering = useAITaskStore((state) => state.isHovering)

  // Store actions
  const storeStartHold = useAITaskStore((state) => state.startHold)
  const updateHoldProgress = useAITaskStore((state) => state.updateHoldProgress)
  const storeCancelHold = useAITaskStore((state) => state.cancelHold)
  const storeCompleteHold = useAITaskStore((state) => state.completeHold)
  const setRetrying = useAITaskStore((state) => state.setRetrying)
  const setHovering = useAITaskStore((state) => state.setHovering)
  const getFirstFailedTask = useAITaskStore((state) => state.getFirstFailedTask)

  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!jobId) {
        throw new Error('Missing jobId for retry')
      }
      return retryFailedTasks(jobId, jsonSchema)
    },
    onSuccess: (data) => {
      console.log('[Retry] Tasks retried:', data.retriedTasks)
      setRetrying(false)

      // Refetch to update failedTasks from server state
      queryClient.invalidateQueries({
        queryKey: ['jobApplication', jobId],
      })
    },
    onError: (error) => {
      console.error('[Retry] Failed:', error)
      setRetrying(false)
    },
  })

  // Cleanup hold timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current)
      }
    }
  }, [])

  const startHold = () => {
    storeStartHold(getFirstFailedTask() ?? 'resume.tailoring')
    holdStartRef.current = Date.now()

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100)
      updateHoldProgress(progress)

      if (progress >= 100) {
        completeHold()
      }
    }, 16) // ~60fps
  }

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current)
      holdTimerRef.current = null
    }
    storeCancelHold()
  }

  const completeHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current)
      holdTimerRef.current = null
    }
    storeCompleteHold()

    // Optimistically clear failed tasks from cache
    if (jobId) {
      queryClient.setQueryData(['jobApplication', jobId], (old: any) => {
        if (!old) return old
        const newFailedTasks = { ...old.failedTasks }
        for (const taskType of TASK_MESSAGE_TYPES) {
          delete newFailedTasks[taskType]
        }
        return { ...old, failedTasks: newFailedTasks }
      })
    }

    // Trigger retry
    retryMutation.mutate()
  }

  // Determine button content based on retry state
  let buttonContent
  if (isRetrying) {
    buttonContent = <span>Retrying...</span>
  } else if (isHolding) {
    buttonContent = <span>Keep Hold to Retry</span>
  } else if (isHovering) {
    buttonContent = <span>Hold to Retry</span>
  } else {
    buttonContent = <span>Task Failed</span>
  }

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false)
        cancelHold()
      }}
      disabled={isRetrying}
      className="relative w-full cursor-pointer overflow-hidden bg-black px-3 py-2 text-gray-200 transition-all duration-200 hover:bg-gray-200 hover:text-black focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none active:scale-96 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {/* Progress fill overlay */}
      {isHolding && (
        <div
          className="absolute inset-0 bg-gray-600 transition-all"
          style={{
            width: `${holdProgress}%`,
            transition: 'width 16ms linear',
          }}
        />
      )}
      <div className="relative z-10 flex flex-row items-center justify-center gap-2">
        {buttonContent}
      </div>
    </button>
  )
}
