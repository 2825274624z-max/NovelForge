"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileText,
  BookOpen,
  Loader2,
  Check,
  AlertCircle,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { parseNovelTxt, type ParsedNovel } from "@/lib/txt-parser";

export function ImportDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedNovel | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [dragover, setDragover] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [showChapters, setShowChapters] = useState(false);

  const processFile = useCallback((file: File) => {
    setError("");
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("仅支持 .txt 文件");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      const result = parseNovelTxt(text);
      if (!result || result.chapters.length === 0) {
        setError("未能识别章节。请确认 TXT 包含「第X章」或「Chapter X」等章节标题。");
        return;
      }
      setParsed(result);
      setTitle(result.title);
      setAuthor(result.author || "");
      setDescription(result.description);
      setError("");
    };
    reader.onerror = () => setError("文件读取失败，请重试");
    reader.readAsText(file, "UTF-8");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleImport = async () => {
    if (!parsed || !title.trim()) {
      toast.error("请输入书名");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), author: author.trim(), description: description.trim(), chapters: parsed.chapters }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      const { projectId, chapterCount } = await res.json();
      toast.success(`导入成功：${chapterCount} 章`);
      setOpen(false);
      router.push(`/projects/${projectId}`);
    } catch (e) {
      toast.error(`导入失败：${e instanceof Error ? e.message : "未知错误"}`);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setParsed(null);
    setTitle("");
    setAuthor("");
    setDescription("");
    setError("");
    setImporting(false);
    setShowChapters(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-xs h-7 sm:h-8 gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">导入 TXT</span>
          </Button>
        }
      />

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>导入 TXT 小说</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── 文件选择 ── */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              parsed
                ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                : dragover
                  ? "border-primary/50 bg-primary/[0.03]"
                  : "border-border/60 hover:border-primary/25 hover:bg-muted/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {parsed ? (
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
                <Check className="w-5 h-5" />
                已识别 {parsed.chapters.length} 个章节
                <span className="text-muted-foreground text-xs ml-1">
                  — 点击更换文件
                </span>
              </div>
            ) : (
              <>
                <Upload className="w-9 h-9 mx-auto mb-2 text-muted-foreground/35" />
                <p className="text-sm font-medium">点击或拖拽 TXT 文件</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  自动识别书名、作者、章节
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processFile(file);
              }}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* ── 书名 + 作者（解析后可自由编辑） ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">书名</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="小说标题"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">作者</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="可选"
                  className="h-9 text-sm pl-9"
                />
              </div>
            </div>
          </div>

          {/* ── 简介 ── */}
          <div className="space-y-1.5">
            <Label className="text-xs">简介</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="自动从 TXT 提取，可编辑"
              className="h-16 text-xs resize-y"
            />
          </div>

          {/* ── 章节预览 ── */}
          {parsed && (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setShowChapters(!showChapters)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                {showChapters ? "收起章节列表" : `查看 ${parsed.chapters.length} 个章节`}
                <span className="text-muted-foreground/50">
                  ({parsed.chapters.reduce((s, c) => s + c.content.length, 0).toLocaleString()} 字)
                </span>
              </button>
              {showChapters && (
                <ScrollArea className="h-40 rounded-lg border bg-muted/20 p-2">
                  <div className="space-y-0.5">
                    {parsed.chapters.map((ch, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-muted-foreground w-5 text-right shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-medium truncate">{ch.title}</span>
                        <span className="text-muted-foreground shrink-0 ml-auto tabular-nums">
                          {ch.content.length.toLocaleString()} 字
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* ── 导入按钮 ── */}
          <Button
            className="w-full h-10 text-sm gap-2"
            onClick={handleImport}
            disabled={!parsed || importing || !title.trim()}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                导入中...
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                导入到工作台{parsed ? `（${parsed.chapters.length} 章）` : ""}
              </>
            )}
          </Button>

          {!parsed && (
            <div className="text-[10px] text-muted-foreground/50 space-y-0.5 px-1">
              <p>支持: 「第X章」「Chapter X」「序章」「楔子」「番外」等</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
