import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { ConfirmChannel } from 'amqplib';
import { RABBITMQ_CHANNEL_TOKEN } from '../rabbitmq/rabbitmq.tokens';
import {
  RESUME_PARSING,
  RESUME_TAILORING,
  CHECKLIST_PARSING,
  CHECKLIST_MATCHING,
  ChecklistParsing,
  ChecklistMatching,
  ResumeParsing,
  ResumeTailoring,
  TaskPayload,
} from '../types/task.types';

@Injectable()
export class EnqueueService implements OnModuleInit {
  private readonly logger = new Logger(EnqueueService.name);
  private readonly exchangeName =
    process.env.JOB_SUBMISSION_EXCHANGE ?? 'jobs.submission';
  private readonly routingKey =
    process.env.JOB_SUBMISSION_ROUTING_KEY ?? 'job.submitted';

  constructor(
    @Inject(RABBITMQ_CHANNEL_TOKEN)
    private readonly channel: ConfirmChannel,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.channel.assertExchange(this.exchangeName, 'topic', {
      durable: true,
    });
    this.logger.log(
      `Init exchange (${this.exchangeName} routing=${this.routingKey})`,
    );
  }

  private async publishEvent(
    payload: TaskPayload,
    messageType: string,
  ): Promise<void> {
    const message = {
      ...payload,
      messageType,
    };

    const body = Buffer.from(JSON.stringify(message), 'utf8');

    const ok = this.channel.publish(this.exchangeName, this.routingKey, body, {
      contentType: 'application/json',
      deliveryMode: 2,
      headers: {
        jobId: payload.jobId,
      },
    });

    this.logger.log(`Enqueue ${messageType}`);
    await this.channel.waitForConfirms();
    if (!ok) {
      this.logger.warn(
        `RabbitMQ publish returned FALSE ${payload.jobId}; channel buffered the message`,
      );
    }
  }

  /*
   * Functions below are designed for a better tracing and searching
   * DO NOT refactor or DRY the code below
   */

  async enqueueResumeParsing(payload: ResumeParsing): Promise<void> {
    await this.publishEvent(payload, RESUME_PARSING);
  }

  async enqueueResumeTailoring(payload: ResumeTailoring): Promise<void> {
    await this.publishEvent(payload, RESUME_TAILORING);
  }

  async enqueueChecklistParsing(payload: ChecklistParsing): Promise<void> {
    await this.publishEvent(payload, CHECKLIST_PARSING);
  }

  async enqueueChecklistMatching(payload: ChecklistMatching): Promise<void> {
    await this.publishEvent(payload, CHECKLIST_MATCHING);
  }
}
