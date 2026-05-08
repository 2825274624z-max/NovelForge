"use client";

import { useRef } from "react";
import { TiptapEditor, type TiptapEditorHandle } from "@/components/tiptap-editor";

interface Props {
  chapterTitle: string;
  chapterContent: string;
  wordCount: number;
  saving: boolean;
  onTitleChange: (v: string) => void;
  onContentChange: (html: string) => void;
  onSave: () => void;
  editorRef: React.RefObject<TiptapEditorHandle | null>;
  suggestion?: string | null;
  onAcceptSuggestion?: () => void;
  onDismissSuggestion?: () => void;
  onPause?: (context: string) => void;
}

export function EditorPanel({
  chapterTitle,
  chapterContent,
  wordCount,
  saving,
  onTitleChange,
  onContentChange,
  onSave,
  editorRef,
  suggestion,
  onAcceptSuggestion,
  onDismissSuggestion,
  onPause,
}: Props) {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background">
      {/* Chapter title */}
      <div className="px-6 lg:px-8 pt-5 pb-2 border-b border-border/30">
        <input
          className="w-full text-xl lg:text-[22px] xl:text-2xl font-bold bg-transparent border-0 outline-none placeholder:text-muted-foreground/25 font-sans transition-all duration-300 focus:translate-x-1"
          placeholder="章节标题"
          value={chapterTitle}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      {/* Rich text editor */}
      <TiptapEditor
        ref={editorRef}
        initialContent={chapterContent}
        placeholder="开始写作..."
        onChange={(html) => onContentChange(html)}
        onSave={onSave}
        suggestion={suggestion}
        onAcceptSuggestion={onAcceptSuggestion}
        onDismissSuggestion={onDismissSuggestion}
        onPause={onPause}
      />

      {/* Status bar */}
      <div className="h-7 border-t border-border/30 flex items-center px-4 gap-3 shrink-0 bg-background/50">
        <span className="text-[11px] text-muted-foreground tabular-nums transition-all duration-200">
          {wordCount.toLocaleString()} 字
        </span>
        {saving && (
          <span className="text-[10px] text-muted-foreground/60 animate-breathe">
            保存中...
          </span>
        )}
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground/30">
          Ctrl+S 保存 · Ctrl+N 新建章节 · Ctrl+Shift+A AI 面板
        </span>
      </div>
    </div>
  );
}
