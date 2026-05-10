"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Key, Wifi, Loader2, Save, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAIConfigStore } from "@/store/useStore";

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Gemini" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "ollama", label: "Ollama (本地)" },
];

const MODEL_DEFAULTS: Record<string, string> = {
  openai: "gpt-4o", anthropic: "claude-sonnet-4-5", gemini: "gemini-2.5-flash",
  deepseek: "deepseek-v4-flash", openrouter: "anthropic/claude-sonnet-4-5", ollama: "llama3.2",
};

const BASE_URL_DEFAULTS: Record<string, string> = {
  openai: "https://api.openai.com/v1", anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta", deepseek: "https://api.deepseek.com",
  openrouter: "https://openrouter.ai/api/v1", ollama: "http://localhost:11434/v1",
};

interface AiConfig {
  defaultProvider: string;
  providers: Record<string, {
    model: string; baseUrl: string; apiKey?: string;
    temperature: number; maxTokens: number;
    topP: number; frequencyPenalty: number; presencePenalty: number;
    reasoningEffort: string;
  }>;
}

const DEFAULT_AI: AiConfig = {
  defaultProvider: "deepseek",
  providers: Object.fromEntries(PROVIDERS.map((p) => [p.value, {
    model: MODEL_DEFAULTS[p.value] || "",
    baseUrl: BASE_URL_DEFAULTS[p.value] || "",
    apiKey: "",
    temperature: 0.7, maxTokens: 8192,
    topP: 1.0, frequencyPenalty: 0, presencePenalty: 0,
    reasoningEffort: "",
  }])),
};

export function GlobalAISettings() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<AiConfig>(DEFAULT_AI);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const replaceAIConfig = useAIConfigStore((s) => s.replaceAIConfig);

  const activeProvider = config.defaultProvider;
  const provider = config.providers[activeProvider] || DEFAULT_AI.providers[activeProvider];

  // 加载全局配置
  useEffect(() => {
    if (!open) return;
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.ai) setConfig((prev) => ({ ...prev, ...data.ai }));
      })
      .catch(() => {});
  }, [open]);

  const setProvider = (patch: Partial<typeof provider>) => {
    setConfig((prev) => ({
      ...prev,
      providers: {
        ...prev.providers,
        [activeProvider]: { ...prev.providers[activeProvider], ...patch },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error();

      // 同步到 Zustand store — 工作台立即生效
      const p = config.providers[activeProvider];
      replaceAIConfig({
        provider: activeProvider,
        model: p.model,
        baseUrl: p.baseUrl,
        apiKey: p.apiKey || "",
        temperature: p.temperature,
        maxTokens: p.maxTokens,
        topP: p.topP,
        frequencyPenalty: p.frequencyPenalty,
        presencePenalty: p.presencePenalty,
        reasoningEffort: p.reasoningEffort || "",
      });

      toast.success("全局 AI 配置已保存");
      setOpen(false);
    } catch { toast.error("保存失败"); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: activeProvider,
          model: provider.model,
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          temperature: provider.temperature,
          maxTokens: 100,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`连接成功 — ${data.model}`);
      } else {
        const err = await res.text();
        toast.error(`连接失败：${err}`);
      }
    } catch { toast.error("连接测试失败"); }
    finally { setTesting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI 设置</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5" />全局 AI 设置
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Provider + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px]">默认 Provider</Label>
              <Select value={activeProvider} onValueChange={(v) => v && setConfig((prev) => ({ ...prev, defaultProvider: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">模型</Label>
              <Input className="text-xs h-8" value={provider.model}
                onChange={(e) => setProvider({ model: e.target.value })} />
            </div>
          </div>

          {/* API Key */}
          {activeProvider !== "ollama" && (
            <div className="space-y-1.5">
              <Label className="text-[10px]">API Key</Label>
              <Input type="password" className="text-xs h-8" placeholder="留空使用环境变量"
                value={provider.apiKey || ""}
                onChange={(e) => setProvider({ apiKey: e.target.value })} />
            </div>
          )}

          {/* Base URL */}
          <div className="space-y-1.5">
            <Label className="text-[10px]">Base URL</Label>
            <Input className="text-xs h-8" value={provider.baseUrl}
              onChange={(e) => setProvider({ baseUrl: e.target.value })} />
          </div>

          {/* Temp + MaxTokens */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px]">Temperature ({provider.temperature})</Label>
              <Input type="number" min={0} max={2} step={0.1} className="text-xs h-8"
                value={provider.temperature}
                onChange={(e) => setProvider({ temperature: parseFloat(e.target.value) || 0.7 })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">Max Tokens</Label>
              <Input type="number" className="text-xs h-8" value={provider.maxTokens}
                onChange={(e) => setProvider({ maxTokens: parseInt(e.target.value) || 8192 })} />
            </div>
          </div>

          {/* Test */}
          <Button variant="outline" size="sm" className="text-xs h-7 w-full"
            onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wifi className="w-3 h-3 mr-1" />}
            测试连接
          </Button>

          {/* Advanced */}
          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full">
            {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            高级参数
          </button>

          {showAdvanced && (
            <div className="space-y-2 animate-in fade-in duration-150">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px]">Top P</Label>
                  <Input type="number" min={0} max={1} step={0.05} className="text-xs h-8"
                    value={provider.topP}
                    onChange={(e) => setProvider({ topP: parseFloat(e.target.value) || 1.0 })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px]">频率惩罚</Label>
                  <Input type="number" min={-2} max={2} step={0.1} className="text-xs h-8"
                    value={provider.frequencyPenalty}
                    onChange={(e) => setProvider({ frequencyPenalty: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px]">存在惩罚</Label>
                  <Input type="number" min={-2} max={2} step={0.1} className="text-xs h-8"
                    value={provider.presencePenalty}
                    onChange={(e) => setProvider({ presencePenalty: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px]">推理强度（DeepSeek V4 / OpenAI o-series）</Label>
                <Select value={provider.reasoningEffort || ""} onValueChange={(v) => setProvider({ reasoningEffort: v || "" })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="默认" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">默认</SelectItem>
                    <SelectItem value="medium">中等</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="max">最大</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>取消</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            保存全局配置
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
