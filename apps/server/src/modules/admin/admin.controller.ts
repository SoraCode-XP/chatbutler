import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '管理后台数据看板' })
  async dashboard() {
    const [userCount, agentCount, conversationCount, tokenUsage] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.agent.count(),
        this.prisma.conversation.count(),
        this.prisma.tokenUsage.aggregate({
          _sum: { inputTokens: true, outputTokens: true, cost: true },
        }),
      ]);

    return {
      userCount,
      agentCount,
      conversationCount,
      totalInputTokens: tokenUsage._sum.inputTokens || 0,
      totalOutputTokens: tokenUsage._sum.outputTokens || 0,
      totalCost: tokenUsage._sum.cost || 0,
    };
  }

  @Get('users')
  @ApiOperation({ summary: '获取用户列表' })
  async listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { nickname: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          nickname: true,
          avatar: true,
          role: true,
          createdAt: true,
          membership: { select: { level: true, resourcePoints: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { total, page, limit, users };
  }

  @Patch('users/:id/role')
  @HttpCode(200)
  @ApiOperation({ summary: '修改用户角色' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: 'user' | 'admin' },
  ) {
    return this.prisma.user.update({
      where: { id },
      data: { role: body.role },
      select: { id: true, email: true, role: true },
    });
  }

  @Patch('users/:id/membership')
  @HttpCode(200)
  @ApiOperation({ summary: '修改用户会员等级' })
  async updateUserMembership(
    @Param('id') id: string,
    @Body() body: { level: string; resourcePoints?: number },
  ) {
    return this.prisma.membership.upsert({
      where: { userId: id },
      update: {
        level: body.level,
        ...(body.resourcePoints !== undefined && {
          resourcePoints: body.resourcePoints,
        }),
      },
      create: {
        userId: id,
        level: body.level,
        resourcePoints: body.resourcePoints ?? 100,
      },
    });
  }
}
