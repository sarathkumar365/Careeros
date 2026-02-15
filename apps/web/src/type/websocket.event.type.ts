import type { Checklist } from '@type/checklist'

//
// MODIFYING THE FOLLOWING TYPES IS CATASTROPHIC
// NEVER MODIFY THIS FILE
//

export enum MessageType {
  FAILED = 'failed',
  SCORE_UPDATING = 'score.updating.completed',
  CHECKLIST_PARSING = 'checklist.parsing.completed',
  CHECKLIST_MATCHING = 'checklist.matching.completed',
  RESUME_PARSING = 'resume.parsing.completed',
  RESUME_TAILORING = 'resume.tailoring.completed',
}

export interface ScoreUpdatingEvent {
  type: MessageType.SCORE_UPDATING
  jobId: string
  matchPercentage: number
  timestamp: string
}

export interface ChecklistMatchingEvent {
  type: MessageType.CHECKLIST_MATCHING
  jobId: string
  checklist: Checklist
  timestamp: string
}

export interface ChecklistParsingEvent {
  type: MessageType.CHECKLIST_PARSING
  jobId: string
  checklist: Checklist
  timestamp: string
}

export interface ResumeParsingEvent {
  type: MessageType.RESUME_PARSING
  jobId: string
  resumeStructure: Record<string, unknown>
  timestamp: string
}

export interface ResumeTailoringEvent {
  type: MessageType.RESUME_TAILORING
  jobId: string
  resumeStructure: Record<string, unknown>
  timestamp: string
}

export interface JobFailedEvent {
  type: MessageType.FAILED
  jobId: string
  error?: string
  timestamp: string
}

export type WebSocketMessage =
  | JobFailedEvent
  | ScoreUpdatingEvent
  | ResumeParsingEvent
  | ResumeTailoringEvent
  | ChecklistParsingEvent
  | ChecklistMatchingEvent
