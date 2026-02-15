import { Module } from '@nestjs/common';
import { RabbitMqModule } from '../rabbitmq/rabbitmq.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { EnqueueService } from './enqueue.service';
import { DequeueService } from './dequeue.service';

@Module({
  imports: [RabbitMqModule, WorkflowModule],
  providers: [EnqueueService, DequeueService],
  exports: [EnqueueService],
})
export class QueueModule {}
