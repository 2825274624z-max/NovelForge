import fs from "node:fs";
import path from "node:path";
import type { ProviderType } from "@/lib/ai/provider";

export interface ProviderConfig {
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  reasoningEffort?: string;
}

export interface AppConfig {
  ai: {
    defaultProvider: ProviderType;
    providers: Partial<Record<ProviderType, ProviderConfig>>;
  };
  editor: {
    fontSize: number;
    lineHeight: number;
    autoSaveIntervalMs: number;
    maxPauseChars: number;
  };
  ui: {
    defaultTheme: string;
    sidebarWidth: number;
    aiPanelDefaultOpen: boolean;
  };
}

let _config: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (_config) return _config;

  const defaultConfig: AppConfig = {
    ai: {
      defaultProvider: "deepseek",
      providers: {
        deepseek: { model: "deepseek-v4-flash", baseUrl: "https://api.deepseek.com", maxTokens: 8192, temperature: 0.7 },
        openai: { model: "gpt-4o", baseUrl: "https://api.openai.com/v1", maxTokens: 8192, temperature: 0.7 },
      },
    },
    editor: { fontSize: 16, lineHeight: 1.9, autoSaveIntervalMs: 2000, maxPauseChars: 500 },
    ui: { defaultTheme: "dark", sidebarWidth: 220, aiPanelDefaultOpen: true },
  };

  try {
    const configPath = path.resolve(process.cwd(), "novelforge.config.json");
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      const user = JSON.parse(raw);
      _config = deepMerge(defaultConfig, user);
    } else {
      _config = defaultConfig;
    }
  } catch {
    _config = defaultConfig;
  }

  return _config!;
}

function deepMerge(base: any, override: any): any {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (override[key] && typeof override[key] === "object" && !Array.isArray(override[key])) {
      result[key] = deepMerge(base[key] || {}, override[key]);
    } else if (override[key] !== undefined) {
      result[key] = override[key];
    }
  }
  return result;
}

export function clearConfigCache(): void {
  _config = null;
}

export function getProviderDefaults(provider: ProviderType): Partial<ProviderConfig> {
  const config = loadConfig();
  return config.ai.providers[provider] || {};
}
