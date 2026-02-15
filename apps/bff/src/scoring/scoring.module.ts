import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ScoringService } from './scoring.service';

@Module({
  imports: [DatabaseModule],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
