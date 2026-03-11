import { Controller, Get, Post, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AgentService } from './agent.service';

@ApiTags('Agent')
@Controller('agents')
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Get()
  @ApiOperation({ summary: '获取智能体列表' })
  async list(@Req() req: any) {
    return this.agentService.getAgentList(req.user?.sub);
  }

  @Get('categories')
  @ApiOperation({ summary: '获取智能体分类' })
  async categories() {
    return this.agentService.getCategories();
  }

  @Get(':slug')
  @ApiOperation({ summary: '获取智能体详情' })
  async detail(@Param('slug') slug: string) {
    return this.agentService.getAgentBySlug(slug);
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: '收藏/取消收藏智能体' })
  async toggleFavorite(@Param('id') id: string, @Req() req: any) {
    return this.agentService.toggleFavorite(req.user?.sub, id);
  }
}
