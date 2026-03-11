import { Controller, Get, Post, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: '获取对话列表' })
  async getConversations(
    @Req() req: any,
    @Query('agentId') agentId?: string,
  ) {
    return this.chatService.getConversations(req.user?.sub, agentId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: '获取对话消息' })
  async getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(id);
  }
}
