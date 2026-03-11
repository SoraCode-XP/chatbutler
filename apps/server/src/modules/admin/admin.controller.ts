import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '管理后台数据看板' })
  async dashboard() {
    const [userCount, conversationCount, tokenUsage] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.conversation.count(),
      this.prisma.tokenUsage.aggregate({
        _sum: { inputTokens: true, outputTokens: true, cost: true },
      }),
    ]);

    return {
      userCount,
      conversationCount,
      totalInputTokens: tokenUsage._sum.inputTokens || 0,
      totalOutputTokens: tokenUsage._sum.outputTokens || 0,
      totalCost: tokenUsage._sum.cost || 0,
    };
  }
}
