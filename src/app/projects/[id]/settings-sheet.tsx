"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Key, Wifi, Loader2, Save, Trash2, Download, FileText } from "lucide-react";

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Gemini" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "ollama", label: "Ollama (本地)" },
];

interface ProjectForm {
  title: string; type: string; genre: string; style: string; targetWords: number;
  description: string; worldView: string; writingReqs: string;
}

interface AiSettings {
  provider: string; model: string; baseUrl: string; apiKey: string;
  temperature: number; maxTokens: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectForm: ProjectForm;
  aiSettings: AiSettings;
  testing: boolean;
  onProjectFormChange: (v: ProjectForm) => void;
  onAiSettingsChange: (v: AiSettings) => void;
  onSave: () => void;
  onTestConnection: () => void;
  onExport: (format: string) => void;
  onDelete: () => void;
}

export function SettingsSheet({
  open, onOpenChange,
  projectForm, aiSettings, testing,
  onProjectFormChange, onAiSettingsChange,
  onSave, onTestConnection, onExport, onDelete,
}: Props) {
  const set = (patch: Partial<ProjectForm>) => onProjectFormChange({ ...projectForm, ...patch });
  const setAi = (patch: Partial<AiSettings>) => onAiSettingsChange({ ...aiSettings, ...patch });

  const modelDefaults: Record<string, string> = {
    openai: "gpt-4o", anthropic: "claude-sonnet-4-6", gemini: "gemini-2.0-flash",
    deepseek: "deepseek-chat", openrouter: "anthropic/claude-sonnet-4-6", ollama: "llama3",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle className="text-sm">作品设置</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Basic info */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">基本信息</h3>
            <div className="space-y-1.5">
              <Label className="text-[10px]">作品标题</Label>
              <Input className="text-xs h-8" value={projectForm.title} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px]">类型</Label>
                <Select value={projectForm.type} onValueChange={(v) => v && set({ type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novel">长篇小说</SelectItem><SelectItem value="novella">中篇小说</SelectItem>
                    <SelectItem value="short">短篇小说</SelectItem><SelectItem value="serial">连载</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px]">题材</Label>
                <Input className="text-xs h-8" value={projectForm.genre} onChange={(e) => set({ genre: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">风格</Label>
              <Input className="text-xs h-8" value={projectForm.style} onChange={(e) => set({ style: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">目标字数</Label>
              <Input type="number" className="text-xs h-8" value={projectForm.targetWords}
                onChange={(e) => set({ targetWords: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">简介</Label>
              <Textarea className="text-xs h-16" value={projectForm.description} onChange={(e) => set({ description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">世界观设定</Label>
              <Textarea className="text-xs h-16" value={projectForm.worldView} onChange={(e) => set({ worldView: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">写作要求</Label>
              <Textarea className="text-xs h-16" value={projectForm.writingReqs} onChange={(e) => set({ writingReqs: e.target.value })} />
            </div>
          </div>

          {/* AI config */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3 h-3" />AI 模型
            </h3>
            <div className="space-y-1.5">
              <Label className="text-[10px]">Provider</Label>
              <Select value={aiSettings.provider} onValueChange={(v) => {
                if (!v) return;
                setAi({ provider: v, model: modelDefaults[v] || "gpt-4o" });
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">模型名称</Label>
              <Input className="text-xs h-8" value={aiSettings.model} onChange={(e) => setAi({ model: e.target.value })} />
            </div>
            {aiSettings.provider !== "ollama" && (
              <div className="space-y-1.5">
                <Label className="text-[10px]">API Key</Label>
                <Input type="password" className="text-xs h-8" placeholder="留空使用环境变量" value={aiSettings.apiKey} onChange={(e) => setAi({ apiKey: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[10px]">Base URL</Label>
              <Input className="text-xs h-8" placeholder="留空使用默认" value={aiSettings.baseUrl} onChange={(e) => setAi({ baseUrl: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px]">Temperature ({aiSettings.temperature})</Label>
                <Input type="number" min={0} max={2} step={0.1} className="text-xs h-8" value={aiSettings.temperature}
                  onChange={(e) => setAi({ temperature: parseFloat(e.target.value) || 0.7 })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px]">Max Tokens</Label>
                <Input type="number" className="text-xs h-8" value={aiSettings.maxTokens}
                  onChange={(e) => setAi({ maxTokens: parseInt(e.target.value) || 4096 })} />
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-7 w-full" onClick={onTestConnection} disabled={testing}>
              {testing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wifi className="w-3 h-3 mr-1" />}
              测试连接
            </Button>
          </div>

          {/* Export */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">导出</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs h-7 flex-1" onClick={() => onExport("md")}>
                <FileText className="w-3 h-3 mr-1" />Markdown
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 flex-1" onClick={() => onExport("txt")}>
                <Download className="w-3 h-3 mr-1" />TXT
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 flex-1" onClick={() => onExport("json")}>
                <Download className="w-3 h-3 mr-1" />JSON
              </Button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="border-t pt-4 flex justify-between">
            <Button variant="destructive" size="sm" className="text-xs h-7" onClick={onDelete}>
              <Trash2 className="w-3 h-3 mr-1" />删除作品
            </Button>
            <Button size="sm" className="text-xs h-7" onClick={onSave}>
              <Save className="w-3 h-3 mr-1" />保存设置
            </Button>
          </div>

          {/* Watermark */}
          <p className="text-center text-[10px] text-muted-foreground/25 pt-2">
            Yuagent · 斗包要打野 · 2825274624z@gmail.com
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
