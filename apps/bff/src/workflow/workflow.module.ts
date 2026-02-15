/**
 * Central orchestrator for workflow execution
 *
 *  - Workflow
 *  An unweighted directed acyclic graph (DAG) where each node is a
 *  task. Defines the execution order and dependencies between tasks. The
 *  minimal workflow contains just one task. Workflows can be composed as
 *  subgraphs of larger workflows. DESIGN PHILOSOPHY: Minimize coupling,
 *  maximize clarity
 * --------------------------------------------------------
 *
 * This orchestrator follows three key principles:
 *
 * 1. DECOUPLING - Workflow doesn't know task internals
 *    The orchestrator knows NOTHING about:
 *    - How tasks execute (enqueue vs direct)
 *    - What services tasks use internally
 *    - Task implementation details
 *
 *    The orchestrator ONLY knows:
 *    - Task dependencies (prerequisites & triggers)
 *    - Payload shapes for starting tasks
 *    - Event types to listen for
 *
 * 2. Traditional approach:
 *    - Task A completes → Save to DB
 *    - Task B starts → Read from DB (Task A's result)
 *    - Task B completes → Save to DB
 *    - Task C starts → Read from DB (Task B's result)
 *    [Many DB reads/writes]
 *
 *
 * 3. PERSISTENCE - Survive crashes and restarts
 *    DB field: job_applications.workflowSteps (JSON)
 *
 *    Persisted data (minimal, for recovery):
 *    - taskStates: { 'resume.parsing': 'completed', 'checklist.parsing': 'running', ... }
 *    - timestamps
 *    - error messages (if any)
 *    - resultTypes (e.g., 'resume.parsing.completed')
 *
 *    NOT persisted (to keep DB writes small):
 *    - Full task results (these stay in memory)
 *
 *    Persistence strategy: Save after each task completion
 *    - Reliable: always know where workflow stopped
 *    - Performant: one small write per task (acceptable overhead)
 *
 *    Recovery on restart:
 *    - Load workflowSteps from DB
 *    - Reconstruct taskStates
 *    - Tasks that were 'running' → mark as 'failed' (requeue or notify)
 *    - Ready tasks (all prerequisites completed) → restart them
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { TasksModule } from '../tasks/tasks.module';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [DatabaseModule, forwardRef(() => TasksModule)],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
