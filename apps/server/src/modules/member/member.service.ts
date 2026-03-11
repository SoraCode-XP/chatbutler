import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MemberService {
  constructor(private prisma: PrismaService) {}

  async getMembership(userId: string) {
    return this.prisma.membership.findUnique({ where: { userId } });
  }

  async deductResourcePoints(userId: string, points: number) {
    const membership = await this.prisma.membership.findUnique({ where: { userId } });
    if (!membership || membership.resourcePoints < points) {
      throw new Error('资源点不足');
    }

    return this.prisma.membership.update({
      where: { userId },
      data: { resourcePoints: { decrement: points } },
    });
  }

  async addResourcePoints(userId: string, points: number) {
    return this.prisma.membership.update({
      where: { userId },
      data: { resourcePoints: { increment: points } },
    });
  }

  async updateMemberLevel(userId: string, level: string) {
    return this.prisma.membership.update({
      where: { userId },
      data: { level },
    });
  }
}
