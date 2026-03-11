import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async createConversation(userId: string, agentId: string, title?: string) {
    return this.prisma.conversation.create({
      data: {
        userId,
        agentId,
        title: title || '新对话',
      },
    });
  }

  async getConversations(userId: string, agentId?: string) {
    return this.prisma.conversation.findMany({
      where: { userId, ...(agentId ? { agentId } : {}) },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });
  }

  async getMessages(conversationId: string, limit = 50) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async saveMessage(data: {
    conversationId: string;
    role: string;
    content: string;
    tokenCount?: number;
    modelUsed?: string;
  }) {
    const message = await this.prisma.message.create({ data });

    await this.prisma.conversation.update({
      where: { id: data.conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  async getContextMessages(conversationId: string, limit = 20) {
    const cached = await this.redis.get(`ctx:${conversationId}`);
    if (cached) return JSON.parse(cached);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { role: true, content: true },
    });

    const context = messages.reverse();
    await this.redis.set(`ctx:${conversationId}`, JSON.stringify(context), 600);
    return context;
  }
}
