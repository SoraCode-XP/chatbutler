import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AgentModule } from './modules/agent/agent.module';
import { ChatModule } from './modules/chat/chat.module';
import { LlmGatewayModule } from './modules/llm-gateway/llm-gateway.module';
import { TokenModule } from './modules/token/token.module';
import { MemberModule } from './modules/member/member.module';
import { ContentModule } from './modules/content/content.module';
import { AdminModule } from './modules/admin/admin.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { HealthModule } from './common/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UserModule,
    AgentModule,
    ChatModule,
    LlmGatewayModule,
    TokenModule,
    MemberModule,
    ContentModule,
    AdminModule,
  ],
})
export class AppModule {}
