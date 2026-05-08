"use client";

import { useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  chapterTitle: string;
  chapterContent: string;
  wordCount: number;
  saving: boolean;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
}

export function EditorPanel({
  chapterTitle, chapterContent, wordCount, saving,
  onTitleChange, onContentChange,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ensure textarea fills available space and handles scroll properly
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const resize = () => {
      el.style.height = "auto";
      el.style.height = `${Math.max(el.scrollHeight, window.innerHeight - 200)}px`;
    };
    resize();
    el.addEventListener("input", resize);
    window.addEventListener("resize", resize);
    return () => {
      el.removeEventListener("input", resize);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background">
      {/* Chapter title */}
      <div className="px-8 pt-6 pb-3 border-b border-border/30">
        <input
          className="w-full text-xl lg:text-[22px] xl:text-2xl font-bold bg-transparent border-0 outline-none placeholder:text-muted-foreground/25 font-sans"
          placeholder="章节标题"
          value={chapterTitle}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-hidden">
        <Textarea
          ref={textareaRef}
          className="w-full border-0 resize-none focus-visible:ring-0 text-[15px] sm:text-[16px] lg:text-[17px] xl:text-[18px] leading-[1.9] tracking-[0.01em] pt-6 pb-32 px-6 lg:px-8 font-writing placeholder:text-muted-foreground/20"
          style={{
            fontFamily: "'Georgia', 'Noto Serif SC', 'Source Han Serif SC', serif",
            minHeight: "calc(100vh - 210px)",
          }}
          placeholder="开始写作..."
          value={chapterContent}
          onChange={(e) => onContentChange(e.target.value)}
        />
      </div>

      {/* Status bar */}
      <div className="h-7 border-t border-border/30 flex items-center px-4 gap-3 shrink-0">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {wordCount.toLocaleString()} 字
        </span>
        {saving && (
          <span className="text-[10px] text-muted-foreground/60 animate-pulse">
            保存中...
          </span>
        )}
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground/40">
          Ctrl+S · 自动保存
        </span>
      </div>
    </div>
  );
}
