import { Module } from '@nestjs/common';
import { LlmRouterService } from './llm-router.service';
import { ProviderRegistryService } from './provider-registry.service';
import { LlmAdminController } from './llm-admin.controller';

@Module({
  controllers: [LlmAdminController],
  providers: [LlmRouterService, ProviderRegistryService],
  exports: [LlmRouterService, ProviderRegistryService],
})
export class LlmGatewayModule {}
