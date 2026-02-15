import { Checklist } from './checklist.types';

/*
 *  Naming Conventions:
 *
 *  1. Task Names: <resource>.<action>
 *  - resource: the entity being operated on (resume, checklist, score)
 *  - action: the operation being performed (parsing, tailoring, matching, updating)
 *  Examples: resume.parsing, checklist.matching, score.updating
 *
 *  2. Event States: <task>.<state>
 *  - .completed: task finished successfully
 *  - .failed: task encountered an error
 *  Examples: resume.parsing.completed, score.updating.failed
 *
 *  3. Processing Location Independence:
 *  - All tasks follow the same naming pattern regardless of where they execute
 *  - AI service tasks: resume.parsing, resume.tailoring, checklist.\*
 *  - BFF tasks: score.updating
 *  - The processing location is an implementation detail, not a semantic difference
 */

// ============================================================================
// Task
// ============================================================================

export const SCORE_UPDATING = 'score.updating';
export const SCORE_UPDATING_FAILED = 'score.updating.failed';
export const SCORE_UPDATING_COMPLETED = 'score.updating.completed';

export const RESUME_PARSING = 'resume.parsing';
export const RESUME_PARSING_FAILED = 'resume.parsing.failed';
export const RESUME_PARSING_COMPLETED = 'resume.parsing.completed';

export const RESUME_TAILORING = 'resume.tailoring';
export const RESUME_TAILORING_FAILED = 'resume.tailoring.failed';
export const RESUME_TAILORING_COMPLETED = 'resume.tailoring.completed';

export const CHECKLIST_PARSING = 'checklist.parsing';
export const CHECKLIST_PARSING_FAILED = 'checklist.parsing.failed';
export const CHECKLIST_PARSING_COMPLETED = 'checklist.parsing.completed';

export const CHECKLIST_MATCHING = 'checklist.matching';
export const CHECKLIST_MATCHING_FAILED = 'checklist.matching.failed';
export const CHECKLIST_MATCHING_COMPLETED = 'checklist.matching.completed';

export type Task =
  | typeof RESUME_PARSING
  | typeof RESUME_TAILORING
  | typeof CHECKLIST_PARSING
  | typeof CHECKLIST_MATCHING
  | typeof SCORE_UPDATING;

type TaskSuccessAI =
  | ResumeParsingCompleted
  | ResumeTailoringCompleted
  | ChecklistMatchingCompleted
  | ChecklistParsingCompleted;

type TaskFailedAI =
  | ResumeParsingFailed
  | ResumeTailoringFailed
  | ChecklistMatchingFailed
  | ChecklistParsingFailed;

export type TaskAI = TaskSuccessAI | TaskFailedAI;

export type TaskSuccessBff = ScoreUpdatingCompleted;
export type TaskFailedBff = ScoreUpdatingFailed;

export type TaskSuccess = TaskSuccessAI | TaskSuccessBff;
export type TaskFailed = TaskFailedAI | TaskFailedBff;
export type TaskResult = TaskFailed | TaskSuccess;

// ============================================================================
// Task Payload
// ============================================================================

type TaskBase = {
  jobId: string;
};

type FailedEventBase = {
  error: string;
};

export type TaskPayload =
  | ChecklistParsing
  | ChecklistMatching
  | ResumeParsing
  | ResumeTailoring
  | ScoreUpdating;

export type ResumeParsing = TaskBase & {
  rawResumeContent: string;
  jsonSchema: Record<string, unknown>;
};

export type ResumeParsingFailed = TaskBase &
  FailedEventBase & {
    type: typeof RESUME_PARSING_FAILED;
  };

export type ResumeParsingCompleted = TaskBase & {
  type: typeof RESUME_PARSING_COMPLETED;
  resumeStructure: Record<string, unknown>;
};

export type ResumeTailoring = TaskBase & {
  checklist: Checklist;
  resumeStructure: Record<string, unknown>;
  jsonSchema: Record<string, unknown>;
};

export type ResumeTailoringFailed = TaskBase &
  FailedEventBase & {
    type: typeof RESUME_TAILORING_FAILED;
  };

export type ResumeTailoringCompleted = TaskBase & {
  type: typeof RESUME_TAILORING_COMPLETED;
  resumeStructure: Record<string, unknown>;
};

export type ChecklistParsing = TaskBase & {
  jobDescription: string;
};

export type ChecklistParsingFailed = TaskBase &
  FailedEventBase & {
    type: typeof CHECKLIST_PARSING_FAILED;
  };

export type ChecklistParsingCompleted = TaskBase & {
  type: typeof CHECKLIST_PARSING_COMPLETED;
  checklist: Checklist;
};

export type ChecklistMatching = TaskBase & {
  checklist: Checklist;
  resumeStructure: Record<string, unknown>;
};

export type ChecklistMatchingFailed = TaskBase &
  FailedEventBase & {
    type: typeof CHECKLIST_MATCHING_FAILED;
  };

export type ChecklistMatchingCompleted = TaskBase & {
  type: typeof CHECKLIST_MATCHING_COMPLETED;
  checklist: Checklist;
};

export type ScoreUpdating = TaskBase;

export type ScoreUpdatingFailed = TaskBase &
  FailedEventBase & {
    type: typeof SCORE_UPDATING_FAILED;
  };

export type ScoreUpdatingCompleted = TaskBase & {
  type: typeof SCORE_UPDATING_COMPLETED;
  matchPercentage: number;
  timestamp: string;
};
