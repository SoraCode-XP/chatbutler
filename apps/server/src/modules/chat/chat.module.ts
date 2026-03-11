import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { LlmGatewayModule } from '../llm-gateway/llm-gateway.module';
import { TokenModule } from '../token/token.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [LlmGatewayModule, TokenModule, AgentModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
