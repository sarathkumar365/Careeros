import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { JobsModule } from './jobs/jobs.module';
import { ScoringModule } from './scoring/scoring.module';
import { RabbitMqModule } from './rabbitmq/rabbitmq.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkflowModule } from './workflow/workflow.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    DatabaseModule,
    RabbitMqModule,
    ScoringModule,
    TasksModule,
    WorkflowModule,
    WebsocketModule,
    JobsModule,
  ],
})
export class AppModule {}
