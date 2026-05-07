import OpenAI from "openai";

export type ProviderType =
  | "openai"
  | "anthropic"
  | "gemini"
  | "deepseek"
  | "openrouter"
  | "ollama";

export interface AIProviderConfig {
  provider: ProviderType;
  model: string;
  baseUrl?: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIRequest {
  system?: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface AIProvider {
  chat(req: AIRequest): Promise<AIResponse>;
  stream(req: AIRequest): AsyncGenerator<string, void, unknown>;
  getName(): string;
}

function getEnvKey(provider: ProviderType): string {
  const map: Record<ProviderType, string> = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    ollama: "OLLAMA_API_KEY",
  };
  return map[provider];
}

function getDefaultBaseUrl(provider: ProviderType): string {
  const map: Record<ProviderType, string> = {
    openai: "https://api.openai.com/v1",
    anthropic: "https://api.anthropic.com/v1",
    gemini: "https://generativelanguage.googleapis.com/v1beta",
    deepseek: "https://api.deepseek.com/v1",
    openrouter: "https://openrouter.ai/api/v1",
    ollama: "http://localhost:11434/v1",
  };
  return map[provider];
}

function getModelMap(provider: ProviderType): string {
  const map: Record<ProviderType, string> = {
    openai: "gpt-4o",
    anthropic: "claude-sonnet-4-6",
    gemini: "gemini-2.0-flash",
    deepseek: "deepseek-chat",
    openrouter: "anthropic/claude-sonnet-4-6",
    ollama: "llama3",
  };
  return map[provider];
}

export function createProvider(config: AIProviderConfig): AIProvider {
  const apiKey = config.apiKey || process.env[getEnvKey(config.provider)] || "";
  const baseUrl = config.baseUrl || getDefaultBaseUrl(config.provider);
  const model = config.model || getModelMap(config.provider);

  const openai = new OpenAI({
    apiKey,
    baseURL: baseUrl,
    dangerouslyAllowBrowser: true,
  });

  return {
    getName: () => `${config.provider}:${model}`,

    chat: async (req: AIRequest): Promise<AIResponse> => {
      const completion = await openai.chat.completions.create({
        model,
        messages: [
          ...(req.system ? [{ role: "system" as const, content: req.system }] : []),
          ...req.messages.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          })),
        ],
        temperature: req.temperature ?? config.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? config.maxTokens ?? 4096,
      });

      return {
        content: completion.choices[0]?.message?.content || "",
        model: completion.model || model,
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
            }
          : undefined,
      };
    },

    stream: async function* (req: AIRequest): AsyncGenerator<string, void, unknown> {
      const stream = await openai.chat.completions.create({
        model,
        messages: [
          ...(req.system ? [{ role: "system" as const, content: req.system }] : []),
          ...req.messages.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          })),
        ],
        temperature: req.temperature ?? config.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? config.maxTokens ?? 4096,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) yield content;
      }
    },
  };
}
