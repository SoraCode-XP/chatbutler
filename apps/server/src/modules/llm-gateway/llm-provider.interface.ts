export interface LLMProvider {
  readonly name: string;

  chat(params: LLMChatRequest): Promise<LLMChatResponse>;
  chatStream(params: LLMChatRequest): AsyncIterable<LLMChatChunk>;
  healthCheck(): Promise<boolean>;
}

export interface LLMChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMChatResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
}

export interface LLMChatChunk {
  content: string;
  isComplete: boolean;
}

export interface RegisteredProvider {
  config: ProviderConfig;
  adapter: LLMProvider;
}

export interface ProviderConfig {
  id: string;
  name: string;
  displayName: string;
  type: string;
  authType: string;
  category: string;
  baseURL: string;
  apiKeyEncrypted: string;
  extraHeaders: Record<string, string>;
  proxyTemplate: string | null;
  models: ProviderModelConfig[];
  defaultWeight: number;
  timeout: number;
  maxRetries: number;
  concurrencyLimit: number;
  ratioMultiplier: number;
  isEnabled: boolean;
}

export interface ProviderModelConfig {
  id: string;
  displayName: string;
  maxContextWindow: number;
  inputPricePerMToken: number;
  outputPricePerMToken: number;
  capabilities: string[];
  tier: string[];
  isEnabled: boolean;
}
