import { Injectable, Logger } from '@nestjs/common';
import { ScoringService } from '../scoring/scoring.service';
import { WebSocketService } from '../websocket/websocket.service';
import type {
  ScoreUpdating,
  ScoreUpdatingCompleted,
  ScoreUpdatingFailed,
} from '../types/task.types';
import {
  SCORE_UPDATING,
  SCORE_UPDATING_COMPLETED,
  SCORE_UPDATING_FAILED,
} from '../types/task.types';
import { TaskBundle } from './task-bundle';

@Injectable()
export class ScoreUpdatingTask implements TaskBundle {
  readonly type = SCORE_UPDATING;
  readonly events = {
    completed: SCORE_UPDATING_COMPLETED,
    failed: SCORE_UPDATING_FAILED,
  };
  private readonly logger = new Logger(ScoreUpdatingTask.name);

  constructor(
    private readonly scoring: ScoringService,
    private readonly websocket: WebSocketService,
  ) {}

  async start(payload: ScoreUpdating): Promise<ScoreUpdatingCompleted> {
    const score = await this.scoring.calculateAndUpdateScore(payload.jobId);
    this.logger.debug(`Calculated score for ${payload.jobId}: ${score}%`);

    return {
      type: SCORE_UPDATING_COMPLETED,
      jobId: payload.jobId,
      matchPercentage: score,
      timestamp: new Date().toISOString(),
    };
  }

  onSuccess(event: ScoreUpdatingCompleted): Promise<ScoreUpdatingCompleted> {
    this.logger.debug(
      `Publishing score update ${event.jobId}: ${event.matchPercentage}%`,
    );
    this.websocket.broadcast(event.jobId, event);
    return Promise.resolve(event);
  }

  onFailed(event: ScoreUpdatingFailed): ScoreUpdatingFailed {
    this.logger.error(`Score updating failed ${event.jobId}: ${event.error}`);
    this.websocket.broadcast(event.jobId, event);
    return event;
  }
}
