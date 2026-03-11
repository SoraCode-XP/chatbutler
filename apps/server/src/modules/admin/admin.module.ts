import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsageController } from './usage.controller';
import { LlmGatewayModule } from '../llm-gateway/llm-gateway.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [LlmGatewayModule, AuthModule],
  controllers: [AdminController, UsageController],
})
export class AdminModule {}
