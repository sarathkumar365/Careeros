import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { RABBITMQ_CHANNEL_TOKEN } from '../rabbitmq/rabbitmq.tokens';
import type { TaskAI } from '../types/task.types';
import { WorkflowService } from '../workflow/workflow.service';

const DEFAULT_EXCHANGE = 'jobs.events';
const DEFAULT_QUEUE = 'jobs.events.bff';
const DEFAULT_BINDING_KEY = 'job.#';

@Injectable()
export class DequeueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DequeueService.name);
  private readonly exchangeName = DEFAULT_EXCHANGE;
  private readonly queueName = DEFAULT_QUEUE;
  private readonly bindingKey = DEFAULT_BINDING_KEY;
  private consumerTag: string | null = null;

  constructor(
    @Inject(RABBITMQ_CHANNEL_TOKEN)
    private readonly channel: ConfirmChannel,
    private readonly workflowService: WorkflowService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.setUpQueue();

    const { consumerTag } = await this.channel.consume(
      this.queueName,
      (message) => {
        void this.dequeue(message);
      },
      {
        noAck: false,
      },
    );

    this.consumerTag = consumerTag;
    this.logger.log(
      `Subscribed to ${this.exchangeName} (${this.queueName}, binding=${this.bindingKey})`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.cancelConsumer();
  }

  private async setUpQueue() {
    await this.channel.assertExchange(this.exchangeName, 'topic', {
      durable: true,
    });

    await this.channel.assertQueue(this.queueName, {
      durable: true,
    });

    await this.channel.bindQueue(
      this.queueName,
      this.exchangeName,
      this.bindingKey,
    );
  }

  private async dequeue(message: ConsumeMessage | null): Promise<void> {
    if (!message) {
      return;
    }

    try {
      const raw = JSON.parse(message.content.toString('utf8')) as
        | TaskAI
        | TaskAI[];

      const taskResults = Array.isArray(raw) ? raw : [raw];

      for (const taskResult of taskResults) {
        // WORKFLOW INTEGRATION:
        // ---------------------
        // Task results arrive here from RabbitMQ after AI service processing.
        // Every task result SHOULD correspond to an active workflow.
        //
        // Flow:
        // 1. WorkflowService.createApplication/tailorResume() → calls task.start() → enqueues to RabbitMQ
        // 2. AI service processes task → publishes result to RabbitMQ
        // 3. DequeueService receives result → calls workflowService.handleTaskCompletion()
        // 4. WorkflowService:
        //    - Validates workflow state exists (or logs error)
        //    - Determines which task from event.type
        //    - Calls task.onSuccess() or task.onFailed()
        //    - Updates workflow state
        //    - Triggers next tasks (if any)
        //
        // ERROR HANDLING:
        // ---------------
        // Unknown events (should never happen):
        // - Log error, acknowledge message, drop/ignore
        // - Indicates bug: task started but type not recognized
        //
        // Parse errors:
        // - Log warning, acknowledge message, drop/ignore
        // - Malformed message, can't process
        //
        // Missing workflow state:
        // - WorkflowService.handleTaskCompletion() will handle this
        // - Log error, acknowledge message, drop/ignore
        // - Indicates bug: task started without workflow
        //
        // All errors ACKNOWLEDGE (remove from queue) to prevent infinite retries.
        // Logging alerts developers to investigate root cause.

        this.logger.debug(
          `Dequeued task result: ${taskResult.type} for ${taskResult.jobId}`,
        );

        // Delegate to WorkflowService for orchestration
        await this.workflowService.handleTaskCompletion(taskResult);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to parse task result message: ${(error as Error).message}`,
      );
    } finally {
      this.channel.ack(message);
    }
  }

  private async cancelConsumer(): Promise<void> {
    if (!this.consumerTag) {
      return;
    }

    try {
      await this.channel.cancel(this.consumerTag);
      this.logger.log('RabbitMQ job events consumer cancelled');
    } catch (error) {
      this.logger.warn(
        `Failed to cancel job events consumer: ${(error as Error).message}`,
      );
    } finally {
      this.consumerTag = null;
    }
  }
}
