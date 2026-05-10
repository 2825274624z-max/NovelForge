"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Save, Loader2, FileText, BookOpen, Check, Send, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

interface ChapterRef { id: string; title: string; order: number; status: string; wordCount: number; summary: string; }
interface ChatMessage { role: "user" | "ai"; content: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outline: string;
  chapters: ChapterRef[];
  onSave: (outline: string) => Promise<void>;
  onGenerate: () => Promise<string>;
  onNavigateChapter?: (chapterId: string) => void;
  aiConfig: { provider: string; model: string; baseUrl: string; apiKey: string; temperature: number; maxTokens: number };
  onExtractAssets: () => void;
  extractingAssets: boolean;
  projectId: string;
  existingCharacters?: { name: string; identity?: string; personality?: string }[];
  existingWorldItems?: { title: string; content?: string }[];
}

const QUICK_STEPS = [
  { label: "主线", prompt: "请生成故事主线（一句话概括，含主角、核心冲突、最终目标）" },
  { label: "三幕", prompt: "请生成三幕结构（开端-发展-高潮-结局），每幕2-3句话" },
  { label: "情节", prompt: "请生成主要情节节点，至少8个关键转折点" },
  { label: "分卷", prompt: "请将故事分为3-5卷，每卷标注：卷名/章节范围/核心冲突/结局方向" },
  { label: "角色", prompt: "请为主要角色设计详细信息：姓名/身份/性格/目标/背景故事/人物弧光" },
  { label: "世界观", prompt: "请设计世界观：核心规则(3-5条)/势力分布/历史背景/特殊设定" },
  { label: "冲突", prompt: "请详细设计核心冲突（内在冲突+外在冲突）" },
  { label: "主题", prompt: "请提炼小说的主题立意和深层命题" },
];

export function OutlineSheet({ open, onOpenChange, outline, chapters, onSave, onGenerate, onNavigateChapter, aiConfig, onExtractAssets, extractingAssets, projectId, existingCharacters, existingWorldItems }: Props) {
  const [content, setContent] = useState(outline);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<"structure" | "edit" | "chat">("structure");
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatGenerating, setChatGenerating] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { if (open) setContent(outline); }, [open, outline]);
  useEffect(() => { chatScrollRef.current?.scrollTo(0, chatScrollRef.current.scrollHeight); }, [chatMessages]);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(content); toast.success("大纲已保存"); } catch { toast.error("保存失败"); }
    setSaving(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try { const result = await onGenerate(); setContent(result); toast.success("大纲已生成"); setView("edit"); }
    catch { toast.error("生成失败"); }
    setGenerating(false);
  };

  // ── Chat: send message ──
  const handleChatSend = async (prompt?: string) => {
    const msg = prompt || chatInput.trim();
    if (!msg || chatGenerating) return;
    if (!aiConfig.provider || !aiConfig.model) { toast.error("请先配置 AI"); return; }

    setChatInput("");
    const userMsg: ChatMessage = { role: "user", content: msg };
    const updated = [...chatMessages, userMsg];
    setChatMessages([...updated, { role: "ai", content: "" }]);

    setChatGenerating(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const assetCtx: string[] = [];
      if (existingCharacters?.length) assetCtx.push(`已有角色：${existingCharacters.map((c) => `${c.name}${c.identity ? `(${c.identity})` : ""}${c.personality ? ` - ${c.personality}` : ""}`).join("；")}`);
      if (existingWorldItems?.length) assetCtx.push(`已有世界观：${existingWorldItems.map((w) => `${w.title}${w.content ? `(${w.content.slice(0, 100)})` : ""}`).join("；")}`);

      const ctx = [
        `当前大纲：\n${content || "（空）"}`,
        ...assetCtx,
        `对话历史：\n${chatMessages.slice(-6).map((m) => `${m.role === "user" ? "作者" : "AI"}: ${m.content.slice(0, 300)}`).join("\n")}`,
      ].join("\n\n");

      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiConfig.provider, model: aiConfig.model, baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey,
          temperature: 0.5, maxTokens: 4000, workflow: "outline-chat", message: msg, context: ctx,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(await res.text());

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setChatMessages([...updated, { role: "ai", content: result }]);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      toast.error(`生成失败: ${e instanceof Error ? e.message : ""}`);
    } finally {
      setChatGenerating(false);
      abortRef.current = null;
    }
  };

  const handleApplyToOutline = (aiContent: string) => {
    setContent((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n\n${aiContent}` : aiContent;
    });
    toast.success("已应用到左侧");
  };

  const sorted = [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const lastAIMsg = [...chatMessages].reverse().find((m) => m.role === "ai");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-full w-[98vw] h-[98vh] p-0 flex flex-col gap-0 rounded-xl">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> 故事大纲
            </DialogTitle>
            <div className="flex items-center gap-3">
              <div className="flex bg-muted rounded-lg p-0.5 text-sm">
                {(["structure", "edit", "chat"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-4 py-1.5 rounded-md ${view === v ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
                    {v === "structure" ? "结构视图" : v === "edit" ? "编辑" : "AI 对话"}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="text-sm h-8 px-4" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                快速生成
              </Button>
              <Button variant="outline" size="sm" className="text-sm h-8 px-4" onClick={onExtractAssets} disabled={extractingAssets || !outline.trim() || !aiConfig.provider}>
                {extractingAssets ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                提取资产
              </Button>
              <Button size="sm" className="text-sm h-8 px-4" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1.5" />保存
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* ── Structure View ── */}
          {view === "structure" && (
            <>
              <div className="w-80 border-r bg-muted/20 flex flex-col shrink-0">
                <div className="px-4 py-3 border-b text-sm text-muted-foreground font-medium">
                  章节结构 ({sorted.length} 章)
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-1">
                    {sorted.map((ch, i) => (
                      <div key={ch.id}
                        onClick={() => onNavigateChapter?.(ch.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg text-sm group ${onNavigateChapter ? "cursor-pointer hover:bg-muted/60" : ""}`}>
                        <span className="text-muted-foreground/60 w-6 text-right font-mono text-xs shrink-0">{i + 1}</span>
                        <FileText className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                        <span className="truncate flex-1 font-medium">{ch.title}</span>
                        <span className="text-xs text-muted-foreground/60 shrink-0 tabular-nums">{ch.wordCount} 字</span>
                        {ch.summary && <Check className="w-4 h-4 text-emerald-500/60 shrink-0" />}
                      </div>
                    ))}
                    {sorted.length === 0 && <p className="text-sm text-muted-foreground/40 text-center py-16">暂无章节</p>}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b text-sm text-muted-foreground font-medium shrink-0">大纲内容</div>
                <ScrollArea className="flex-1">
                  {outline ? (
                    <div className="p-6 text-sm whitespace-pre-wrap font-writing leading-relaxed">{outline}</div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground/30 text-sm">
                      点击「快速生成」或切换到「AI 对话」模式逐步构建
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          )}

          {/* ── Chat View ── */}
          {view === "chat" && (
            <>
              {/* Left: outline editor */}
              <div className="w-[45%] border-r flex flex-col shrink-0">
                <div className="px-4 py-2.5 border-b text-sm text-muted-foreground font-medium shrink-0 flex items-center justify-between">
                  大纲文本
                  {lastAIMsg && (
                    <button onClick={() => handleApplyToOutline(lastAIMsg.content)}
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ArrowLeftRight className="w-3 h-3" />应用最新回复
                    </button>
                  )}
                </div>
                <Textarea
                  className="flex-1 text-sm font-writing leading-relaxed resize-none min-h-0 border-0 rounded-none"
                  placeholder={`在大纲文本中编辑，或在右侧与 AI 对话生成...\n\n# 故事大纲\n\n## 主线\n...\n\n## 三幕结构\n...`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              {/* Right: chat panel */}
              <div className="flex-1 flex flex-col bg-muted/10">
                <div className="px-4 py-2.5 border-b text-sm text-muted-foreground font-medium shrink-0">
                  AI 大纲助手
                </div>
                <ScrollArea className="flex-1" ref={chatScrollRef}>
                  <div className="p-4 space-y-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-16 text-muted-foreground/50">
                        <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">描述你想写的故事</p>
                        <p className="text-xs mt-1">AI 将逐步协助你构建大纲</p>
                        <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                          {QUICK_STEPS.map((s) => (
                            <button key={s.label} onClick={() => handleChatSend(s.prompt)}
                              className="text-xs px-3 py-1.5 rounded-full bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                              ✦ {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border shadow-sm"
                        }`}>
                          <div className="whitespace-pre-wrap leading-relaxed">{m.content || (chatGenerating && m.role === "ai" ? "..." : "")}</div>
                          {m.role === "ai" && m.content && !chatGenerating && (
                            <button onClick={() => handleApplyToOutline(m.content)}
                              className="text-xs text-primary hover:underline mt-2 flex items-center gap-1">
                              <ArrowLeftRight className="w-3 h-3" />应用到左侧
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {chatGenerating && chatMessages[chatMessages.length - 1]?.role === "ai" && !chatMessages[chatMessages.length - 1]?.content && (
                      <div className="flex justify-start">
                        <div className="bg-background border shadow-sm rounded-2xl px-4 py-3 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Quick steps + input */}
                <div className="p-3 border-t bg-background shrink-0 space-y-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {QUICK_STEPS.map((s) => (
                      <button key={s.label} onClick={() => handleChatSend(s.prompt)}
                        disabled={chatGenerating}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                        {s.label}
                      </button>
                    ))}
                    {chatGenerating && (
                      <button onClick={() => abortRef.current?.abort()}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20">
                        停止
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      className="flex-1 text-sm h-9"
                      placeholder="输入你的想法，如：主角应该有一个隐藏身份..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                    />
                    <Button size="sm" className="h-9 px-4" onClick={() => handleChatSend()} disabled={chatGenerating || !chatInput.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Edit View ── */}
          {view === "edit" && (
            <div className="flex-1 flex flex-col p-4 gap-3">
              <Textarea
                className="flex-1 text-sm font-writing leading-relaxed resize-none min-h-0"
                placeholder={`# 故事大纲\n\n## 主线\n一句话概括故事核心...\n\n## 三幕结构\n### 第一幕：开端\n...\n### 第二幕：发展\n...\n### 第三幕：结局\n...`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 border-t text-center text-xs text-muted-foreground/40 shrink-0">
          大纲是小说蓝图 · AI 对话模式支持逐步协作构建
        </div>
      </DialogContent>
    </Dialog>
  );
}
