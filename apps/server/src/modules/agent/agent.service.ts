import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AgentService {
  constructor(private prisma: PrismaService) {}

  async getAgentList(userId?: string) {
    const agents = await this.prisma.agent.findMany({
      where: { isEnabled: true },
      include: { category: true },
      orderBy: [{ type: 'asc' }, { priority: 'desc' }],
    });

    if (userId) {
      const prefs = await this.prisma.userAgentPreference.findMany({
        where: { userId },
      });
      const prefMap = new Map(prefs.map((p) => [p.agentId, p]));
      return agents.map((a) => ({
        ...a,
        isFavorite: prefMap.get(a.id)?.isFavorite ?? false,
        sortOrder: prefMap.get(a.id)?.sortOrder ?? 0,
      }));
    }

    return agents;
  }

  async getAgentBySlug(slug: string) {
    return this.prisma.agent.findUnique({
      where: { slug },
      include: { category: true },
    });
  }

  async getAgentById(id: string) {
    return this.prisma.agent.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  async toggleFavorite(userId: string, agentId: string) {
    const existing = await this.prisma.userAgentPreference.findUnique({
      where: { userId_agentId: { userId, agentId } },
    });

    if (existing) {
      return this.prisma.userAgentPreference.update({
        where: { id: existing.id },
        data: { isFavorite: !existing.isFavorite },
      });
    }

    return this.prisma.userAgentPreference.create({
      data: { userId, agentId, isFavorite: true },
    });
  }

  async getCategories() {
    return this.prisma.agentCategory.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
