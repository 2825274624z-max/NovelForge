import OpenAI from "openai";

export type ProviderType = "openai" | "anthropic" | "gemini" | "deepseek" | "openrouter" | "ollama";

export interface AIProviderConfig {
  provider: ProviderType;
  model: string;
  baseUrl?: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  reasoningEffort?: string;
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
  chat(req: AIRequest, signal?: AbortSignal): Promise<AIResponse>;
  stream(req: AIRequest, signal?: AbortSignal): AsyncGenerator<string, void, unknown>;
  getName(): string;
}

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: "timeout" | "cancelled" | "auth" | "rate_limit" | "server" | "network" | "unknown",
    public readonly statusCode?: number
  ) { super(message); this.name = "AIError"; }
}

const ENV_KEYS: Record<ProviderType, string> = {
  openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY", gemini: "GEMINI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY", openrouter: "OPENROUTER_API_KEY", ollama: "OLLAMA_API_KEY",
};

const DEFAULT_BASE_URLS: Record<ProviderType, string> = {
  openai: "https://api.openai.com/v1", anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta", deepseek: "https://api.deepseek.com/v1",
  openrouter: "https://openrouter.ai/api/v1", ollama: "http://localhost:11434/v1",
};

const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: "gpt-4o", anthropic: "claude-sonnet-4-5", gemini: "gemini-2.5-flash",
  deepseek: "deepseek-v4-flash", openrouter: "anthropic/claude-sonnet-4-5", ollama: "llama3.2",
};

export const PROVIDER_META: { value: ProviderType; label: string }[] = [
  { value: "openai", label: "OpenAI" }, { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Gemini" }, { value: "deepseek", label: "DeepSeek" },
  { value: "openrouter", label: "OpenRouter" }, { value: "ollama", label: "Ollama (本地)" },
];

export function getEnvKey(provider: ProviderType) { return ENV_KEYS[provider]; }
export function getDefaultBaseUrl(provider: ProviderType) { return DEFAULT_BASE_URLS[provider]; }
export function getDefaultModel(provider: ProviderType) { return DEFAULT_MODELS[provider]; }

function classifyError(err: unknown): AIError {
  if (err instanceof AIError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  if (err instanceof OpenAI.APIError) {
    if (err.status === 401 || err.status === 403) return new AIError(msg, "auth", err.status);
    if (err.status === 429) return new AIError(msg, "rate_limit", err.status);
    if (err.status && err.status >= 500) return new AIError(msg, "server", err.status);
  }
  if (msg.toLowerCase().includes("timeout")) return new AIError(msg, "timeout");
  if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("abort")) return new AIError(msg, "cancelled");
  if (msg.toLowerCase().includes("fetch")) return new AIError(msg, "network");
  return new AIError(msg, "unknown");
}

export function createProvider(config: AIProviderConfig): AIProvider {
  const apiKey = config.apiKey || process.env[ENV_KEYS[config.provider]] || "";
  const baseURL = config.baseUrl || DEFAULT_BASE_URLS[config.provider];
  const model = config.model || DEFAULT_MODELS[config.provider];
  const openai = new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true });

  function buildMessages(req: AIRequest) {
    return [
      ...(req.system ? [{ role: "system" as const, content: req.system }] : []),
      ...req.messages.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
    ];
  }

  function buildExtra() {
    const e: Record<string, unknown> = {};
    if (config.topP != null && config.topP < 1.0) e.top_p = config.topP;
    if (config.frequencyPenalty) e.frequency_penalty = config.frequencyPenalty;
    if (config.presencePenalty) e.presence_penalty = config.presencePenalty;
    if (config.reasoningEffort) e.reasoning_effort = config.reasoningEffort;
    return e;
  }

  return {
    getName: () => `${config.provider}:${model}`,

    chat: async (req: AIRequest, signal?: AbortSignal): Promise<AIResponse> => {
      const completion = await openai.chat.completions.create(
        {
          model,
          messages: buildMessages(req),
          temperature: req.temperature ?? config.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? config.maxTokens ?? 8192,
          ...buildExtra(),
        },
        { signal }
      );
      return {
        content: completion.choices[0]?.message?.content || "",
        model: completion.model || model,
        usage: completion.usage ? { promptTokens: completion.usage.prompt_tokens, completionTokens: completion.usage.completion_tokens } : undefined,
      };
    },

    stream: async function* (req: AIRequest, signal?: AbortSignal): AsyncGenerator<string, void, unknown> {
      const stream = await openai.chat.completions.create(
        {
          model,
          messages: buildMessages(req),
          temperature: req.temperature ?? config.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? config.maxTokens ?? 8192,
          stream: true,
          ...buildExtra(),
        },
        { signal }
      );
      for await (const chunk of stream) {
        if (signal?.aborted) break;
        const c = chunk.choices[0]?.delta?.content || "";
        if (c) yield c;
      }
    },
  };
}

export function createProviderWithRetry(config: AIProviderConfig, maxRetries = 2, timeoutMs = 90000): AIProvider {
  const base = createProvider(config);

  const withTimeout = <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (signal?.aborted) return Promise.reject(new AIError("请求已取消", "cancelled"));
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new AIError(`请求超时 (${timeoutMs / 1000}s)`, "timeout")), timeoutMs);
      const onAbort = () => { clearTimeout(timer); reject(new AIError("请求已取消", "cancelled")); };
      signal?.addEventListener("abort", onAbort, { once: true });
      promise.then((v) => { clearTimeout(timer); signal?.removeEventListener("abort", onAbort); resolve(v); })
        .catch((e) => { clearTimeout(timer); signal?.removeEventListener("abort", onAbort); reject(e); });
    });
  };

  const retry = async <T>(fn: (signal?: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> => {
    let lastErr: unknown;
    for (let i = 0; i <= maxRetries; i++) {
      try { return await withTimeout(fn(signal), signal); } catch (err) {
        lastErr = err;
        const ae = classifyError(err);
        if (ae.code === "cancelled" || ae.code === "auth") throw ae;
        if (i < maxRetries) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
    throw classifyError(lastErr);
  };

  return {
    getName: () => base.getName(),
    chat: (req, signal) => retry((s) => base.chat(req, s), signal),
    stream: async function* (req, signal) {
      let lastErr: unknown;
      for (let i = 0; i <= maxRetries; i++) {
        try { yield* base.stream(req, signal); return; } catch (err) {
          lastErr = err;
          const ae = classifyError(err);
          if (ae.code === "cancelled" || ae.code === "auth") throw ae;
          if (i < maxRetries) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
      }
      throw classifyError(lastErr);
    },
  };
}
