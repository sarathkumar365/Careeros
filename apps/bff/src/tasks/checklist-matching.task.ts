import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { JobApplicationService } from '../jobs/job-application.service';
import { WebSocketService } from '../websocket/websocket.service';
import { EnqueueService } from '../queue/enqueue.service';
import type {
  TaskSuccess,
  TaskFailed,
  ChecklistMatching,
  ChecklistMatchingCompleted,
  ChecklistMatchingFailed,
} from '../types/task.types';
import {
  CHECKLIST_MATCHING,
  CHECKLIST_MATCHING_COMPLETED,
  CHECKLIST_MATCHING_FAILED,
} from '../types/task.types';
import { TaskBundle } from './task-bundle';

@Injectable()
export class ChecklistMatchingTask implements TaskBundle {
  readonly type = CHECKLIST_MATCHING;
  readonly events = {
    completed: CHECKLIST_MATCHING_COMPLETED,
    failed: CHECKLIST_MATCHING_FAILED,
  };
  private readonly logger = new Logger(ChecklistMatchingTask.name);

  constructor(
    @Inject(forwardRef(() => JobApplicationService))
    private readonly jobApplication: JobApplicationService,
    private readonly websocket: WebSocketService,
    private readonly enqueue: EnqueueService,
  ) {}

  async start(payload: ChecklistMatching): Promise<void> {
    await this.enqueue.enqueueChecklistMatching(payload);
    this.logger.debug(`Enqueued checklist matching for ${payload.jobId}`);
  }

  async onSuccess(
    event: Extract<TaskSuccess, { type: 'checklist.matching.completed' }>,
  ): Promise<ChecklistMatchingCompleted> {
    try {
      await this.jobApplication.updateChecklist(event.jobId, event.checklist);
      this.logger.debug(`Updated matched checklist ${event.jobId}`);
      this.websocket.broadcast(event.jobId, event);
      return event;
    } catch (error) {
      this.logger.error(`Failed to update checklist ${event.jobId}: ${error}`);
      throw error;
    }
  }

  onFailed(
    event: Extract<TaskFailed, { type: 'checklist.matching.failed' }>,
  ): ChecklistMatchingFailed {
    this.logger.error(
      `Checklist matching failed ${event.jobId}: ${event.error}`,
    );
    this.websocket.broadcast(event.jobId, event);
    return event;
  }
}
