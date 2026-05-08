"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wand2, Sparkles, Loader2, StopCircle } from "lucide-react";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { estimateTokens, formatTokens } from "@/lib/token-count";

const WORKFLOW_CHIPS = [
  { value: "draft", label: "生成章节", desc: "根据设定生成新章节", icon: "📝" },
  { value: "continue", label: "续写", desc: "从当前位置接着写", icon: "➡️" },
  { value: "polish", label: "润色", desc: "选中文字 → 优化表达", icon: "✨" },
  { value: "expand", label: "扩写", desc: "选中文字 → 丰富细节", icon: "📖" },
  { value: "shorten", label: "缩写", desc: "选中文字 → 精简表达", icon: "✂️" },
  { value: "rewrite", label: "重写", desc: "选中→段落 / 全文→整章", icon: "🔄" },
];

const AI_ASSET_OPTS = [
  { k: "characters", l: "角色" },
  { k: "world", l: "世界观" },
  { k: "locations", l: "地点" },
  { k: "organizations", l: "组织" },
  { k: "items", l: "物品" },
  { k: "fore", l: "伏笔" },
  { k: "timeline", l: "时间线" },
];

interface Props {
  workflow: string;
  aiMessage: string;
  aiContext: string;
  aiAssets: Record<string, boolean>;
  generating: boolean;
  streamingContent: string;
  contextTokenCount: number;
  contextPreview: string;
  onWorkflowChange: (v: string) => void;
  onMessageChange: (v: string) => void;
  onContextChange: (v: string) => void;
  onAssetsChange: (v: Record<string, boolean>) => void;
  onGenerate: () => void;
  onCancel: () => void;
  onInsert: () => void;
  onRetry: () => void;
}

export function AIPanel({
  workflow, aiMessage, aiContext, aiAssets,
  generating, streamingContent, contextTokenCount, contextPreview,
  onWorkflowChange, onMessageChange, onContextChange, onAssetsChange,
  onGenerate, onCancel, onInsert, onRetry,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const active = WORKFLOW_CHIPS.find((w) => w.value === workflow) || WORKFLOW_CHIPS[0];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Workflow chips */}
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">
              选择工作流
            </Label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1">
              <TooltipProvider delay={700}>
                {WORKFLOW_CHIPS.map((w, i) => (
                  <Tooltip key={w.value}>
                    <TooltipTrigger>
                      <button
                        onClick={() => onWorkflowChange(w.value)}
                        style={{ animationDelay: `${i * 25}ms` }}
                        className={`text-left px-2 py-1.5 xl:px-2.5 xl:py-2 rounded-md transition-all duration-200 border animate-float-in w-full ${
                          workflow === w.value
                            ? "border-primary/40 bg-primary/5 text-primary shadow-sm"
                            : "border-transparent hover:bg-muted/50 hover:shadow-sm text-muted-foreground hover:text-foreground hover:scale-[1.02] active:scale-[0.98]"
                        }`}
                      >
                        <div className="text-[12px] font-medium flex items-center gap-1">
                          <span className="text-[14px]">{w.icon}</span>
                          {w.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight hidden sm:block">
                          {w.desc}
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{w.desc}</TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>

          {/* Active workflow info */}
          <div className="text-[11px] text-muted-foreground bg-muted/30 rounded p-2 flex items-center gap-1.5">
            <span className="text-[14px]">{active.icon}</span>
            <span className="font-medium text-foreground">{active.label}</span>
            <span>— {active.desc}</span>
          </div>

          {/* Prompt */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {["draft", "outline"].includes(workflow) ? "大纲 / 设定" : "提示词"}
            </Label>
            <Textarea
              className="h-20 text-[13px] resize-none"
              placeholder={
                workflow === "polish" ? "选中文字后点击生成 → 润色选中内容"
                : workflow === "rewrite" ? "选中文字后输入目标风格 → 改写选中内容"
                : workflow === "expand" ? "选中文字后点击生成 → 扩写选中内容"
                : workflow === "shorten" ? "选中文字后点击生成 → 缩写选中内容"
                : workflow === "continue" ? "续写方向，如：主角发现了密室..."
                : workflow === "draft" ? "描述你要写的内容，如：主角深夜潜入研究所..."
                : "输入你的指令..."
              }
              value={aiMessage}
              onChange={(e) => onMessageChange(e.target.value)}
            />
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? "▾ 收起高级选项" : "▸ 高级选项"}
          </button>

          {showAdvanced && (
            <div className="space-y-2 animate-in fade-in">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  额外上下文
                </Label>
                <Textarea
                  className="h-14 text-[13px] resize-none"
                  placeholder="补充说明..."
                  value={aiContext}
                  onChange={(e) => onContextChange(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">
                  注入上下文 · 预估 {formatTokens(contextTokenCount)} tokens
                </Label>
                <div className="flex flex-wrap gap-1">
                  {AI_ASSET_OPTS.map(({ k, l }) => (
                    <label
                      key={k}
                      className={`text-[11px] px-2 py-0.5 rounded-full cursor-pointer transition-colors border ${
                        aiAssets[k]
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={aiAssets[k] ?? true}
                        onChange={(e) => onAssetsChange({ ...aiAssets, [k]: e.target.checked })}
                      />
                      {l}
                    </label>
                  ))}
                </div>
              </div>

              {contextPreview && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">上下文预览</Label>
                  <div className="text-[10px] text-muted-foreground/60 leading-relaxed bg-muted/20 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap break-all">
                    {contextPreview}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Generate button */}
          <div className="flex gap-2">
            <Button
              className="flex-1 h-8 text-xs transition-all duration-200 hover:shadow-md active:scale-[0.97]"
              onClick={onGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5 mr-1" />
              )}
              {generating ? "生成中..." : `${active.icon} ${active.label}`}
            </Button>
            {generating && (
              <Button variant="outline" size="sm" className="h-8 animate-scale-in" onClick={onCancel}>
                <StopCircle className="w-3.5 h-3.5 mr-1" />取消
              </Button>
            )}
          </div>

          {/* Output */}
          {streamingContent && (
            <div className="rounded-lg border bg-card/50 p-3 animate-slide-up">
              <div className="text-[11px] font-medium mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 animate-pulse-glow" />AI 输出
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {streamingContent.length} 字符 · ~{formatTokens(estimateTokens(streamingContent))} tokens
                </span>
              </div>
              <div className="text-[13px] whitespace-pre-wrap leading-relaxed max-h-[280px] overflow-y-auto prose-sm scroll-thin">
                {streamingContent}
                {generating && <span className="cursor-typing" />}
              </div>
              {!generating && (
                <div className="mt-2 flex gap-1.5 flex-wrap animate-slide-up">
                  <Tooltip>
                    <TooltipTrigger>
                      <Button variant="outline" size="sm" className="text-[11px] h-7 transition-all duration-200 hover:scale-105 active:scale-95"
                        onClick={() => { navigator.clipboard.writeText(streamingContent); toast.success("已复制"); }}>
                        复制
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>复制到剪贴板</TooltipContent>
                  </Tooltip>
                  {(["draft", "continue"].includes(workflow)) && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Button variant="outline" size="sm" className="text-[11px] h-7 transition-all duration-200 hover:scale-105 active:scale-95" onClick={onInsert}>
                          插入正文
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>追加到编辑器光标处</TooltipContent>
                    </Tooltip>
                  )}
                  {(["polish", "expand", "shorten", "rewrite"].includes(workflow)) && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Button variant="outline" size="sm" className="text-[11px] h-7 transition-all duration-200 hover:scale-105 active:scale-95" onClick={onInsert}>
                          替换选中
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>替换编辑器选中区域（无选中则替换全文）</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger>
                      <Button variant="outline" size="sm" className="text-[11px] h-7 transition-all duration-200 hover:scale-105 active:scale-95"
                        onClick={onRetry}>
                        重试
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>重新生成</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
