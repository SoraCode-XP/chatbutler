import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProviderRegistryService } from './provider-registry.service';
import { LLMProvider, ProviderModelConfig } from './llm-provider.interface';

interface RouteContext {
  agentId: string;
  userId: string;
  messages: Array<{ role: string; content: string }>;
}

interface RouteResult {
  provider: LLMProvider;
  model: ProviderModelConfig;
}

@Injectable()
export class LlmRouterService {
  private readonly logger = new Logger(LlmRouterService.name);

  constructor(
    private registry: ProviderRegistryService,
    private prisma: PrismaService,
  ) {}

  async route(context: RouteContext): Promise<RouteResult> {
    // 1. Get all available models
    const candidates = this.registry.getAllAvailableModels();

    if (candidates.length === 0) {
      throw new Error('没有可用的模型');
    }

    // 2. Check agent-model bindings
    const bindings = await this.prisma.agentModelBinding.findMany({
      where: { agentId: context.agentId },
      orderBy: { weight: 'desc' },
    });

    // 3. Get user membership tier
    const membership = await this.prisma.membership.findUnique({
      where: { userId: context.userId },
    });
    const userTier = membership?.level || 'free';

    // 4. Evaluate complexity
    const complexity = this.evaluateComplexity(context.messages);

    // 5. Filter and select
    let selected: { provider: string; model: ProviderModelConfig } | null = null;

    // Try agent-bound models first
    for (const binding of bindings) {
      if (binding.complexityTier && binding.complexityTier !== complexity) continue;

      const candidate = candidates.find(
        (c) => c.provider === binding.providerId && c.model.id === binding.modelId,
      );

      if (candidate && candidate.model.tier.includes(userTier)) {
        selected = candidate;
        break;
      }
    }

    // Fallback: pick first available model matching user tier
    if (!selected) {
      selected = candidates.find((c) => c.model.tier.includes(userTier)) || candidates[0];
    }

    const providerReg = this.registry.get(selected.provider);
    if (!providerReg) {
      throw new Error(`提供商 ${selected.provider} 不可用`);
    }

    this.logger.log(
      `Routed to ${selected.provider}/${selected.model.id} (complexity: ${complexity}, tier: ${userTier})`,
    );

    return {
      provider: providerReg.adapter,
      model: selected.model,
    };
  }

  private evaluateComplexity(messages: Array<{ role: string; content: string }>): string {
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    const turns = messages.length;

    if (totalLength < 200 && turns <= 2) return 'simple';
    if (totalLength < 2000 && turns <= 10) return 'medium';
    return 'complex';
  }
}
