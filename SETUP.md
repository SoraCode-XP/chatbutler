# ChatButler 快速启动指南

## 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 20.x | 推荐使用 fnm 或 nvm 管理 |
| pnpm | >= 9.x | `npm i -g pnpm` |
| Docker | >= 24.x | 用于运行 PostgreSQL 和 Redis |
| Git | >= 2.x | 版本控制 |

## 一键启动

```bash
# 1. 克隆项目
git clone <repo-url> chatbutler
cd chatbutler

# 2. 安装依赖
pnpm install

# 3. 复制环境变量
cp .env.example .env

# 4. 启动数据库 (PostgreSQL + Redis)
docker compose -f docker-compose.dev.yml up -d

# 5. 初始化数据库
pnpm db:push
pnpm db:seed

# 6. 启动开发
pnpm dev
```

前端: http://localhost:3000  
后端: http://localhost:3001  
API 文档: http://localhost:3001/api/docs

## 环境变量说明

编辑 `.env` 文件，至少配置一个 LLM 供应商的 API Key：

```bash
# 推荐先配置这三个免费/低成本的
ZHIPU_API_KEY="your-zhipu-key"     # 智谱 AI (GLM-4-Flash 免费)
DEEPSEEK_API_KEY="your-key"         # DeepSeek
MINIMAX_API_KEY="your-key"          # MiniMax
```

## 常用命令

```bash
pnpm dev              # 启动所有服务 (前端 + 后端)
pnpm dev:server       # 仅启动后端
pnpm dev:web          # 仅启动前端
pnpm build            # 构建所有
pnpm db:push          # 推送 schema 到数据库
pnpm db:studio        # 打开 Prisma Studio
pnpm db:seed          # 填充种子数据
pnpm docker:up        # 启动 Docker 容器
pnpm docker:down      # 停止 Docker 容器
```

## 项目结构

```
chatbutler/
├── apps/
│   ├── server/       # NestJS 后端 API
│   ├── web/          # Next.js 前端
│   └── desktop/      # Tauri 桌面端 (后续)
├── packages/
│   └── shared/       # 共享类型和常量
├── docker-compose.dev.yml
├── turbo.json
└── package.json
```

## 故障排除

**数据库连接失败**: 确保 Docker 容器已启动 `docker compose -f docker-compose.dev.yml ps`

**端口占用**: 修改 `.env` 中的 `PORT` 或 Next.js 的 `--port` 参数

**依赖安装失败**: 尝试 `pnpm store prune` 后重新 `pnpm install`
