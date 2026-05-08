"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
  useRef,
} from "react";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  Quote, List, ListOrdered, Minus, Undo2, Redo2,
  Maximize2, Minimize2, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { countWords } from "@/lib/word-count";

// ─── Helpers ───
function htmlFromText(text: string): string {
  if (!text) return "<p></p>";
  if (/^<[a-zA-Z]/.test(text.trim())) return text;
  return text
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function TBBtn({
  onClick, active, disabled, tooltip, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  tooltip?: string;
  children: React.ReactNode;
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
    >
      {children}
    </button>
  );
  if (!tooltip) return btn;
  return (
    <Tooltip>
      <TooltipTrigger>{btn}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

// ─── Props & Ref ───
interface TiptapEditorProps {
  initialContent: string;
  placeholder?: string;
  editable?: boolean;
  onChange?: (html: string, text: string) => void;
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
  getHTML: () => string;
  getText: () => string;
  focus: () => void;
}

export const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  function TiptapEditor(
    { initialContent, placeholder, editable = true, onChange, className, suggestion, onAcceptSuggestion, onDismissSuggestion, onPause },
    ref
  ) {
    const [focusMode, setFocusMode] = useState(false);
    const pauseTimer = useRef<NodeJS.Timeout | null>(null);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Placeholder.configure({ placeholder: placeholder || "开始写作..." }),
      ],
      content: htmlFromText(initialContent),
      editable,
      immediatelyRender: false,
      onUpdate: ({ editor: ed }) => {
        onChange?.(ed.getHTML(), ed.getText());
        // Debounced inline AI suggestion
        if (pauseTimer.current) clearTimeout(pauseTimer.current);
        if (onPause) {
          pauseTimer.current = setTimeout(() => {
            const text = ed.getText();
            if (text.length >= 50) {
              onPause(text.slice(-500));
            }
          }, 1500);
        }
      },
      editorProps: {
        attributes: {
          class: "prose prose-sm max-w-none focus:outline-none",
        },
      },
    });

    // Cleanup pause timer on unmount
    useEffect(() => {
      return () => { if (pauseTimer.current) clearTimeout(pauseTimer.current); };
    }, []);

    // Suggestion keyboard handler: Tab to accept, Escape to dismiss
    useEffect(() => {
      if (!suggestion || !editor) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Tab" && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          onAcceptSuggestion?.();
        }
        if (e.key === "Escape" && !focusMode) {
          e.preventDefault();
          onDismissSuggestion?.();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [suggestion, editor, focusMode, onAcceptSuggestion, onDismissSuggestion]);

    // Focus mode: Esc to exit
    useEffect(() => {
      if (!focusMode) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setFocusMode(false);
          editor?.commands.focus();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [focusMode, editor]);

    // Focus mode: set editor content area reference
    useEffect(() => {
      if (!focusMode || !editor) return;
      editor.commands.focus();
    }, [focusMode, editor]);

    useImperativeHandle(ref, () => ({
      insertContent: (html: string) => {
        editor?.commands.insertContent(html);
      },
      appendText: (text: string) => {
        const html = htmlFromText(text);
        const pos = editor?.state.doc.content.size || 0;
        editor?.commands.insertContentAt(pos, html);
      },
      replaceContent: (content: string) => {
        editor?.commands.setContent(htmlFromText(content));
      },
      getHTML: () => editor?.getHTML() || "",
      getText: () => editor?.getText() || "",
      focus: () => editor?.commands.focus(),
    }), [editor]);

    // ─── Word count ───
    const wordCount = editor ? countWords(editor.getText()) : 0;

    // ─── Toolbar ───
    const toolbar = (
      <TooltipProvider delay={400}>
        <div className="flex items-center gap-0.5">
          <TBBtn tooltip="粗体" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")}>
            <Bold className="w-3.5 h-3.5" />
          </TBBtn>
          <TBBtn tooltip="斜体" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")}>
            <Italic className="w-3.5 h-3.5" />
          </TBBtn>
          <TBBtn tooltip="删除线" onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike")}>
            <Strikethrough className="w-3.5 h-3.5" />
          </TBBtn>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-0.5">
          <TBBtn tooltip="标题 1" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })}>
            <Heading1 className="w-3.5 h-3.5" />
          </TBBtn>
          <TBBtn tooltip="标题 2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })}>
            <Heading2 className="w-3.5 h-3.5" />
          </TBBtn>
          <TBBtn tooltip="标题 3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })}>
            <Heading3 className="w-3.5 h-3.5" />
          </TBBtn>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-0.5">
          <TBBtn tooltip="引用块" onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")}>
            <Quote className="w-3.5 h-3.5" />
          </TBBtn>
          <TBBtn tooltip="无序列表" onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")}>
            <List className="w-3.5 h-3.5" />
          </TBBtn>
          <TBBtn tooltip="有序列表" onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")}>
            <ListOrdered className="w-3.5 h-3.5" />
          </TBBtn>
          <TBBtn tooltip="分割线" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
            <Minus className="w-3.5 h-3.5" />
          </TBBtn>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-0.5">
          <TBBtn tooltip="撤销" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()}>
            <Undo2 className="w-3.5 h-3.5" />
          </TBBtn>
          <TBBtn tooltip="重做" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()}>
            <Redo2 className="w-3.5 h-3.5" />
          </TBBtn>
        </div>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground tabular-nums mr-2">
          {wordCount.toLocaleString()} 字
        </span>
        <TBBtn tooltip={focusMode ? "退出专注模式" : "专注模式"} onClick={() => setFocusMode(!focusMode)} active={focusMode}>
          {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </TBBtn>
      </TooltipProvider>
    );

    if (!editor) {
      return <div className="h-full bg-muted/10 animate-pulse rounded" />;
    }

    const editorBody = (
      <>
        {/* Fixed toolbar */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 bg-background/80 backdrop-blur-sm shrink-0 overflow-x-auto">
          {toolbar}
        </div>

        {/* Editor content */}
        <div className="flex-1 overflow-auto relative">
          <EditorContent
            editor={editor}
            className="min-h-full px-6 lg:px-8 pt-6 pb-32 font-writing text-[15px] sm:text-[16px] lg:text-[17px] xl:text-[18px] leading-[1.9] tracking-[0.01em]"
          />
          {/* Inline AI suggestion */}
          {suggestion && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 max-w-2xl w-[calc(100%-3rem)] glass-heavy border border-primary/15 rounded-xl shadow-2xl p-3.5 animate-slide-up">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 animate-pulse-glow">
                  <Sparkles className="w-3 h-3 text-primary/60" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-muted-foreground/80 leading-relaxed line-clamp-3 font-writing">
                    {suggestion}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2.5 text-[10px] text-muted-foreground/40">
                <kbd className="px-1.5 py-0.5 rounded-md bg-muted/80 text-[10px] font-mono font-medium text-foreground/50 border border-border/30">Tab</kbd>
                <span>采纳续写</span>
                <span className="text-muted-foreground/15">·</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-muted/80 text-[10px] font-mono font-medium text-foreground/50 border border-border/30">Esc</kbd>
                <span>忽略</span>
              </div>
            </div>
          )}
        </div>
      </>
    );

    // ─── Focus mode ───
    if (focusMode) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background animate-scale-in">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          {/* Minimal toolbar */}
          <div className="relative flex items-center gap-1 px-4 py-1.5 border-b border-border/20 overflow-x-auto glass">
            {toolbar}
          </div>
          {/* Centered editor */}
          <div className="relative flex-1 overflow-auto flex justify-center scroll-thin">
            <div className="w-full max-w-3xl animate-float-in">
              <EditorContent
                editor={editor}
                className="min-h-full px-8 pt-10 pb-48 font-writing text-[17px] sm:text-[18px] lg:text-[19px] leading-[2] tracking-[0.01em]"
              />
            </div>
          </div>
          {/* Hint */}
          <div className="relative bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground/30 select-none animate-breathe">
            专注模式 · Esc 退出 · {wordCount.toLocaleString()} 字
          </div>
        </div>
      );
    }

    return (
      <div className={cn("flex flex-col h-full", className)}>
        {editorBody}
      </div>
    );
  }
);
