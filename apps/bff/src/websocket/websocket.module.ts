import { Module } from '@nestjs/common';
import { WebSocketService } from './websocket.service';

@Module({
  imports: [],
  providers: [WebSocketService],
  exports: [WebSocketService],
})
export class WebsocketModule {}
