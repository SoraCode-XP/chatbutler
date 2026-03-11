import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始填充种子数据...');

  // 1. 创建管理员用户
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@chatbutler.com' },
    update: {},
    create: {
      email: 'admin@chatbutler.com',
      password: adminPassword,
      nickname: '管理员',
      role: 'admin',
      membership: {
        create: { level: 'enterprise', resourcePoints: 999999 },
      },
    },
  });
  console.log(`✅ 管理员: ${admin.email}`);

  // 2. 创建测试用户
  const userPassword = await bcrypt.hash('test123', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@chatbutler.com' },
    update: {},
    create: {
      email: 'test@chatbutler.com',
      password: userPassword,
      nickname: '测试用户',
      role: 'user',
      membership: {
        create: { level: 'free', resourcePoints: 100 },
      },
    },
  });
  console.log(`✅ 测试用户: ${testUser.email}`);

  // 3. 创建智能体分类
  const categories = await Promise.all([
    prisma.agentCategory.upsert({
      where: { slug: 'sales' },
      update: {},
      create: { name: '销售获客', slug: 'sales', icon: '💰', sortOrder: 1 },
    }),
    prisma.agentCategory.upsert({
      where: { slug: 'media' },
      update: {},
      create: { name: '媒体创作', slug: 'media', icon: '📝', sortOrder: 2 },
    }),
    prisma.agentCategory.upsert({
      where: { slug: 'business' },
      update: {},
      create: { name: '商务沟通', slug: 'business', icon: '🤝', sortOrder: 3 },
    }),
    prisma.agentCategory.upsert({
      where: { slug: 'general' },
      update: {},
      create: { name: '通用助手', slug: 'general', icon: '🤖', sortOrder: 4 },
    }),
  ]);
  console.log(`✅ 创建 ${categories.length} 个智能体分类`);

  // 4. 创建智能体
  const agents = await Promise.all([
    prisma.agent.upsert({
      where: { slug: 'sales-champion' },
      update: {},
      create: {
        name: '销冠智能体',
        slug: 'sales-champion',
        description: '专业销售顾问，帮你精准获客、高效成交',
        systemPrompt: `你是一位顶级销售顾问「销冠智能体」。你精通各种销售技巧和话术，擅长：
1. 客户画像分析和潜在需求挖掘
2. 产品价值塑造和卖点提炼
3. 异议处理和谈判技巧
4. 成交话术和跟进策略

请根据用户的行业和产品，提供专业、实用的销售建议。语气专业但亲切，善于用案例说明。`,
        categoryId: categories[0].id,
        sortOrder: 1,
      },
    }),
    prisma.agent.upsert({
      where: { slug: 'interview-master' },
      update: {},
      create: {
        name: '访谈大师',
        slug: 'interview-master',
        description: '深度访谈专家，帮你设计问题、提炼观点',
        systemPrompt: `你是一位资深访谈专家「访谈大师」。你擅长：
1. 设计层层递进的访谈问题
2. 从对话中提炼核心观点
3. 构建完整的访谈提纲
4. 捕捉受访者的深层逻辑

帮助用户围绕特定话题或人物设计访谈内容。注重逻辑性和深度。`,
        categoryId: categories[2].id,
        sortOrder: 2,
      },
    }),
    prisma.agent.upsert({
      where: { slug: 'viral-writer' },
      update: {},
      create: {
        name: '爆款公众号大师',
        slug: 'viral-writer',
        description: '10万+内容创作专家，打造爆款文章',
        systemPrompt: `你是一位自媒体内容专家「爆款公众号大师」。你精通：
1. 爆款标题撰写（好奇心驱动 / 价值承诺 / 情绪共鸣）
2. 文章结构设计（开头钩子 / 中段价值 / 结尾行动号召）
3. 读者心理把握和互动设计
4. 多种内容类型：干货长文、故事营销、热点评论

帮助用户创作高质量的公众号内容。注重可读性和传播性。`,
        categoryId: categories[1].id,
        sortOrder: 3,
      },
    }),
    prisma.agent.upsert({
      where: { slug: 'marketing-profiler' },
      update: {},
      create: {
        name: '营销侧写大师',
        slug: 'marketing-profiler',
        description: '用户画像分析专家，精准定位目标客户',
        systemPrompt: `你是一位营销分析专家「营销侧写大师」。你擅长：
1. 构建精准的用户画像（人口统计 / 心理特征 / 行为模式）
2. 市场细分和目标人群定位
3. 竞品分析和差异化策略
4. 营销渠道选择和预算分配建议

帮助用户深入了解目标客户，制定有针对性的营销策略。数据驱动，逻辑清晰。`,
        categoryId: categories[0].id,
        sortOrder: 4,
      },
    }),
  ]);
  console.log(`✅ 创建 ${agents.length} 个智能体`);

  // 5. 创建 LLM 供应商配置 (初始测试模型)
  const zhipuModels = [
    { modelId: 'glm-4-flash', name: 'GLM-4-Flash', maxTokens: 8192, inputPrice: 0, outputPrice: 0, isEnabled: true, memberTier: 'free' },
    { modelId: 'glm-4.7-flash', name: 'GLM-4.7-Flash', maxTokens: 8192, inputPrice: 0, outputPrice: 0, isEnabled: true, memberTier: 'free' },
    { modelId: 'glm-4-plus', name: 'GLM-4-Plus', maxTokens: 8192, inputPrice: 0.05, outputPrice: 0.05, isEnabled: true, memberTier: 'basic' },
    { modelId: 'glm-4', name: 'GLM-4', maxTokens: 8192, inputPrice: 0.1, outputPrice: 0.1, isEnabled: true, memberTier: 'pro' },
  ];
  await prisma.llmProviderConfig.upsert({
    where: { slug: 'zhipu' },
    update: { apiKey: process.env.ZHIPU_API_KEY || '', models: zhipuModels },
    create: {
      name: '智谱 AI',
      slug: 'zhipu',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: process.env.ZHIPU_API_KEY || '',
      isEnabled: true,
      models: zhipuModels,
    },
  });

  await prisma.llmProviderConfig.upsert({
    where: { slug: 'deepseek' },
    update: {},
    create: {
      name: 'DeepSeek',
      slug: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      isEnabled: true,
      models: [
        { modelId: 'deepseek-chat', name: 'DeepSeek-V3', maxTokens: 8192, inputPrice: 0.001, outputPrice: 0.002, isEnabled: true, memberTier: 'free' },
        { modelId: 'deepseek-reasoner', name: 'DeepSeek-R1', maxTokens: 8192, inputPrice: 0.004, outputPrice: 0.016, isEnabled: true, memberTier: 'basic' },
      ],
    },
  });

  const minimaxModels = [
    { modelId: 'MiniMax-Text-01', name: 'MiniMax-Text-01', maxTokens: 8192, inputPrice: 0.004, outputPrice: 0.016, isEnabled: true, memberTier: 'free' },
    { modelId: 'MiniMax-M2.1', name: 'MiniMax-M2.1', maxTokens: 32768, inputPrice: 0.006, outputPrice: 0.018, isEnabled: true, memberTier: 'basic' },
    { modelId: 'MiniMax-M2.5', name: 'MiniMax-M2.5', maxTokens: 131072, inputPrice: 0.012, outputPrice: 0.036, isEnabled: true, memberTier: 'pro' },
  ];

  await prisma.llmProviderConfig.upsert({
    where: { slug: 'minimax' },
    update: {
      apiKey: process.env.MINIMAX_API_KEY || '',
      models: minimaxModels,
    },
    create: {
      name: 'MiniMax',
      slug: 'minimax',
      baseUrl: 'https://api.minimax.chat/v1',
      apiKey: process.env.MINIMAX_API_KEY || '',
      isEnabled: true,
      models: minimaxModels,
    },
  });

  console.log('✅ LLM 供应商配置已创建');
  console.log('🎉 种子数据填充完成!');
  console.log('');
  console.log('测试账号:');
  console.log('  管理员: admin@chatbutler.com / admin123');
  console.log('  用户:   test@chatbutler.com / test123');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据填充失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
