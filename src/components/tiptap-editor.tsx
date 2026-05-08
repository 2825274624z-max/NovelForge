"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { countWords } from "@/lib/word-count";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  Quote, List, ListOrdered, Minus, Undo2, Redo2,
  Maximize2, Minimize2, Sparkles, Save, Keyboard,
} from "lucide-react";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";

// ─── 纯文本 → HTML ───
function toHtml(text: string): string {
  if (!text) return "<p></p>";
  if (/^<[a-zA-Z]/.test(text.trim())) return text;
  return text.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}

// ─── Props ───
interface TiptapEditorProps {
  initialContent: string;
  placeholder?: string;
  editable?: boolean;
  onChange?: (html: string, text: string) => void;
  onSave?: () => void;
  className?: string;
  suggestion?: string | null;
  onAcceptSuggestion?: () => void;
  onDismissSuggestion?: () => void;
  onPause?: (context: string) => void;
}

export interface TiptapEditorHandle {
  insertContent: (html: string) => void;
  appendText: (text: string) => void;
  replaceContent: (html: string) => void;
  replaceSelection: (html: string) => void;
  getHTML: () => string;
  getText: () => string;
  getSelection: () => { text: string; from: number; to: number } | null;
  focus: () => void;
}

// ─── 工具栏按钮（带可选 Tooltip） ───
function TB({
  onClick, active, disabled, tip, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  tip?: string; children: React.ReactNode;
}) {
  const btn = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded hover:bg-muted transition-all duration-150 hover:scale-110 active:scale-90",
        active && "bg-muted text-primary shadow-sm",
        disabled && "opacity-30"
      )}
    >{children}</button>
  );
  if (!tip) return btn;
  return <Tooltip><TooltipTrigger render={btn} /><TooltipContent>{tip}</TooltipContent></Tooltip>;
}

export const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  function TiptapEditor({
    initialContent, placeholder, editable = true, onChange, onSave,
    className, suggestion, onAcceptSuggestion, onDismissSuggestion, onPause,
  }, ref) {
    const [focusMode, setFocusMode] = useState(false);
    const [shortcutOpen, setShortcutOpen] = useState(false);
    const [clientReady, setClientReady] = useState(false);
    const pauseRef = useRef<NodeJS.Timeout | null>(null);
    const kbBtnRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => { setClientReady(true); }, []);

    // 外点击关闭快捷键面板
    useEffect(() => {
      if (!shortcutOpen) return;
      const onDown = (e: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShortcutOpen(false);
      };
      window.addEventListener("mousedown", onDown);
      return () => window.removeEventListener("mousedown", onDown);
    }, [shortcutOpen]);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Placeholder.configure({ placeholder: placeholder || "开始写作..." }),
      ],
      content: toHtml(initialContent),
      editable,
      immediatelyRender: false,
      onUpdate: ({ editor: ed }) => {
        onChange?.(ed.getHTML(), ed.getText());
        if (pauseRef.current) clearTimeout(pauseRef.current);
        if (onPause) {
          pauseRef.current = setTimeout(() => {
            const t = ed.getText();
            if (t.length >= 50) onPause(t.slice(-500));
          }, 1500);
        }
      },
      editorProps: { attributes: { class: "prose prose-sm max-w-none focus:outline-none" } },
    });

    useEffect(() => () => { if (pauseRef.current) clearTimeout(pauseRef.current); }, []);

    // AI 续写快捷键
    useEffect(() => {
      if (!suggestion || !editor) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Tab" && !e.ctrlKey && !e.metaKey) { e.preventDefault(); onAcceptSuggestion?.(); }
        if (e.key === "Escape" && !focusMode) { e.preventDefault(); onDismissSuggestion?.(); }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [suggestion, editor, focusMode, onAcceptSuggestion, onDismissSuggestion]);

    // 专注模式 Esc
    useEffect(() => {
      if (!focusMode) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") { setFocusMode(false); editor?.commands.focus(); }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [focusMode, editor]);

    useEffect(() => { if (focusMode && editor) editor.commands.focus(); }, [focusMode, editor]);

    useImperativeHandle(ref, () => ({
      insertContent: (h: string) => editor?.commands.insertContent(h),
      appendText: (t: string) => {
        const pos = editor?.state.doc.content.size || 0;
        editor?.commands.insertContentAt(pos, toHtml(t));
      },
      replaceContent: (c: string) => editor?.commands.setContent(toHtml(c)),
      replaceSelection: (html: string) => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        editor.chain().focus().deleteRange({ from, to }).insertContent(html).run();
      },
      getHTML: () => editor?.getHTML() || "",
      getText: () => editor?.getText() || "",
      getSelection: () => {
        if (!editor) return null;
        const { from, to, empty } = editor.state.selection;
        if (empty) return null;
        return { text: editor.state.doc.textBetween(from, to), from, to };
      },
      focus: () => editor?.commands.focus(),
    }), [editor]);

    if (!clientReady || !editor) return <div className="h-full bg-muted/10 animate-pulse rounded" />;

    const wc = countWords(editor.getText());
    const ch = () => editor.chain().focus();

    const toolbar = (
      <TooltipProvider delay={400}>
        <div className="flex items-center gap-0.5">
          <TB tip="粗体 · Ctrl+B" onClick={() => ch().toggleBold().run()} active={editor.isActive("bold")}><Bold className="w-3.5 h-3.5" /></TB>
          <TB tip="斜体 · Ctrl+I" onClick={() => ch().toggleItalic().run()} active={editor.isActive("italic")}><Italic className="w-3.5 h-3.5" /></TB>
          <TB tip="删除线" onClick={() => ch().toggleStrike().run()} active={editor.isActive("strike")}><Strikethrough className="w-3.5 h-3.5" /></TB>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-0.5">
          <TB tip="标题 1" onClick={() => ch().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}><Heading1 className="w-3.5 h-3.5" /></TB>
          <TB tip="标题 2" onClick={() => ch().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}><Heading2 className="w-3.5 h-3.5" /></TB>
          <TB tip="标题 3" onClick={() => ch().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}><Heading3 className="w-3.5 h-3.5" /></TB>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-0.5">
          <TB tip="引用块" onClick={() => ch().toggleBlockquote().run()} active={editor.isActive("blockquote")}><Quote className="w-3.5 h-3.5" /></TB>
          <TB tip="无序列表" onClick={() => ch().toggleBulletList().run()} active={editor.isActive("bulletList")}><List className="w-3.5 h-3.5" /></TB>
          <TB tip="有序列表" onClick={() => ch().toggleOrderedList().run()} active={editor.isActive("orderedList")}><ListOrdered className="w-3.5 h-3.5" /></TB>
          <TB tip="分割线" onClick={() => ch().setHorizontalRule().run()}><Minus className="w-3.5 h-3.5" /></TB>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-0.5">
          <TB tip="撤销 · Ctrl+Z" onClick={() => ch().undo().run()} disabled={!editor.can().undo()}><Undo2 className="w-3.5 h-3.5" /></TB>
          <TB tip="重做 · Ctrl+Shift+Z" onClick={() => ch().redo().run()} disabled={!editor.can().redo()}><Redo2 className="w-3.5 h-3.5" /></TB>
        </div>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground tabular-nums mr-1">{wc.toLocaleString()} 字</span>
        {onSave && <TB tip="保存 · Ctrl+S" onClick={onSave}><Save className="w-3.5 h-3.5" /></TB>}
        <Tooltip>
          <TooltipTrigger
            render={
              <button type="button" ref={kbBtnRef}
                onClick={() => setShortcutOpen((v) => !v)}
                className={cn("p-1.5 rounded hover:bg-muted transition-all duration-150 hover:scale-110 active:scale-90", shortcutOpen && "bg-muted text-primary shadow-sm")}>
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            }
          />
          <TooltipContent>快捷键</TooltipContent>
        </Tooltip>
        {shortcutOpen && createPortal(
          <div ref={panelRef} className="fixed z-[60] w-56 rounded-lg border bg-popover shadow-xl p-3 animate-in fade-in zoom-in-95 duration-150"
            style={{ top: (kbBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 6, right: window.innerWidth - (kbBtnRef.current?.getBoundingClientRect().right ?? 0) }}>
            <div className="text-[11px] font-semibold mb-2">键盘快捷键</div>
            <div className="space-y-1 text-[11px]">
              {[["Ctrl+S", "保存"], ["Ctrl+N", "新建章节"], ["Ctrl+Shift+A", "AI 面板"], ["Ctrl+B", "粗体"], ["Ctrl+I", "斜体"], ["Ctrl+Z", "撤销"], ["Ctrl+Shift+Z", "重做"], ["Tab", "采纳续写"]].map(([k, d]) => (
                <div key={k} className="flex justify-between"><span className="text-muted-foreground">{d}</span><kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border">{k}</kbd></div>
              ))}
            </div>
          </div>,
          document.body
        )}
        <TB tip={focusMode ? "退出专注" : "专注模式"} onClick={() => setFocusMode(!focusMode)} active={focusMode}>
          {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </TB>
      </TooltipProvider>
    );

    const contentClass = focusMode
      ? "min-h-full px-8 pt-10 pb-48 font-writing text-[17px] sm:text-[18px] lg:text-[19px] leading-[2] tracking-[0.01em]"
      : "min-h-full px-6 lg:px-8 pt-6 pb-32 font-writing text-[15px] sm:text-[16px] lg:text-[17px] xl:text-[18px] leading-[1.9] tracking-[0.01em]";

    const editorBody = (
      <>
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 bg-background/80 backdrop-blur-sm shrink-0 overflow-x-auto">
          {toolbar}
        </div>
        <div className="flex-1 overflow-auto relative">
          <EditorContent editor={editor} className={contentClass} />
          {suggestion && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 max-w-2xl w-[calc(100%-3rem)] glass-heavy border border-primary/15 rounded-xl shadow-2xl p-3.5 animate-slide-up">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 animate-pulse-glow">
                  <Sparkles className="w-3 h-3 text-primary/60" /></div>
                <p className="flex-1 text-[13px] text-muted-foreground/80 leading-relaxed line-clamp-3 font-writing">{suggestion}</p>
              </div>
              <div className="flex items-center gap-2 mt-2.5 text-[10px] text-muted-foreground/40">
                <kbd className="px-1.5 py-0.5 rounded bg-muted/80 text-[10px] font-mono border">Tab</kbd> 采纳
                <span className="text-muted-foreground/15">·</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted/80 text-[10px] font-mono border">Esc</kbd> 忽略
              </div>
            </div>
          )}
        </div>
      </>
    );

    if (focusMode) return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background animate-scale-in">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        {editorBody}
        <div className="relative bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground/30 select-none animate-breathe">
          专注模式 · Esc 退出 · {wc.toLocaleString()} 字</div>
      </div>
    );

    return <div className={cn("flex flex-col h-full", className)}>{editorBody}</div>;
  }
);
