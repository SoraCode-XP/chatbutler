import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

const ACTIVE_SESSIONS_KEY = 'chatbutler:active_sessions';
const VALID_GRANULARITIES = ['hour', 'day'] as const;
type Granularity = (typeof VALID_GRANULARITIES)[number];

@ApiTags('Admin - Usage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/usage')
export class UsageController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get('active-sessions')
  @ApiOperation({ summary: '获取当前在线会话数' })
  async getActiveSessions() {
    const count = await this.redis.get(ACTIVE_SESSIONS_KEY);
    return { activeSessions: Math.max(0, parseInt(count || '0', 10)) };
  }

  @Get('timeseries')
  @ApiOperation({ summary: '按时间粒度聚合 Token 消耗趋势' })
  async getTimeseries(
    @Query('start') startStr?: string,
    @Query('end') endStr?: string,
    @Query('granularity') granularity: string = 'day',
  ) {
    // Validate granularity against whitelist before using in raw query
    if (!VALID_GRANULARITIES.includes(granularity as Granularity)) {
      throw new BadRequestException('granularity must be "hour" or "day"');
    }

    const end = endStr ? new Date(endStr) : new Date();
    const start = startStr
      ? new Date(startStr)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    type TimeseriesRow = {
      date: Date;
      inputTokens: bigint;
      outputTokens: bigint;
      cost: number;
      requests: bigint;
    };

    // Granularity is validated against whitelist above — safe to use Prisma.raw
    const rows = await this.prisma.$queryRaw<TimeseriesRow[]>(
      Prisma.sql`
        SELECT
          date_trunc(${Prisma.raw(`'${granularity}'`)}, created_at) AS date,
          SUM(input_tokens)  AS "inputTokens",
          SUM(output_tokens) AS "outputTokens",
          COALESCE(SUM(cost), 0) AS cost,
          COUNT(*)           AS requests
        FROM token_usages
        WHERE created_at >= ${start} AND created_at <= ${end}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    );

    return rows.map((r) => ({
      date: r.date,
      inputTokens: Number(r.inputTokens),
      outputTokens: Number(r.outputTokens),
      cost: Number(r.cost),
      requests: Number(r.requests),
    }));
  }

  @Get('by-model')
  @ApiOperation({ summary: '按模型分组的消耗排行' })
  async getByModel(
    @Query('start') startStr?: string,
    @Query('end') endStr?: string,
  ) {
    const end = endStr ? new Date(endStr) : new Date();
    const start = startStr
      ? new Date(startStr)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.tokenUsage.groupBy({
      by: ['modelId', 'providerId'],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { inputTokens: true, outputTokens: true, cost: true },
      _count: { _all: true },
      orderBy: { _sum: { cost: 'desc' } },
    });

    return rows.map((r) => ({
      modelId: r.modelId,
      providerId: r.providerId,
      inputTokens: r._sum.inputTokens || 0,
      outputTokens: r._sum.outputTokens || 0,
      cost: r._sum.cost || 0,
      requests: r._count._all,
    }));
  }

  @Get('by-user')
  @ApiOperation({ summary: '按用户分组的消耗 Top N' })
  async getByUser(
    @Query('start') startStr?: string,
    @Query('end') endStr?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    const end = endStr ? new Date(endStr) : new Date();
    const start = startStr
      ? new Date(startStr)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const grouped = await this.prisma.tokenUsage.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { inputTokens: true, outputTokens: true, cost: true },
      _count: { _all: true },
      orderBy: { _sum: { cost: 'desc' } },
      take: Math.min(limit, 100),
    });

    const userIds = grouped.map((g) => g.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, nickname: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    const totalCost = grouped.reduce((s, g) => s + (g._sum.cost || 0), 0);

    return grouped.map((g) => ({
      userId: g.userId,
      email: userMap.get(g.userId)?.email || '',
      nickname: userMap.get(g.userId)?.nickname || null,
      inputTokens: g._sum.inputTokens || 0,
      outputTokens: g._sum.outputTokens || 0,
      cost: g._sum.cost || 0,
      requests: g._count._all,
      costShare: totalCost > 0 ? ((g._sum.cost || 0) / totalCost) * 100 : 0,
    }));
  }

  @Get('summary')
  @ApiOperation({ summary: '时间段内汇总统计' })
  async getSummary(
    @Query('start') startStr?: string,
    @Query('end') endStr?: string,
  ) {
    const end = endStr ? new Date(endStr) : new Date();
    const start = startStr
      ? new Date(startStr)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const agg = await this.prisma.tokenUsage.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _sum: { inputTokens: true, outputTokens: true, cost: true },
      _count: { _all: true },
    });

    return {
      inputTokens: agg._sum.inputTokens || 0,
      outputTokens: agg._sum.outputTokens || 0,
      totalTokens: (agg._sum.inputTokens || 0) + (agg._sum.outputTokens || 0),
      cost: agg._sum.cost || 0,
      requests: agg._count._all,
    };
  }
}
