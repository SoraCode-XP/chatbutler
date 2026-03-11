import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ContentService } from './content.service';

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private contentService: ContentService) {}

  @Get('templates')
  @ApiOperation({ summary: '获取内容模板列表' })
  async getTemplates(@Query('agentId') agentId?: string) {
    return this.contentService.getTemplates(agentId);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: '获取模板详情' })
  async getTemplate(@Param('id') id: string) {
    return this.contentService.getTemplateById(id);
  }
}
