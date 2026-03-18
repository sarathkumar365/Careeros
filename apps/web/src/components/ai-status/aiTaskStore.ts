import { create } from 'zustand'
import type { FailedTasksMap, TaskMessageType } from '@/api/jobs'

// Task status for each AI task type
export type TaskStatus = 'idle' | 'running' | 'completed' | 'failed'

// Retry interaction state
interface RetryState {
  isHolding: boolean
  holdProgress: number
  isRetrying: boolean
  targetTask: TaskMessageType | null
}

interface AITaskState {
  // Task statuses
  taskStatuses: Record<TaskMessageType, TaskStatus>

  // Failed tasks from database (synced from API)
  failedTasks: FailedTasksMap

  // Retry interaction state
  retry: RetryState

  // Hover state for UI
  isHovering: boolean

  // Actions - Task status
  setTaskStatus: (task: TaskMessageType, status: TaskStatus) => void
  setTaskRunning: (task: TaskMessageType) => void
  setTaskCompleted: (task: TaskMessageType) => void
  setTaskFailed: (task: TaskMessageType) => void

  // Actions - Failed tasks (sync from API)
  syncFailedTasks: (failedTasks: FailedTasksMap) => void
  clearFailedTask: (task: TaskMessageType) => void
  clearAllFailedTasks: () => void

  // Actions - Retry interaction
  startHold: (targetTask: TaskMessageType) => void
  updateHoldProgress: (progress: number) => void
  cancelHold: () => void
  completeHold: () => void
  setRetrying: (isRetrying: boolean) => void

  // Actions - UI state
  setHovering: (isHovering: boolean) => void

  // Computed helpers
  hasAnyFailedTask: () => boolean
  getFirstFailedTask: () => TaskMessageType | null
}

const initialTaskStatuses: Record<TaskMessageType, TaskStatus> = {
  'resume.parsing': 'idle',
  'resume.tailoring': 'idle',
  'checklist.parsing': 'idle',
  'checklist.matching': 'idle',
  'score.updating': 'idle',
}

const initialRetryState: RetryState = {
  isHolding: false,
  holdProgress: 0,
  isRetrying: false,
  targetTask: null,
}

export const useAITaskStore = create<AITaskState>()((set, get) => ({
  taskStatuses: { ...initialTaskStatuses },
  failedTasks: {},
  retry: { ...initialRetryState },
  isHovering: false,

  // Task status actions
  setTaskStatus: (task, status) => {
    set((state) => ({
      taskStatuses: { ...state.taskStatuses, [task]: status },
    }))
  },

  setTaskRunning: (task) => {
    set((state) => ({
      taskStatuses: { ...state.taskStatuses, [task]: 'running' },
    }))
  },

  setTaskCompleted: (task) => {
    set((state) => ({
      taskStatuses: { ...state.taskStatuses, [task]: 'completed' },
    }))
  },

  setTaskFailed: (task) => {
    set((state) => ({
      taskStatuses: { ...state.taskStatuses, [task]: 'failed' },
    }))
  },

  // Failed tasks actions
  syncFailedTasks: (failedTasks) => {
    set({ failedTasks })
  },

  clearFailedTask: (task) => {
    set((state) => {
      const newFailedTasks = { ...state.failedTasks }
      delete newFailedTasks[task]
      return { failedTasks: newFailedTasks }
    })
  },

  clearAllFailedTasks: () => {
    set({ failedTasks: {} })
  },

  // Retry interaction actions
  startHold: (targetTask) => {
    set({
      retry: {
        isHolding: true,
        holdProgress: 0,
        isRetrying: false,
        targetTask,
      },
    })
  },

  updateHoldProgress: (progress) => {
    set((state) => ({
      retry: { ...state.retry, holdProgress: progress },
    }))
  },

  cancelHold: () => {
    set({
      retry: { ...initialRetryState },
    })
  },

  completeHold: () => {
    set((state) => ({
      retry: {
        ...state.retry,
        isHolding: false,
        holdProgress: 0,
        isRetrying: true,
      },
    }))
  },

  setRetrying: (isRetrying) => {
    set((state) => ({
      retry: { ...state.retry, isRetrying },
    }))
  },

  // UI state actions
  setHovering: (isHovering) => {
    set({ isHovering })
  },

  // Computed helpers
  hasAnyFailedTask: () => {
    const { failedTasks } = get()
    return Object.keys(failedTasks).length > 0
  },

  getFirstFailedTask: () => {
    const { failedTasks } = get()
    const keys = Object.keys(failedTasks) as Array<TaskMessageType>
    return keys.length > 0 ? keys[0] : null
  },
}))
