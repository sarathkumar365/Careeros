/**
 * Workflow Dependency Graphs
 *
 * Defines the structure and dependencies for each workflow type. Each task
 * specifies its prerequisites and what tasks it should trigger upon
 * completion.
 *
 * DESIGN PRINCIPLE #1: DECOUPLING
 * -------------------------------
 * Workflow orchestrator should NOT know about task internals. It only needs:
 * - Task prerequisites & triggers (DAG structure)
 * - Payload shape for each task
 * - Event types (success/failure)
 *
 * Task bundles handle their own:
 * - Execution logic (enqueue vs direct)
 * - Service dependencies
 * - Success/failure handling
 *
 * DESIGN PRINCIPLE #2: PERSISTENCE
 * --------------------------------
 * Workflow state is persisted to survive restarts/crashes:
 *
 * DB field: job_applications.workflowSteps (JSON)
 * Stores: task states, timestamps, errors
 *
 * Persistence strategy: Save after each task completion
 * - Reliable: always know where workflow stopped
 * - Performant: one small write per task
 *
 * Recovery on restart:
 * - Load workflowSteps from DB
 * - Reconstruct taskStates
 * - Tasks that were 'running' → mark as 'failed' (or requeue)
 * - Ready tasks (all prerequisites completed) → restart them
 */

import {
  RESUME_PARSING,
  RESUME_TAILORING,
  CHECKLIST_PARSING,
  CHECKLIST_MATCHING,
  SCORE_UPDATING,
} from '../types/task.types';
import type { Task } from '../types/task.types';

export type WorkflowStatus = 'running' | 'completed' | 'failed';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

/** Tracks which tasks are pending/running/completed/failed */
export type TaskStateMap = Partial<Record<Task, TaskStatus>>;

/**
 * Task dependencies - defines what comes before and after
 */
export interface TaskDep {
  prerequisites: Task[];
  triggers: Task[];
}

/**
 * Workflow definition - DAG structure of task dependencies
 *
 * Maps each task type to its prerequisites and triggers.
 * Task bundles (with start/onSuccess/onFailed handlers) are injected separately.
 *
 * Note: Kept as code constants for now (not in DB) for simplicity.
 * Could move to DB later for dynamic workflows.
 */
export type Workflow = Partial<Record<Task, TaskDep>>;
export type WorkflowName = string;

/**
 * Workflow execution instance
 *
 * - Tracks state of a workflow run for a specific job
 * - One workflow instance per jobId at a time
 * - Persisted in database (job_applications.workflowSteps field)
 *
 * Persisted structure (workflowSteps field):
 * - taskStates: Which tasks are pending/running/completed/failed
 * - status: Overall workflow status
 */
export interface WorkflowInstance {
  jobId: string;
  workflowName: WorkflowName;
  taskStates: TaskStateMap;
  status: WorkflowStatus;
}

/**
 * Workflow definitions
 *
 * Each workflow is a DAG where:
 * - Entry tasks: tasks with no prerequisites
 * - Terminal tasks: tasks with no triggers
 * - Edges: defined by prerequisites and triggers
 */

/**
 * CREATE_APPLICATION_WORKFLOW
 *
 * Entry tasks: resume.parsing, checklist.parsing (run in parallel)
 */
export const CREATE_APPLICATION_WORKFLOW: Workflow = {
  [RESUME_PARSING]: {
    prerequisites: [],
    triggers: [CHECKLIST_MATCHING],
  },
  [CHECKLIST_PARSING]: {
    prerequisites: [],
    triggers: [CHECKLIST_MATCHING],
  },
  [CHECKLIST_MATCHING]: {
    prerequisites: [RESUME_PARSING, CHECKLIST_PARSING],
    triggers: [SCORE_UPDATING],
  },
  [SCORE_UPDATING]: {
    prerequisites: [CHECKLIST_MATCHING],
    triggers: [],
  },
};

/**
 * TAILORING_WORKFLOW
 *
 * Entry task: resume.tailoring
 * Flow: resume.tailoring -> checklist.matching → score.updating
 *
 * Note: This workflow assumes checklist already exists in DB (from previous
 * CREATE_APPLICATION)
 */
export const TAILORING_WORKFLOW: Workflow = {
  [RESUME_TAILORING]: {
    prerequisites: [],
    triggers: [CHECKLIST_MATCHING],
  },
  [CHECKLIST_MATCHING]: {
    prerequisites: [RESUME_TAILORING],
    triggers: [SCORE_UPDATING],
  },
  [SCORE_UPDATING]: {
    prerequisites: [CHECKLIST_MATCHING],
    triggers: [],
  },
};
