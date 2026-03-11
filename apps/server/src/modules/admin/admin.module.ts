import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { LlmGatewayModule } from '../llm-gateway/llm-gateway.module';

@Module({
  imports: [LlmGatewayModule],
  controllers: [AdminController],
})
export class AdminModule {}
