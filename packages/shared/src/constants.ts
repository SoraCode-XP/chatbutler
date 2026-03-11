// ============ Member Tiers ============

export const MEMBER_TIERS = ['free', 'basic', 'pro', 'enterprise'] as const;

export const MEMBER_TIER_LABELS: Record<string, string> = {
  free: '免费用户',
  basic: '基础会员',
  pro: '专业会员',
  enterprise: '企业会员',
};

// ============ Agent ============

export const GENERAL_AGENT_SLUG = 'ai-general-manager';

export const AGENT_CATEGORY_SLUGS = {
  SALES: 'sales',
  CONTENT: 'content',
  OPERATION: 'operation',
} as const;

// ============ WebSocket Events ============

export const WS_EVENTS = {
  CHAT_SEND: 'chat:send',
  CHAT_CHUNK: 'chat:chunk',
  CHAT_COMPLETE: 'chat:complete',
  CHAT_ERROR: 'chat:error',
  CHAT_STOP: 'chat:stop',
} as const;

// ============ Defaults ============

export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_MAX_TOKENS = 4096;
export const DEFAULT_CONTEXT_WINDOW_LIMIT = 20;

// ============ Limits ============

export const MAX_MESSAGE_LENGTH = 10000;
export const MAX_CONVERSATION_TITLE_LENGTH = 100;
