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
        const adapter = this.createAdapter({
          id: config.id,
          name: config.name,
          slug: config.slug,
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          extraHeaders: (config.extraHeaders || {}) as Record<string, string>,
          models: (config.models || []) as any,
          isEnabled: config.isEnabled,
        });
        this.providers.set(config.slug, {
          config: {
            id: config.id,
            name: config.name,
            slug: config.slug,
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
            extraHeaders: (config.extraHeaders || {}) as Record<string, string>,
            models: (config.models || []) as any,
            isEnabled: config.isEnabled,
          },
          adapter,
        });
        this.logger.log(`Loaded provider: ${config.name} (${config.slug})`);
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

  async reloadProvider(slug: string) {
    const config = await this.prisma.llmProviderConfig.findUnique({
      where: { slug },
    });

    if (!config || !config.isEnabled) {
      this.providers.delete(slug);
      return;
    }

    const mapped = {
      id: config.id,
      name: config.name,
      slug: config.slug,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      extraHeaders: (config.extraHeaders || {}) as Record<string, string>,
      models: (config.models || []) as any,
      isEnabled: config.isEnabled,
    };

    const adapter = this.createAdapter(mapped);
    this.providers.set(slug, { config: mapped, adapter });
    this.logger.log(`Reloaded provider: ${config.name} (${config.slug})`);
  }
}
