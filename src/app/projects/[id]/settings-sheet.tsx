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
import { useState } from "react";
import { Key, Wifi, Loader2, Save, Trash2, Download, FileText, ChevronDown, ChevronRight } from "lucide-react";
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from "@/components/ui/tooltip";

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
  topP: number; frequencyPenalty: number; presencePenalty: number; reasoningEffort: string;
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const set = (patch: Partial<ProjectForm>) => onProjectFormChange({ ...projectForm, ...patch });
  const setAi = (patch: Partial<AiSettings>) => onAiSettingsChange({ ...aiSettings, ...patch });

  const modelDefaults: Record<string, string> = {
    openai: "gpt-4o", anthropic: "claude-sonnet-4-5", gemini: "gemini-2.5-flash",
    deepseek: "deepseek-v4-flash", openrouter: "anthropic/claude-sonnet-4-5", ollama: "llama3.2",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[calc(100vw-2rem)] sm:w-[380px] md:w-[420px] p-0 flex flex-col max-w-full">
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
              <Textarea className="text-sm h-24 resize-y" placeholder="作品的核心设定、故事梗概、主要冲突..." value={projectForm.description} onChange={(e) => set({ description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">世界观设定</Label>
              <Textarea className="text-sm h-28 resize-y" placeholder="世界背景、势力分布、规则体系、历史事件..." value={projectForm.worldView} onChange={(e) => set({ worldView: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">写作要求</Label>
              <Textarea className="text-sm h-24 resize-y" placeholder="风格要求、叙事视角、节奏偏好、特殊约束..." value={projectForm.writingReqs} onChange={(e) => set({ writingReqs: e.target.value })} />
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
            <Tooltip>
              <TooltipTrigger>
                <Button variant="outline" size="sm" className="text-xs h-7 w-full" onClick={onTestConnection} disabled={testing}>
                  {testing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wifi className="w-3 h-3 mr-1" />}
                  测试连接
                </Button>
              </TooltipTrigger>
              <TooltipContent>测试 AI Provider 连接是否正常</TooltipContent>
            </Tooltip>

            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full">
              {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              高级参数（满血配置）
            </button>

            {showAdvanced && (
              <div className="space-y-2 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Top P</Label>
                    <Input type="number" min={0} max={1} step={0.05} className="text-xs h-8"
                      value={aiSettings.topP} onChange={(e) => setAi({ topP: parseFloat(e.target.value) ?? 1.0 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">频率惩罚</Label>
                    <Input type="number" min={-2} max={2} step={0.1} className="text-xs h-8"
                      value={aiSettings.frequencyPenalty} onChange={(e) => setAi({ frequencyPenalty: parseFloat(e.target.value) ?? 0 })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">频率惩罚</Label>
                    <Input type="number" min={-2} max={2} step={0.1} className="text-xs h-8"
                      value={aiSettings.frequencyPenalty} onChange={(e) => setAi({ frequencyPenalty: parseFloat(e.target.value) ?? 0 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">存在惩罚</Label>
                    <Input type="number" min={-2} max={2} step={0.1} className="text-xs h-8"
                      value={aiSettings.presencePenalty} onChange={(e) => setAi({ presencePenalty: parseFloat(e.target.value) ?? 0 })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px]">推理强度（DeepSeek V4 / OpenAI o-series）</Label>
                  <Select value={aiSettings.reasoningEffort || ""} onValueChange={(v) => setAi({ reasoningEffort: v || "" })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="默认（不启用深度思考）" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">默认</SelectItem>
                      <SelectItem value="medium">中等</SelectItem>
                      <SelectItem value="high">高</SelectItem>
                      <SelectItem value="max">最大</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed">
                  DeepSeek V4 Pro 建议 reasoningEffort=max 发挥满血推理能力。Top P &lt; 1 可减少重复输出。
                </p>
              </div>
            )}
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
