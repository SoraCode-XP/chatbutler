import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { WS_EVENTS } from '@chatbutler/shared';
import { ChatService } from './chat.service';
import { AgentService } from '../agent/agent.service';
import { LlmRouterService } from '../llm-gateway/llm-router.service';
import { TokenService } from '../token/token.service';
import { RedisService } from '../../common/redis/redis.service';

const ACTIVE_SESSIONS_KEY = 'chatbutler:active_sessions';

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private agentService: AgentService,
    private llmRouter: LlmRouterService,
    private tokenService: TokenService,
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        return;
      }
      const payload = this.jwtService.verify(token);
      (client as any).userId = payload.sub || payload.userId || payload.id;
      this.logger.log(`Client ${client.id} authenticated as user ${(client as any).userId}`);
      await this.redis.incr(ACTIVE_SESSIONS_KEY);
    } catch {
      this.logger.warn(`Client ${client.id} has invalid token`);
    }
  }

  async handleDisconnect(client: Socket) {
    if ((client as any).userId) {
      await this.redis.decr(ACTIVE_SESSIONS_KEY);
    }
  }

  @SubscribeMessage(WS_EVENTS.CHAT_SEND)
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string; agentId: string; message: string },
  ) {
    try {
      const userId = (client as any).userId;
      if (!userId) {
        client.emit(WS_EVENTS.CHAT_ERROR, { code: 'UNAUTHORIZED', message: '请先登录' });
        return;
      }

      const agent = await this.agentService.getAgentById(data.agentId);
      if (!agent) {
        client.emit(WS_EVENTS.CHAT_ERROR, { code: 'AGENT_NOT_FOUND', message: '智能体不存在' });
        return;
      }

      // Create or get conversation
      let conversationId: string = data.conversationId ?? '';
      if (!conversationId) {
        const conv = await this.chatService.createConversation(userId, data.agentId);
        conversationId = conv.id;
      }

      // Save user message
      await this.chatService.saveMessage({
        conversationId,
        role: 'user',
        content: data.message,
      });

      // Get context
      const contextMessages = await this.chatService.getContextMessages(conversationId);

      // Route to LLM
      const { provider, model } = await this.llmRouter.route({
        agentId: data.agentId,
        userId,
        messages: contextMessages,
      });

      // Stream response
      let fullContent = '';
      let totalTokens = 0;
      const messageId = `msg_${Date.now()}`;

      const stream = provider.chatStream({
        model: model.id,
        messages: contextMessages,
        systemPrompt: agent.systemPrompt,
      });

      for await (const chunk of stream) {
        fullContent += chunk.content || '';
        client.emit(WS_EVENTS.CHAT_CHUNK, {
          conversationId,
          messageId,
          chunk: chunk.content || '',
          isComplete: false,
        });
      }

      // Save assistant message
      await this.chatService.saveMessage({
        conversationId,
        role: 'assistant',
        content: fullContent,
        modelUsed: model.id,
      });

      // Record token usage
      await this.tokenService.recordUsage({
        userId,
        agentId: data.agentId,
        modelId: model.id,
        providerId: provider.name,
        inputTokens: 0, // Will be populated by provider callback
        outputTokens: 0,
      });

      client.emit(WS_EVENTS.CHAT_COMPLETE, { conversationId, messageId });
    } catch (error: any) {
      client.emit(WS_EVENTS.CHAT_ERROR, {
        code: 'INTERNAL_ERROR',
        message: error.message || '服务器内部错误',
      });
    }
  }
}
