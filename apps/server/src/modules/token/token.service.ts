import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class TokenService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async recordUsage(data: {
    userId: string;
    agentId: string;
    modelId: string;
    providerId: string;
    inputTokens: number;
    outputTokens: number;
    cost?: number;
  }) {
    return this.prisma.tokenUsage.create({
      data: {
        userId: data.userId,
        agentId: data.agentId,
        modelId: data.modelId,
        providerId: data.providerId,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        cost: data.cost || 0,
      },
    });
  }

  async getUserUsageToday(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await this.prisma.tokenUsage.aggregate({
      where: {
        userId,
        createdAt: { gte: today },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        cost: true,
      },
    });

    return {
      inputTokens: usage._sum.inputTokens || 0,
      outputTokens: usage._sum.outputTokens || 0,
      totalCost: usage._sum.cost || 0,
    };
  }

  async getUsageStats(filter: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    agentId?: string;
  }) {
    return this.prisma.tokenUsage.groupBy({
      by: ['modelId', 'providerId'],
      where: {
        ...(filter.userId ? { userId: filter.userId } : {}),
        ...(filter.agentId ? { agentId: filter.agentId } : {}),
        createdAt: {
          ...(filter.startDate ? { gte: filter.startDate } : {}),
          ...(filter.endDate ? { lte: filter.endDate } : {}),
        },
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        cost: true,
      },
      _count: true,
    });
  }
}
