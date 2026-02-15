/**
 * Task Bundle - Self-contained unit that handles a specific task type
 *
 * A task bundle encapsulates the complete lifecycle of a task:
 * - Starting the task (reading DB, enqueueing, or executing directly)
 * - Handling success results (saving to DB, broadcasting)
 * - Handling failure results (logging, broadcasting)
 *
 * A task bundle does NOT know about:
 * - Workflow DAG (doesn't know what comes next)
 * - Other tasks (doesn't trigger other tasks)
 * - Workflow state (just handles its own side effects)
 * - task handle send by design
 *
 * The workflow orchestrator:
 * - Calls start() to trigger a task
 * - Receives task results (completed/failed)
 * - Decides what task to run next based on DAG
 *
 * Each bundle contains:
 * - type: The task type constant
 * - events: Completed and failed event type constants
 * - start: Initiates the task (enqueue for queue tasks, execute for BFF tasks)
 * - onSuccess: Handler for successful task completion
 * - onFailed: Handler for task failure
 */

import { Module, forwardRef } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { ScoringModule } from '../scoring/scoring.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { JobsModule } from '../jobs/jobs.module';
import { ResumeParsingTask } from './resume-parsing.task';
import { ResumeTailoringTask } from './resume-tailoring.task';
import { ChecklistParsingTask } from './checklist-parsing.task';
import { ChecklistMatchingTask } from './checklist-matching.task';
import { ScoreUpdatingTask } from './score-updating.task';

@Module({
  imports: [
    forwardRef(() => QueueModule),
    ScoringModule,
    WebsocketModule,
    forwardRef(() => JobsModule),
  ],
  providers: [
    ResumeParsingTask,
    ResumeTailoringTask,
    ChecklistParsingTask,
    ChecklistMatchingTask,
    ScoreUpdatingTask,
  ],
  exports: [
    ResumeParsingTask,
    ResumeTailoringTask,
    ChecklistParsingTask,
    ChecklistMatchingTask,
    ScoreUpdatingTask,
  ],
})
export class TasksModule {}
