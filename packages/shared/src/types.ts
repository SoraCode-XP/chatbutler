// ============ User & Auth ============

export type UserRole = 'user' | 'admin' | 'super_admin';

export type MemberTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  memberTier: MemberTier;
  resourcePoints: number;
  avatar?: string;
}

// ============ Agent ============

export type AgentType = 'general' | 'specialist';

export interface AgentCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  sortOrder: number;
}

export interface AgentInfo {
  id: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string;
  avatar: string;
  tags: string[];
  type: AgentType;
  capabilities: AgentCapability[];
  welcomeMessage: string;
  quickQuestions: string[];
  requiredTier: MemberTier;
  isFavorite?: boolean;
  sortOrder?: number;
}

export interface AgentCapability {
  name: string;
  description: string;
  icon: string;
}

// ============ Chat ============

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokenCount?: number;
  modelUsed?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  agentId: string;
  title: string;
  isFavorite: boolean;
  lastMessageAt: string;
  createdAt: string;
}

// ============ LLM ============

export type LLMProviderType = 'openai_native' | 'openai_compatible' | 'wenxin';

export type AuthType = 'bearer' | 'zhipu_jwt' | 'wenxin_oauth' | 'custom';

export type ProxyTemplate = 'openrouter' | 'oneapi' | 'newapi' | 'aihubmix' | 'custom' | null;

export type ProviderCategory = 'direct' | 'proxy';

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export type TaskComplexity = 'simple' | 'medium' | 'complex';

export interface ModelInfo {
  id: string;
  displayName: string;
  maxContextWindow: number;
  inputPricePerMToken: number;
  outputPricePerMToken: number;
  capabilities: string[];
  tier: MemberTier[];
  isEnabled: boolean;
}

export interface LLMProviderInfo {
  id: string;
  name: string;
  displayName: string;
  type: LLMProviderType;
  authType: AuthType;
  category: ProviderCategory;
  baseURL: string;
  proxyTemplate: ProxyTemplate;
  models: ModelInfo[];
  isEnabled: boolean;
  healthStatus: HealthStatus;
}

// ============ Token ============

export interface TokenUsageRecord {
  id: string;
  userId: string;
  agentId: string;
  modelId: string;
  providerId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  createdAt: string;
}

// ============ Template ============

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'select' | 'number';
  required: boolean;
  options?: string[];
  default?: string;
}

export interface ContentTemplate {
  id: string;
  agentId: string;
  name: string;
  category: string;
  description: string;
  variables: TemplateVariable[];
}

// ============ Intent (AI 大总管路由) ============

export interface IntentResult {
  category: string | null;
  routeTo: string | null;
  confidence: number;
  reply: string;
  contextSummary: string;
  alternatives: string[];
}

// ============ WebSocket Events ============

export interface ChatSendEvent {
  conversationId?: string;
  agentId: string;
  message: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
}

export interface ChatChunkEvent {
  conversationId: string;
  messageId: string;
  chunk: string;
  isComplete: boolean;
}

export interface ChatErrorEvent {
  conversationId?: string;
  code: string;
  message: string;
}

// ============ API Responses ============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
