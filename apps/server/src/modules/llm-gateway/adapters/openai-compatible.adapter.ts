import OpenAI from 'openai';
import { LLMProvider, LLMChatRequest, LLMChatResponse, LLMChatChunk, ProviderConfig } from '../llm-provider.interface';

export class OpenAICompatibleAdapter implements LLMProvider {
  readonly name: string;
  private client: OpenAI;
  private defaultModel: string;

  constructor(private config: ProviderConfig) {
    this.name = config.slug;
    this.defaultModel = config.models[0]?.modelId ?? 'gpt-3.5-turbo';

    const headers: Record<string, string> = {};
    if (config.extraHeaders) {
      Object.assign(headers, config.extraHeaders);
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      defaultHeaders: headers,
      timeout: 30000,
      maxRetries: 2,
    });
  }

  async chat(params: LLMChatRequest): Promise<LLMChatResponse> {
    const messages = this.buildMessages(params);

    const response = await this.client.chat.completions.create({
      model: params.model,
      messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content || '',
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      },
      model: response.model,
    };
  }

  async *chatStream(params: LLMChatRequest): AsyncIterable<LLMChatChunk> {
    const messages = this.buildMessages(params);

    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      const isComplete = chunk.choices[0]?.finish_reason !== null;

      if (delta || isComplete) {
        yield { content: delta, isComplete };
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
        stream: false,
      });
      return true;
    } catch {
      return false;
    }
  }

  private buildMessages(params: LLMChatRequest): OpenAI.ChatCompletionMessageParam[] {
    const messages: OpenAI.ChatCompletionMessageParam[] = [];

    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }

    for (const msg of params.messages) {
      messages.push({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      });
    }

    return messages;
  }
}
