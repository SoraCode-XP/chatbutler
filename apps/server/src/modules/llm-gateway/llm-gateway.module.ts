import { Module } from '@nestjs/common';
import { LlmRouterService } from './llm-router.service';
import { ProviderRegistryService } from './provider-registry.service';
import { OpenAICompatibleAdapter } from './adapters/openai-compatible.adapter';
import { LlmAdminController } from './llm-admin.controller';

@Module({
  controllers: [LlmAdminController],
  providers: [LlmRouterService, ProviderRegistryService, OpenAICompatibleAdapter],
  exports: [LlmRouterService, ProviderRegistryService],
})
export class LlmGatewayModule {}
