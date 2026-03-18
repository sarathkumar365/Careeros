import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { JobApplicationService } from '../jobs/job-application.service';
import { WebSocketService } from '../websocket/websocket.service';
import { EnqueueService } from '../queue/enqueue.service';
import type {
  TaskSuccess,
  TaskFailed,
  ResumeParsing,
  ResumeParsingCompleted,
  ResumeParsingFailed,
} from '../types/task.types';
import {
  RESUME_PARSING,
  RESUME_PARSING_COMPLETED,
  RESUME_PARSING_FAILED,
} from '../types/task.types';
import { TaskBundle } from './task-bundle';
import { mergeContactsIntoResumeStructure } from '../jobs/utils/contact-extractor';

@Injectable()
export class ResumeParsingTask implements TaskBundle {
  readonly type = RESUME_PARSING;
  readonly events = {
    completed: RESUME_PARSING_COMPLETED,
    failed: RESUME_PARSING_FAILED,
  };
  private readonly logger = new Logger(ResumeParsingTask.name);

  constructor(
    @Inject(forwardRef(() => JobApplicationService))
    private readonly jobApplication: JobApplicationService,
    private readonly websocket: WebSocketService,
    private readonly enqueue: EnqueueService,
  ) {}

  async start(payload: ResumeParsing): Promise<void> {
    await this.enqueue.enqueueResumeParsing(payload);
    this.logger.debug(`Enqueued resume parsing for ${payload.jobId}`);
  }

  async onSuccess(
    event: Extract<TaskSuccess, { type: 'resume.parsing.completed' }>,
  ): Promise<ResumeParsingCompleted> {
    try {
      const extractedContacts = await this.jobApplication.getExtractedContacts(
        event.jobId,
      );
      const mergedResumeStructure = mergeContactsIntoResumeStructure(
        event.resumeStructure,
        extractedContacts,
      );

      await this.jobApplication.updateParsedResume(
        event.jobId,
        mergedResumeStructure,
      );
      await this.jobApplication.updateTailoredResume(
        event.jobId,
        mergedResumeStructure,
      );
      try {
        await this.jobApplication.upsertProfileContactsByJob(
          event.jobId,
          extractedContacts,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to upsert profile contacts for ${event.jobId}: ${error}`,
        );
      }
      this.logger.debug(
        `Saved to both parsedResume and tailoredResume ${event.jobId}`,
      );
      const eventWithMergedContacts: ResumeParsingCompleted = {
        ...event,
        resumeStructure: mergedResumeStructure,
      };
      this.websocket.broadcast(event.jobId, eventWithMergedContacts);
      return eventWithMergedContacts;
    } catch (error) {
      this.logger.error(
        `Failed to persist parsed resume ${event.jobId}: ${error}`,
      );
      throw error;
    }
  }

  onFailed(
    event: Extract<TaskFailed, { type: 'resume.parsing.failed' }>,
  ): ResumeParsingFailed {
    this.logger.error(`Resume parsing failed ${event.jobId}: ${event.error}`);
    this.websocket.broadcast(event.jobId, event);
    return event;
  }
}
