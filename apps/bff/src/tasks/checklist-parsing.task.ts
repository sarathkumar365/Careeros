import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { JobApplicationService } from '../jobs/job-application.service';
import { WebSocketService } from '../websocket/websocket.service';
import { EnqueueService } from '../queue/enqueue.service';
import type {
  TaskSuccess,
  TaskFailed,
  ChecklistParsing,
  ChecklistParsingCompleted,
  ChecklistParsingFailed,
} from '../types/task.types';
import {
  CHECKLIST_PARSING,
  CHECKLIST_PARSING_COMPLETED,
  CHECKLIST_PARSING_FAILED,
} from '../types/task.types';
import { TaskBundle } from './task-bundle';

@Injectable()
export class ChecklistParsingTask implements TaskBundle {
  readonly type = CHECKLIST_PARSING;
  readonly events = {
    completed: CHECKLIST_PARSING_COMPLETED,
    failed: CHECKLIST_PARSING_FAILED,
  };
  private readonly logger = new Logger(ChecklistParsingTask.name);

  constructor(
    @Inject(forwardRef(() => JobApplicationService))
    private readonly jobApplication: JobApplicationService,
    private readonly websocket: WebSocketService,
    private readonly enqueue: EnqueueService,
  ) {}

  async start(payload: ChecklistParsing): Promise<void> {
    await this.enqueue.enqueueChecklistParsing(payload);
    this.logger.debug(`Enqueued checklist parsing for ${payload.jobId}`);
  }

  async onSuccess(
    event: Extract<TaskSuccess, { type: 'checklist.parsing.completed' }>,
  ): Promise<ChecklistParsingCompleted> {
    try {
      await this.jobApplication.updateChecklist(event.jobId, event.checklist);
      this.logger.debug(`Updated JD checklist ${event.jobId}`);
      this.websocket.broadcast(event.jobId, event);
      return event;
    } catch (error) {
      this.logger.error(`Failed to save to DB ${event.jobId}: ${error}`);
      throw error;
    }
  }

  onFailed(
    event: Extract<TaskFailed, { type: 'checklist.parsing.failed' }>,
  ): ChecklistParsingFailed {
    this.logger.error(
      `Checklist parsing failed ${event.jobId}: ${event.error}`,
    );
    this.websocket.broadcast(event.jobId, event);
    return event;
  }
}
