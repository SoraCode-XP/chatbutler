# ChatButler

> AI 智能体对话平台，覆盖销售、媒体、商务等场景的多模型对话应用。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14 (App Router) + Tailwind CSS + Zustand |
| 后端 | NestJS + Prisma + Socket.IO |
| 数据库 | PostgreSQL 16 + Redis 7 |
| 桌面端 | Tauri 2.0（规划中） |
| 工程化 | Turborepo + pnpm workspaces |

## 环境要求

| 工具 | 版本 |
|------|------|
| Node.js | >= 20.x |
| pnpm | >= 9.x |
| Docker | >= 24.x |

## 安装

### 1. 克隆项目

```bash
git clone <repo-url> chatbutler
cd chatbutler
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入至少一个 LLM 供应商的 API Key：

```env
# 智谱 AI（GLM-4-Flash 免费）
ZHIPU_API_KEY="your-zhipu-key"

# DeepSeek
DEEPSEEK_API_KEY="your-deepseek-key"

# MiniMax
MINIMAX_API_KEY="your-minimax-key"
```

### 4. 启动数据库

```bash
pnpm docker:up
```

### 5. 初始化数据库

```bash
pnpm db:migrate -- --name init
pnpm db:seed
```

seed 完成后会创建以下测试账号：

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@chatbutler.com | admin123 |
| 普通用户 | test@chatbutler.com | test123 |

### 6. 构建共享包

```bash
pnpm --filter @chatbutler/shared build
```

## 启动

```bash
# 同时启动前端 + 后端
pnpm dev

# 仅启动后端 (http://localhost:3001)
pnpm dev:server

# 仅启动前端 (http://localhost:3000)
pnpm dev:web
```

启动后访问：

- 前端：http://localhost:3000
- 后端 API：http://localhost:3001
- API 文档（Swagger）：http://localhost:3001/api/docs
- 数据库可视化：`pnpm db:studio` → http://localhost:5555

## 停止

```bash
# 停止前端/后端（终端按 Ctrl+C）

# 停止 Docker 容器（保留数据）
pnpm docker:down

# 停止 Docker 容器并清除所有数据
pnpm docker:reset
```

## 常用命令

```bash
# 开发
pnpm dev                  # 启动所有服务
pnpm dev:server           # 仅后端
pnpm dev:web              # 仅前端
pnpm type-check           # 全量 TS 类型检查

# 数据库
pnpm db:migrate           # 执行迁移
pnpm db:seed              # 填充种子数据
pnpm db:studio            # 打开 Prisma Studio
pnpm db:generate          # 重新生成 Prisma Client

# Docker
pnpm docker:up            # 启动容器
pnpm docker:down          # 停止容器（保留数据）
pnpm docker:reset         # 停止容器并删除所有数据

# 构建
pnpm build                # 构建所有包
pnpm build:server         # 仅构建后端
pnpm build:web            # 仅构建前端

# 清理
pnpm clean                # 清除所有构建产物和 node_modules
```

## 项目结构

```
chatbutler/
├── apps/
│   ├── server/               # NestJS 后端
│   │   ├── prisma/
│   │   │   ├── schema.prisma # 数据模型
│   │   │   └── seed.ts       # 种子数据
│   │   └── src/
│   │       ├── common/       # Prisma / Redis / 健康检查
│   │       └── modules/      # 业务模块
│   │           ├── auth/     # 注册 / 登录 / JWT
│   │           ├── user/     # 用户信息
│   │           ├── agent/    # 智能体管理
│   │           ├── chat/     # 会话 + WebSocket 流式对话
│   │           ├── llm-gateway/ # 多模型路由网关
│   │           ├── token/    # Token 用量统计
│   │           ├── member/   # 会员体系
│   │           └── admin/    # 管理后台
│   ├── web/                  # Next.js 前端
│   │   └── src/
│   │       ├── app/          # App Router 页面
│   │       ├── components/   # UI 组件
│   │       ├── store/        # Zustand 状态
│   │       └── lib/          # API 客户端 / Socket
│   └── desktop/              # Tauri 桌面端（规划中）
├── packages/
│   └── shared/               # 前后端共享类型 & 常量
├── docker-compose.dev.yml
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## LLM 支持

通过 `LlmGatewayModule` 统一接入多个供应商，配置存储于数据库，支持热重载（无需重启服务）：

| 供应商 | slug | 免费模型 |
|--------|------|---------|
| 智谱 AI | `zhipu` | GLM-4-Flash、GLM-4.7-Flash |
| DeepSeek | `deepseek` | deepseek-chat |
| MiniMax | `minimax` | MiniMax-Text-01 |

热重载 provider：

```bash
curl -X POST http://localhost:3001/api/admin/llm/providers/reload-all
```

## 故障排查

**端口被占用**

```powershell
# Windows
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
Stop-Process -Id <PID>
```

**前端白屏 / 编译错误**

```bash
Remove-Item -Recurse -Force apps/web/.next
pnpm dev:web
```

**后端启动报数据库连接失败**

确认 Docker 容器正在运行：

```bash
docker ps
pnpm docker:up
```

**Prisma Client 类型不匹配**

```bash
pnpm db:generate
```
