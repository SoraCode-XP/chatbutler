# ChatButler 系统架构设计文档

> AI 智能体对话平台 — 覆盖销售、媒体、商务等场景

---

## 一、技术选型

| 层级 | 技术栈 | 说明 |
|------|--------|------|
| **前端** | Next.js 14+ (App Router) | React 18, SSR/SSG, 路由即文件 |
| **UI** | Tailwind CSS + shadcn/ui | 原子化样式 + 高质量组件库 |
| **状态管理** | Zustand | 轻量、TS 友好 |
| **桌面端** | Tauri 2.0 | 共享 Web 前端代码，打包 Win (.msi) / Mac (.dmg) |
| **后端** | NestJS (TypeScript) | 模块化架构，依赖注入，装饰器驱动 |
| **ORM** | Prisma 6 | 类型安全、自动迁移、Studio 可视化 |
| **数据库** | PostgreSQL 16 | 主存储 |
| **缓存** | Redis 7 | 会话缓存、Token 计数、队列 |
| **实时通信** | WebSocket (Socket.IO) | 流式 LLM 响应推送 |
| **认证** | JWT + Refresh Token | bcrypt 密码加密 |
| **Monorepo** | Turborepo + pnpm workspaces | 任务编排、缓存构建 |
| **部署** | Docker + Docker Compose | 开发环境一键启动，预备 K8s |

---

## 二、项目结构

```
chatbutler/
├── apps/
│   ├── server/                 # NestJS 后端
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 数据模型定义
│   │   │   └── seed.ts         # 种子数据
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── common/         # 全局服务
│   │       │   ├── prisma/     # Prisma 数据库服务
│   │       │   ├── redis/      # Redis 缓存服务
│   │       │   └── health/     # 健康检查
│   │       └── modules/        # 业务模块
│   │           ├── auth/       # 认证 (注册/登录/刷新)
│   │           ├── user/       # 用户管理
│   │           ├── agent/      # 智能体管理
│   │           ├── chat/       # 对话 (REST + WebSocket)
│   │           ├── llm-gateway/# LLM 多模型网关
│   │           ├── token/      # Token 用量统计
│   │           ├── member/     # 会员体系
│   │           ├── content/    # 内容模板
│   │           └── admin/      # 管理后台
│   ├── web/                    # Next.js 前端
│   │   └── src/
│   │       ├── app/            # App Router 页面
│   │       ├── components/     # UI 组件
│   │       ├── store/          # Zustand 状态
│   │       └── lib/            # API 客户端、Socket、工具函数
│   └── desktop/                # Tauri 桌面端 (后续)
├── packages/
│   └── shared/                 # 前后端共享类型 & 常量
├── docker-compose.dev.yml
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 三、模块设计

### 3.1 后端模块划分

| 模块 | 职责 | 核心接口 |
|------|------|----------|
| **AuthModule** | 注册、登录、JWT 签发与刷新 | `POST /auth/register`, `POST /auth/login` |
| **UserModule** | 用户信息、个人设置 | `GET /user/profile`, `PUT /user/profile` |
| **AgentModule** | 智能体 CRUD、分类管理、收藏 | `GET /agents`, `GET /agents/categories`, `POST /agents/:id/favorite` |
| **ChatModule** | 会话管理、消息存取、WebSocket 流式对话 | `GET /chat/conversations`, WebSocket `chat:send` |
| **LlmGatewayModule** | 多供应商管理、模型路由、适配器 | `GET /llm/providers`, `POST /llm/reload` |
| **TokenModule** | Token 用量记录与统计 | 内部服务 |
| **MemberModule** | 会员等级、资源点扣减 | `GET /member` |
| **ContentModule** | 内容模板管理 | `GET /content/templates` |
| **AdminModule** | 管理后台数据看板 | `GET /admin/dashboard` |

### 3.2 前端页面结构

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 产品介绍、入口引导 |
| `/auth/login` | 登录 | 邮箱密码登录 |
| `/auth/register` | 注册 | 新用户注册 |
| `/chat` | 对话主页 | 左侧智能体列表 + 右侧聊天区 |

---

## 四、数据模型

```
┌─────────┐      ┌────────────┐      ┌───────────────┐
│  User   │──1:1─│ Membership │      │ AgentCategory │
└────┬────┘      └────────────┘      └───────┬───────┘
     │                                       │
     │ 1:N                                1:N│
     ▼                                       ▼
┌────────────────┐                    ┌──────────┐
│ Conversation   │───N:1─────────────│  Agent   │
└───────┬────────┘                    └────┬─────┘
        │ 1:N                              │
        ▼                                  │ N:N
┌──────────┐                    ┌──────────┴──────────┐
│ Message  │                    │ AgentModelBinding    │
└──────────┘                    └──────────┬──────────┘
                                           │ N:1
┌──────────────┐                ┌──────────┴──────────┐
│ TokenUsage   │                │ LlmProviderConfig   │
└──────────────┘                └─────────────────────┘

┌────────────────────┐          ┌──────────┐
│UserAgentPreference │          │ Template │
└────────────────────┘          └──────────┘
```

### 核心表说明

| 表名 | 说明 |
|------|------|
| `users` | 用户信息、角色 (user/admin) |
| `memberships` | 会员等级 (free/basic/pro/enterprise)、资源点 |
| `agent_categories` | 智能体分类：销售获客、媒体创作、商务沟通、通用助手 |
| `agents` | 智能体定义：名称、系统提示词、所属分类、最低会员等级 |
| `user_agent_preferences` | 用户对智能体的收藏、使用次数 |
| `conversations` | 对话会话，关联用户和智能体 |
| `messages` | 对话消息，记录 role/content/token 用量 |
| `token_usages` | Token 消耗明细：按用户/智能体/模型/供应商 |
| `llm_provider_configs` | LLM 供应商配置：API Key、Base URL、模型列表 (JSON) |
| `agent_model_bindings` | 智能体-模型绑定（按复杂度和优先级路由） |
| `templates` | 内容模板（关联智能体，含变量定义） |

---

## 五、LLM 多模型网关

### 5.1 架构模式

采用 **适配器模式 + 动态注册**：

```
┌──────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  ChatGateway │────▶│   LlmRouterService  │────▶│ ProviderRegistry    │
│  (WebSocket) │     │   (模型路由策略)      │     │ (动态供应商注册)      │
└──────────────┘     └─────────────────────┘     └──────────┬──────────┘
                                                            │
                                              ┌─────────────┼─────────────┐
                                              ▼             ▼             ▼
                                     ┌────────────┐ ┌────────────┐ ┌────────────┐
                                     │  智谱 AI   │ │  DeepSeek  │ │ OpenRouter │
                                     │(GLM系列)   │ │ (V3/R1)    │ │ (Claude)   │
                                     └────────────┘ └────────────┘ └────────────┘
```

### 5.2 OpenAI 兼容适配器

所有供应商均通过 `OpenAICompatibleAdapter` 统一接入，该适配器基于 OpenAI SDK 实现：
- 智谱 AI、DeepSeek、MiniMax、通义千问 → 原生兼容 OpenAI 协议
- Claude → 通过 OpenRouter 代理，OpenRouter 兼容 OpenAI 协议

### 5.3 支持的供应商与模型

| 供应商 | Slug | 模型 | 会员等级 |
|--------|------|------|----------|
| **智谱 AI** | `zhipu` | GLM-4-Flash (免费), GLM-4-Plus, GLM-4, GLM-4-Long | free+ |
| **MiniMax** | `minimax` | MiniMax-Text-01, MiniMax-Text-01-128K | free+ |
| **DeepSeek** | `deepseek` | DeepSeek-V3 (chat), DeepSeek-R1 (reasoner) | free+ |
| **通义千问** | `qwen` | qwen-turbo, qwen-plus, qwen-max, qwen-long | free+ |
| **OpenRouter** | `openrouter` | Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku | enterprise |
| **OpenAI** | `openai` | GPT-4o, GPT-4o-mini, GPT-4-Turbo | pro+ |

### 5.4 初始测试模型

系统默认启用三个低成本/免费模型用于初始测试：
1. **GLM-4-Flash** (智谱) — 完全免费
2. **MiniMax-Text-01** (MiniMax) — 低成本
3. **DeepSeek-V3** (DeepSeek) — 低成本、高性价比

### 5.5 模型路由策略

6 级路由策略链：
1. **智能体绑定** → 查找 `AgentModelBinding` 是否有指定模型
2. **复杂度评估** → 根据消息长度/轮次判断 simple/medium/complex
3. **会员等级过滤** → 过滤掉超出当前会员等级的模型
4. **可用性检查** → 只选 `isEnabled` 的供应商和模型
5. **优先级排序** → 按 priority 字段排序
6. **降级回退** → 全部失败时降级到免费模型

### 5.6 管理后台热配置

- 供应商/模型配置存储在数据库，支持运行时热更新
- 管理员可通过 `/llm/providers` 查看、`/llm/reload` 热加载
- 每个供应商支持健康检查 (`healthCheck`) 并返回延迟

---

## 六、智能体体系

### 6.1 内置智能体

| 智能体 | Slug | 分类 | 定位 |
|--------|------|------|------|
| 销冠智能体 | `sales-champion` | 销售获客 | 客户获取、话术、成交策略 |
| 访谈大师 | `interview-master` | 商务沟通 | 访谈设计、观点提炼 |
| 爆款公众号大师 | `viral-writer` | 媒体创作 | 10万+内容创作 |
| 营销侧写大师 | `marketing-profiler` | 销售获客 | 用户画像、营销策略 |

### 6.2 分类管理

| 分类 | Slug | 说明 |
|------|------|------|
| 销售获客 | `sales` | 销售相关智能体 |
| 媒体创作 | `media` | 内容创作类智能体 |
| 商务沟通 | `business` | 访谈、谈判相关 |
| 通用助手 | `general` | 通用型 AI 助手 |

---

## 七、数据流转

### 7.1 用户对话流程

```
用户输入 → WebSocket(chat:send)
  → ChatGateway: 验证身份
  → ChatService: 获取上下文消息 (Redis 缓存)
  → LlmRouterService: 路由选择模型
  → OpenAICompatibleAdapter: 调用 LLM API (流式)
  → WebSocket(chat:chunk): 实时推送 chunk
  → ChatService: 保存完整消息到 DB
  → TokenService: 记录 Token 用量
  → WebSocket(chat:done): 完成信号
```

### 7.2 认证流程

```
注册/登录 → AuthService: bcrypt 验证
  → JWT 签发 (accessToken 15min + refreshToken 7d)
  → 客户端存储 localStorage
  → 请求携带 Authorization: Bearer <token>
  → 过期 → 客户端用 refreshToken 换新 accessToken
```

### 7.3 管理员配置流程

```
管理员 → LlmAdminController
  → 查看供应商列表 (GET /llm/providers)
  → 健康检查 (GET /llm/providers/:slug/health)
  → 修改配置 → DB 更新
  → 热加载 (POST /llm/providers/:slug/reload)
  → ProviderRegistryService: 重建适配器实例
```

---

## 八、会员体系

| 等级 | 代号 | 资源点 | 可用模型范围 |
|------|------|--------|------------|
| 免费版 | `free` | 100点/天 | GLM-4-Flash, DeepSeek-V3, MiniMax-Text-01 |
| 基础版 | `basic` | 500点/天 | + GLM-4-Plus, DeepSeek-R1, qwen-plus |
| 专业版 | `pro` | 2000点/天 | + GLM-4, qwen-max, GPT-4o |
| 企业版 | `enterprise` | 无限 | + Claude 全系列 |

---

## 九、部署架构

### 开发环境

```
docker-compose.dev.yml
  ├── PostgreSQL 16 (端口 5432)
  └── Redis 7 (端口 6379)

本地运行:
  ├── NestJS Server (端口 3001)
  └── Next.js Dev (端口 3000)
```

### 生产环境 (规划)

```
                    ┌─────────┐
                    │  Nginx  │
                    │ 反向代理 │
                    └────┬────┘
                    ┌────┴────┐
              ┌─────┤         ├─────┐
              ▼     ▼                ▼
         ┌────────┐ ┌────────┐  ┌────────┐
         │Web SSR │ │API x N │  │WS x N  │
         │Next.js │ │NestJS  │  │Socket  │
         └────────┘ └───┬────┘  └───┬────┘
                        │           │
                   ┌────┴───────────┴────┐
                   │   PostgreSQL (主从)   │
                   │   Redis (Sentinel)   │
                   └──────────────────────┘
```

---

## 十、安全设计

| 层面 | 措施 |
|------|------|
| 认证 | JWT + Refresh Token，bcrypt 密码哈希 (salt rounds: 10) |
| 授权 | 基于角色 (user/admin)，API 路由级权限校验 |
| 输入 | class-validator DTO 验证，NestJS ValidationPipe |
| API Key | 数据库加密存储，环境变量注入 |
| CORS | 配置白名单域名 |
| 速率限制 | Redis 计数器实现 API 限流 |
| WebSocket | 连接时验证 JWT Token |

---

## 十一、开发规范

- **语言**: 全栈 TypeScript
- **包管理**: pnpm (严格模式)
- **代码风格**: ESLint + Prettier，保存时自动格式化
- **Git**: 约定式提交 (feat/fix/chore/docs)
- **测试**: Jest (单元测试) + Supertest (E2E)
- **文档**: Swagger 自动生成 API 文档 (`/api/docs`)

---

*文档版本: v1.0 | 最后更新: 2026-03-11*
