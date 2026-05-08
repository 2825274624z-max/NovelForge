"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkles, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outline: string;
  onSave: (outline: string) => Promise<void>;
  onGenerate: () => Promise<string>;
}

export function OutlineSheet({ open, onOpenChange, outline, onSave, onGenerate }: Props) {
  const [content, setContent] = useState(outline);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 打开时同步外部值
  const handleOpenChange = (v: boolean) => {
    if (v) setContent(outline);
    onOpenChange(v);
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(content); toast.success("大纲已保存"); } catch { toast.error("保存失败"); }
    setSaving(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await onGenerate();
      setContent(result);
      toast.success("大纲已生成，请检查并保存");
    } catch { toast.error("生成失败"); }
    setGenerating(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-[calc(100vw-2rem)] sm:w-[450px] md:w-[550px] p-0 flex flex-col max-w-full">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> 故事大纲
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
          <Textarea
            className="flex-1 text-sm font-writing leading-relaxed resize-none min-h-[40vh]"
            placeholder={`# 故事大纲\n\n## 主线\n一句话概括故事核心...\n\n## 三幕结构\n### 第一幕：开端\n...\n### 第二幕：发展\n...\n### 第三幕：结局\n...\n\n## 主要情节节点\n1. ...\n2. ...\n\n## 人物弧光\n主角的成长轨迹...`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
              {generating ? "生成中..." : "AI 生成大纲"}
            </Button>
            <Button size="sm" className="flex-1 text-xs h-8" onClick={handleSave} disabled={saving}>
              <Save className="w-3.5 h-3.5 mr-1" />
              {saving ? "保存中..." : "保存大纲"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
