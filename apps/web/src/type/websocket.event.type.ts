import type { TaskMessageType } from '@/api/jobs'
import type { Checklist } from '@type/checklist'

export enum MessageType {
  LEGACY_FAILED = 'failed',
  SCORE_UPDATING_COMPLETED = 'score.updating.completed',
  CHECKLIST_PARSING_COMPLETED = 'checklist.parsing.completed',
  CHECKLIST_MATCHING_COMPLETED = 'checklist.matching.completed',
  RESUME_PARSING_COMPLETED = 'resume.parsing.completed',
  RESUME_TAILORING_COMPLETED = 'resume.tailoring.completed',
  SCORE_UPDATING_FAILED = 'score.updating.failed',
  CHECKLIST_PARSING_FAILED = 'checklist.parsing.failed',
  CHECKLIST_MATCHING_FAILED = 'checklist.matching.failed',
  RESUME_PARSING_FAILED = 'resume.parsing.failed',
  RESUME_TAILORING_FAILED = 'resume.tailoring.failed',
}

const COMPLETED_EVENT_TYPES = new Set<string>([
  MessageType.SCORE_UPDATING_COMPLETED,
  MessageType.CHECKLIST_PARSING_COMPLETED,
  MessageType.CHECKLIST_MATCHING_COMPLETED,
  MessageType.RESUME_PARSING_COMPLETED,
  MessageType.RESUME_TAILORING_COMPLETED,
])

const FAILED_EVENT_TYPES = new Set<string>([
  MessageType.LEGACY_FAILED,
  MessageType.SCORE_UPDATING_FAILED,
  MessageType.CHECKLIST_PARSING_FAILED,
  MessageType.CHECKLIST_MATCHING_FAILED,
  MessageType.RESUME_PARSING_FAILED,
  MessageType.RESUME_TAILORING_FAILED,
])

const TASK_MESSAGE_TYPES = new Set<TaskMessageType>([
  'resume.parsing',
  'resume.tailoring',
  'checklist.parsing',
  'checklist.matching',
  'score.updating',
])

export interface ScoreUpdatingCompletedEvent {
  type: MessageType.SCORE_UPDATING_COMPLETED
  jobId: string
  matchPercentage: number
  timestamp: string
}

export interface ChecklistMatchingCompletedEvent {
  type: MessageType.CHECKLIST_MATCHING_COMPLETED
  jobId: string
  checklist: Checklist
  timestamp: string
}

export interface ChecklistParsingCompletedEvent {
  type: MessageType.CHECKLIST_PARSING_COMPLETED
  jobId: string
  checklist: Checklist
  timestamp: string
}

export interface ResumeParsingCompletedEvent {
  type: MessageType.RESUME_PARSING_COMPLETED
  jobId: string
  resumeStructure: Record<string, unknown>
  timestamp: string
}

export interface ResumeTailoringCompletedEvent {
  type: MessageType.RESUME_TAILORING_COMPLETED
  jobId: string
  resumeStructure: Record<string, unknown>
  timestamp: string
}

type TaskFailedEventType =
  | MessageType.SCORE_UPDATING_FAILED
  | MessageType.CHECKLIST_PARSING_FAILED
  | MessageType.CHECKLIST_MATCHING_FAILED
  | MessageType.RESUME_PARSING_FAILED
  | MessageType.RESUME_TAILORING_FAILED

export interface TaskFailedEvent {
  type: TaskFailedEventType
  jobId: string
  error: string
  timestamp: string
}

export interface LegacyFailedEvent {
  type: MessageType.LEGACY_FAILED
  jobId: string
  error?: string
  timestamp: string
}

export type JobFailedEvent = TaskFailedEvent | LegacyFailedEvent

export type CompletedWebSocketEvent =
  | ScoreUpdatingCompletedEvent
  | ResumeParsingCompletedEvent
  | ResumeTailoringCompletedEvent
  | ChecklistParsingCompletedEvent
  | ChecklistMatchingCompletedEvent

export type WebSocketMessage = CompletedWebSocketEvent | JobFailedEvent

export function isTaskCompletedEvent(message: {
  type: string
}): message is CompletedWebSocketEvent {
  return COMPLETED_EVENT_TYPES.has(message.type)
}

export function isTaskFailedEvent(message: {
  type: string
}): message is JobFailedEvent {
  return FAILED_EVENT_TYPES.has(message.type)
}

function parseTaskFromFailedType(type: string): TaskMessageType | null {
  if (!type.endsWith('.failed')) {
    return null
  }

  const taskType = type.split('.').slice(0, 2).join('.') as TaskMessageType
  return TASK_MESSAGE_TYPES.has(taskType) ? taskType : null
}

export function getFailedTaskType(
  message: JobFailedEvent,
): TaskMessageType | null {
  if (message.type === MessageType.LEGACY_FAILED) {
    if (!message.error) {
      return null
    }
    return TASK_MESSAGE_TYPES.has(message.error as TaskMessageType)
      ? (message.error as TaskMessageType)
      : null
  }
  return parseTaskFromFailedType(message.type)
}
