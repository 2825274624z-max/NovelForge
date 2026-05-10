"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Save, Loader2, FileText, BookOpen, Check } from "lucide-react";
import { toast } from "sonner";

interface ChapterRef { id: string; title: string; order: number; status: string; wordCount: number; summary: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outline: string;
  chapters: ChapterRef[];
  onSave: (outline: string) => Promise<void>;
  onGenerate: () => Promise<string>;
  onNavigateChapter?: (chapterId: string) => void;
}

export function OutlineSheet({ open, onOpenChange, outline, chapters, onSave, onGenerate, onNavigateChapter }: Props) {
  const [content, setContent] = useState(outline);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<"edit" | "structure">("structure");

  useEffect(() => { if (open) setContent(outline); }, [open, outline]);

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

  const sorted = [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

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
                <button onClick={() => setView("structure")} className={`px-4 py-1.5 rounded-md ${view === "structure" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
                  结构视图
                </button>
                <button onClick={() => setView("edit")} className={`px-4 py-1.5 rounded-md ${view === "edit" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>
                  编辑模式
                </button>
              </div>
              <Button variant="outline" size="sm" className="text-sm h-8 px-4" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                AI 生成
              </Button>
              <Button size="sm" className="text-sm h-8 px-4" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-1.5" />保存
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {view === "structure" ? (
            <>
              {/* 左侧章节树 */}
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
                    {sorted.length === 0 && (
                      <p className="text-sm text-muted-foreground/40 text-center py-16">暂无章节</p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* 右侧大纲预览 */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b text-sm text-muted-foreground font-medium shrink-0">大纲内容</div>
                <ScrollArea className="flex-1">
                  {outline ? (
                    <div className="p-6 text-sm whitespace-pre-wrap font-writing leading-relaxed">
                      {outline}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground/30 text-sm">
                      点击「AI 生成」或切换到编辑模式手动编写
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          ) : (
            /* 编辑模式 */
            <div className="flex-1 flex flex-col p-4 gap-3">
              <Textarea
                className="flex-1 text-sm font-writing leading-relaxed resize-none min-h-0"
                placeholder={`# 故事大纲\n\n## 主线\n一句话概括故事核心...\n\n## 三幕结构\n### 第一幕：开端\n...\n### 第二幕：发展\n...\n### 第三幕：结局\n...\n\n## 卷/篇章规划\n### 第一卷\n第1-X章：...\n\n## 主要情节节点\n1. ...\n2. ...`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 border-t text-center text-xs text-muted-foreground/40 shrink-0">
          大纲是小说蓝图 · AI 生成后建议人工审查调整
        </div>
      </DialogContent>
    </Dialog>
  );
}
