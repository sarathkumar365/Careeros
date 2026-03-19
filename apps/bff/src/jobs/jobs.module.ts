/*
 *  Job
 *
 *  A job application created by the user, containing their resume and job
 *  description. Each job has a unique jobId that never changes. Users can run
 *  multiple workflows on the same job, or execute the same workflow multiple
 *  times.
 *
 */

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QueueModule } from '../queue/queue.module';
import { ScoringModule } from '../scoring/scoring.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { JobsController } from './jobs.controller';
import { JobApplicationService } from './job-application.service';

@Module({
  imports: [
    AuthModule,
    QueueModule,
    ScoringModule,
    WebsocketModule,
    WorkflowModule,
  ],
  controllers: [JobsController],
  providers: [JobApplicationService],
  exports: [JobApplicationService],
})
export class JobsModule {}
