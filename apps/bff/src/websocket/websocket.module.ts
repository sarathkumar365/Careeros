import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { WebSocketService } from './websocket.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  providers: [WebSocketService],
  exports: [WebSocketService],
})
export class WebsocketModule {}
