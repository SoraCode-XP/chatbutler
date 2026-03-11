import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProviderRegistryService } from './provider-registry.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

@ApiTags('Admin - LLM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/llm')
export class LlmAdminController {
  constructor(
    private registry: ProviderRegistryService,
    private prisma: PrismaService,
  ) {}

  @Get('providers')
  @ApiOperation({ summary: '获取所有模型提供商' })
  async listProviders() {
    return this.prisma.llmProviderConfig.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  @Get('providers/:name/health')
  @ApiOperation({ summary: '测试提供商连接' })
  async testProvider(@Param('name') name: string) {
    const provider = this.registry.get(name);
    if (!provider) {
      return { success: false, error: '提供商未注册' };
    }

    const start = Date.now();
    const healthy = await provider.adapter.healthCheck();
    const latency = Date.now() - start;

    return { success: healthy, latency };
  }

  @Post('providers/:name/reload')
  @ApiOperation({ summary: '重新加载提供商配置' })
  async reloadProvider(@Param('name') name: string) {
    await this.registry.reloadProvider(name);
    return { success: true };
  }

  @Post('providers/reload-all')
  @ApiOperation({ summary: '重新加载所有提供商' })
  async reloadAll() {
    await this.registry.loadProviders();
    return { success: true };
  }

  @Patch('providers/:slug')
  @ApiOperation({ summary: '更新供应商配置（apiKey/baseUrl/isEnabled/models）' })
  async updateProvider(
    @Param('slug') slug: string,
    @Body()
    body: {
      apiKey?: string;
      baseUrl?: string;
      isEnabled?: boolean;
      models?: any[];
    },
  ) {
    const existing = await this.prisma.llmProviderConfig.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Provider not found');

    const updated = await this.prisma.llmProviderConfig.update({
      where: { slug },
      data: {
        ...(body.apiKey !== undefined && { apiKey: body.apiKey }),
        ...(body.baseUrl !== undefined && { baseUrl: body.baseUrl }),
        ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
        ...(body.models !== undefined && { models: body.models }),
      },
    });
    await this.registry.reloadProvider(slug);
    return updated;
  }

  @Post('providers/:slug/models/:modelId/toggle')
  @ApiOperation({ summary: '启用/禁用单个模型' })
  async toggleModel(
    @Param('slug') slug: string,
    @Param('modelId') modelId: string,
  ) {
    const provider = await this.prisma.llmProviderConfig.findUnique({ where: { slug } });
    if (!provider) throw new NotFoundException('Provider not found');

    const models = (provider.models as any[]).map((m: any) =>
      m.modelId === modelId || m.id === modelId
        ? { ...m, isEnabled: !m.isEnabled }
        : m,
    );

    const updated = await this.prisma.llmProviderConfig.update({
      where: { slug },
      data: { models },
    });
    await this.registry.reloadProvider(slug);
    return updated;
  }
}
