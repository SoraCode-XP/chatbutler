import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  RegisteredProvider,
  ProviderConfig,
  LLMProvider,
} from './llm-provider.interface';
import { OpenAICompatibleAdapter } from './adapters/openai-compatible.adapter';

@Injectable()
export class ProviderRegistryService implements OnModuleInit {
  private providers = new Map<string, RegisteredProvider>();
  private readonly logger = new Logger(ProviderRegistryService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async onModuleInit() {
    await this.loadProviders();
  }

  async loadProviders() {
    const configs = await this.prisma.llmProviderConfig.findMany({
      where: { isEnabled: true },
    });

    this.providers.clear();

    for (const config of configs) {
      try {
        const adapter = this.createAdapter(config as any);
        this.providers.set(config.name, {
          config: config as any,
          adapter,
        });
        this.logger.log(`Loaded provider: ${config.displayName}`);
      } catch (error) {
        this.logger.error(`Failed to load provider ${config.name}:`, error);
      }
    }

    this.logger.log(`Total providers loaded: ${this.providers.size}`);
  }

  private createAdapter(config: ProviderConfig): LLMProvider {
    // OpenAI compatible covers most providers
    return new OpenAICompatibleAdapter(config);
  }

  get(name: string): RegisteredProvider | undefined {
    return this.providers.get(name);
  }

  getAll(): RegisteredProvider[] {
    return Array.from(this.providers.values());
  }

  getAllAvailableModels() {
    const models: Array<{ provider: string; model: any }> = [];
    for (const [, reg] of this.providers) {
      for (const model of reg.config.models) {
        if (model.isEnabled) {
          models.push({ provider: reg.config.name, model });
        }
      }
    }
    return models;
  }

  async reloadProvider(name: string) {
    const config = await this.prisma.llmProviderConfig.findUnique({
      where: { name },
    });

    if (!config || !config.isEnabled) {
      this.providers.delete(name);
      return;
    }

    const adapter = this.createAdapter(config as any);
    this.providers.set(name, { config: config as any, adapter });
    this.logger.log(`Reloaded provider: ${config.displayName}`);
  }
}
