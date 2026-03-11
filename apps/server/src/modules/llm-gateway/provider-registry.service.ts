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

  /** 根据 slug 推断对应的环境变量名，当 DB 里 apiKey 为空时作为兜底 */
  private resolveApiKey(slug: string, dbApiKey: string): string {
    if (dbApiKey) return dbApiKey;
    const envMap: Record<string, string> = {
      zhipu: 'ZHIPU_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      minimax: 'MINIMAX_API_KEY',
      openai: 'OPENAI_API_KEY',
      qwen: 'QWEN_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
    };
    const envKey = envMap[slug];
    return envKey ? (process.env[envKey] || '') : '';
  }

  async loadProviders() {
    const configs = await this.prisma.llmProviderConfig.findMany({
      where: { isEnabled: true },
    });

    this.providers.clear();

    for (const config of configs) {
      try {
        // Normalize DB model objects: DB stores `modelId` field, interface uses `id`
        const normalizedModels = ((config.models || []) as any[]).map((m: any) => ({
          id: m.modelId || m.id,
          name: m.name,
          maxTokens: m.maxTokens,
          inputPrice: m.inputPrice,
          outputPrice: m.outputPrice,
          memberTier: m.memberTier,
          isEnabled: m.isEnabled,
        }));

        const providerConfig = {
          id: config.id,
          name: config.name,
          slug: config.slug,
          baseUrl: config.baseUrl,
          apiKey: this.resolveApiKey(config.slug, config.apiKey),
          extraHeaders: (config.extraHeaders || {}) as Record<string, string>,
          models: normalizedModels,
          isEnabled: config.isEnabled,
        };

        const adapter = this.createAdapter(providerConfig);
        this.providers.set(config.slug, { config: providerConfig, adapter });
        this.logger.log(`Loaded provider: ${config.name} (${config.slug}) with ${normalizedModels.length} models`);
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
          models.push({ provider: reg.config.slug, model });
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
