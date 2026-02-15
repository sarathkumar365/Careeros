import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { JobApplicationService } from '../jobs/job-application.service';
import { WebSocketService } from '../websocket/websocket.service';
import { EnqueueService } from '../queue/enqueue.service';
import type {
  TaskSuccess,
  TaskFailed,
  ResumeTailoring,
  ResumeTailoringCompleted,
  ResumeTailoringFailed,
} from '../types/task.types';
import {
  RESUME_TAILORING,
  RESUME_TAILORING_COMPLETED,
  RESUME_TAILORING_FAILED,
} from '../types/task.types';
import { TaskBundle } from './task-bundle';

@Injectable()
export class ResumeTailoringTask implements TaskBundle {
  readonly type = RESUME_TAILORING;
  readonly events = {
    completed: RESUME_TAILORING_COMPLETED,
    failed: RESUME_TAILORING_FAILED,
  };
  private readonly logger = new Logger(ResumeTailoringTask.name);

  constructor(
    @Inject(forwardRef(() => JobApplicationService))
    private readonly jobApplication: JobApplicationService,
    private readonly websocket: WebSocketService,
    private readonly enqueue: EnqueueService,
  ) {}

  async start(payload: ResumeTailoring): Promise<void> {
    await this.enqueue.enqueueResumeTailoring(payload);
    this.logger.debug(`Enqueued resume tailoring for ${payload.jobId}`);
  }

  async onSuccess(
    event: Extract<TaskSuccess, { type: 'resume.tailoring.completed' }>,
  ): Promise<ResumeTailoringCompleted> {
    try {
      await this.jobApplication.updateTailoredResume(
        event.jobId,
        event.resumeStructure,
      );
      this.logger.debug(`Updated tailored resume ${event.jobId}`);
      this.websocket.broadcast(event.jobId, event);
      return event;
    } catch (error) {
      this.logger.error(
        `Failed to update tailored resume ${event.jobId}: ${error}`,
      );
      throw error;
    }
  }

  onFailed(
    event: Extract<TaskFailed, { type: 'resume.tailoring.failed' }>,
  ): ResumeTailoringFailed {
    this.logger.error(`Resume tailoring failed ${event.jobId}: ${event.error}`);
    this.websocket.broadcast(event.jobId, event);
    return event;
  }
}
