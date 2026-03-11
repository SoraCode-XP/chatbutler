import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async getTemplates(agentId?: string) {
    return this.prisma.template.findMany({
      where: {
        isEnabled: true,
        ...(agentId ? { agentId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplateById(id: string) {
    return this.prisma.template.findUnique({ where: { id } });
  }
}
