import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProviderRegistryService } from './provider-registry.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Admin - LLM')
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
}
