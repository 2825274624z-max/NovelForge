import { useState, useRef, useCallback, useMemo } from "react";
import { useAIStore } from "@/store/useStore";
import { estimateTokens, formatTokens } from "@/lib/token-count";
import { buildContextV4 } from "@/lib/ai/context-builder";
import type { TiptapEditorHandle } from "@/components/tiptap-editor";
import { toast } from "sonner";

interface ChapterItem {
  id: string; title: string; summary: string; stateJson: string; wordCount: number; order: number;
}

interface UseAIGenerationParams {
  projectForm: { description: string; worldView: string; writingReqs: string };
  projectBible: string;
  aiSettings: { provider: string; model: string; baseUrl: string; apiKey: string; temperature: number; maxTokens: number };
  assets: {
    characters: Record<string, string>[];
    worldItems: Record<string, string>[];
    locations: Record<string, string>[];
    orgs: Record<string, string>[];
    items: Record<string, string>[];
    fores: Record<string, string>[];
    timelines: Record<string, string>[];
  };
  chapters: ChapterItem[];
  currentChapterId: string | null;
  currentChapterContent: string;
  projectOutline: string;
  projectId: string;
  editorRef: React.RefObject<TiptapEditorHandle | null>;
  arcPlan: { title: string; summary: string; order: number } | null;
  taskCard: string | null;
}

function toHtml(text: string): string {
  return text.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}

export function useAIGeneration({
  projectForm, projectBible, aiSettings, assets, chapters, currentChapterId, currentChapterContent,
  projectOutline, projectId, editorRef, arcPlan, taskCard,
}: UseAIGenerationParams) {
  const { generating, streamingContent, setGenerating, setStreamingContent, setError } = useAIStore();
  const abortRef = useRef<AbortController | null>(null);

  const [workflow, setWorkflow] = useState("draft");
  const [aiMessage, setAiMessage] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [aiAssets, setAiAssets] = useState<Record<string, boolean>>({
    characters: true, world: true, locations: true, organizations: true, items: true, fore: true, timeline: true,
  });
  const lastSelection = useRef<string>("");
  const needsSelection = ["polish", "expand", "shorten", "rewrite", "deai"].includes(workflow);

  // ─── Context Builder v4 — 智能调度器 ───
  const buildContext = useCallback(() => {
    const activeFores = aiAssets.fore ? assets.fores.filter((f: any) => f.status !== "resolved") : [];
    return buildContextV4({
      bible: projectBible,
      arcPlan,
      taskCard,
      outline: projectOutline,
      description: projectForm.description,
      worldView: projectForm.worldView,
      writingReqs: projectForm.writingReqs,
      currentChapterContent,
      currentChapterTitle: chapters.find((c) => c.id === currentChapterId)?.title || "",
      chapters: chapters.map((c) => ({
        title: c.title, summary: c.summary, stateJson: c.stateJson, order: c.order,
      })),
      currentChapterId,
      foreshadowings: activeFores.map((f: any) => ({ title: f.title, description: f.description, status: f.status })),
      characters: aiAssets.characters ? assets.characters.map((c: any) => ({
        name: c.name, identity: c.identity, personality: c.personality,
      })) : [],
      worldItems: aiAssets.world ? assets.worldItems.map((w: any) => ({
        title: w.title, content: w.content,
      })) : [],
      locations: aiAssets.locations ? assets.locations.map((l: any) => ({
        name: l.name, description: l.description,
      })) : [],
      userContext: aiContext,
      maxTokens: aiSettings.maxTokens,
    });
  }, [projectBible, arcPlan, taskCard, projectOutline, projectForm, currentChapterContent,
    currentChapterId, chapters, aiAssets, assets, aiContext, aiSettings.maxTokens]);

  const contextCache = useMemo(() => buildContext(), [buildContext]);
  const contextTokenCount = estimateTokens(contextCache);
  // 提取上下文中的关键段落标题作为预览
  const contextPreview = useMemo(() => {
    const sections = contextCache.match(/【(.+?)】/g);
    if (!sections || sections.length === 0) return contextCache.slice(0, 200) + "…";
    return sections.map((s) => s.replace(/【|】/g, "")).join(" · ");
  }, [contextCache]);

  // 切换工作流时捕获选区（在焦点丢失前）
  const handleWorkflowChange = useCallback((v: string) => {
    setWorkflow(v);
    lastSelection.current = editorRef.current?.getSelection()?.text || "";
  }, [editorRef]);

  // ─── 生成 ───
  const handleGenerate = useCallback(async () => {
    if (!aiMessage && workflow !== "draft") { toast.error("请输入提示词"); return; }
    if (abortRef.current) { abortRef.current.abort(); return; }
    setGenerating(true); setStreamingContent(""); setError(null);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      let ctx = buildContext();

      // 获取记忆系统上下文（仅创作类工作流需要）
      if (["draft", "continue", "outline"].includes(workflow) && projectId && currentChapterId) {
        try {
          const currentCh = chapters.find((c) => c.id === currentChapterId);
          const chapterNum = currentCh?.order ?? chapters.length + 1;
          const memRes = await fetch(`/api/memory/context?projectId=${projectId}&chapterNum=${chapterNum}`);
          if (memRes.ok) {
            const mem = await memRes.json();
            if (mem.systemContext) {
              ctx = `【记忆系统上下文】\n${mem.systemContext}\n\n【项目上下文】\n${ctx}`;
            }
          }
        } catch { /* 记忆系统不可用时不阻断 */ }
      }

      // 文本处理类工作流：有选中→处理选中，无选中→处理全文
      // 续写工作流：始终传入当前章节内容
      let curContent = "";
      if (workflow === "continue") {
        curContent = editorRef.current?.getText() || "";
        if (!curContent.trim()) { toast.error("当前章节无内容，无法续写"); setGenerating(false); return; }
      } else if (needsSelection) {
        const sel = editorRef.current?.getSelection();
        curContent = sel?.text || lastSelection.current;
        if (!curContent.trim()) {
          curContent = editorRef.current?.getText() || "";
          if (!curContent.trim()) { toast.error("当前章节无内容"); setGenerating(false); return; }
        }
      }

      // draft 生成新章节：需要看到前一章的原文结尾，接住情绪和语感
      let prevChapterTail = "";
      if (workflow === "draft" && chapters.length > 0) {
        const sorted = [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const curIdx = sorted.findIndex((c) => c.id === currentChapterId);
        const prev = curIdx > 0 ? sorted[curIdx - 1] : sorted[sorted.length - 1];
        if (prev) {
          // 如果前章恰好是当前编辑器内容，直接用
          if (prev.id === currentChapterId) {
            prevChapterTail = (editorRef.current?.getText() || "").slice(-2000);
          } else {
            try {
              const r = await fetch(`/api/chapters?id=${prev.id}`);
              if (r.ok) {
                const d = await r.json();
                prevChapterTail = (d.content || "").slice(-2000);
              }
            } catch { /* 取不到不阻断 */ }
          }
          if (prevChapterTail) {
            ctx = `${ctx}\n\n【前章原文结尾（接续上下文）】\n…${prevChapterTail}`;
          }
        }
      }

      const msg = curContent ? `${aiMessage}\n\n---\n${curContent}` : aiMessage;
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiSettings.provider, model: aiSettings.model, baseUrl: aiSettings.baseUrl, apiKey: aiSettings.apiKey,
          temperature: aiSettings.temperature, maxTokens: aiSettings.maxTokens, workflow, message: msg, context: ctx,
        }),
        signal: controller.signal,
      });
      if (!res.ok) { const e = await res.text(); throw new Error(e); }
      const reader = res.body?.getReader(); if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder(); let result = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; result += decoder.decode(value, { stream: true }); setStreamingContent(result); }

      if (["draft", "continue"].includes(workflow)) editorRef.current?.appendText(result);
      else if (needsSelection) {
        const sel = editorRef.current?.getSelection();
        if (sel?.text.trim()) editorRef.current?.replaceSelection(toHtml(result));
        else editorRef.current?.replaceContent(toHtml(result));
      }

      fetch("/api/ai/generations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, chapterId: currentChapterId, workflow, model: aiSettings.model, provider: aiSettings.provider, prompt: aiMessage.substring(0, 1000), systemPrompt: ctx, output: result, temperature: aiSettings.temperature, maxTokens: aiSettings.maxTokens }),
      }).catch(() => {});
      if (result) toast.success("生成完成", { description: `${result.length} 字符` });
    } catch (e) {
      if ((e as Error).name === "AbortError") toast.info("生成已取消");
      else { const m = e instanceof Error ? e.message : "AI 请求失败"; setError(m); toast.error(m); }
    } finally { setGenerating(false); abortRef.current = null; }
  }, [aiMessage, workflow, aiSettings, currentChapterId, projectId, buildContext, setGenerating, setStreamingContent, setError, editorRef]);

  const handleCancel = useCallback(() => { abortRef.current?.abort(); abortRef.current = null; }, []);

  const handleInsert = useCallback(() => {
    if (["polish", "expand", "shorten", "rewrite", "deai"].includes(workflow)) {
      // 文本处理类工作流：替换选中区域
      const sel = editorRef.current?.getSelection();
      if (sel?.text.trim()) {
        editorRef.current?.replaceSelection(toHtml(streamingContent));
        toast.success("已替换选中内容");
      } else {
        editorRef.current?.replaceContent(toHtml(streamingContent));
        toast.success("已替换全文");
      }
    } else {
      // 生成/续写类工作流：插入到光标处
      editorRef.current?.appendText(streamingContent);
      toast.success("已插入正文");
    }
  }, [streamingContent, workflow, editorRef]);

  const handleRetry = useCallback(() => { setStreamingContent(""); handleGenerate(); }, [setStreamingContent, handleGenerate]);

  return {
    workflow, setWorkflow: handleWorkflowChange, aiMessage, setAiMessage, aiContext, setAiContext, aiAssets, setAiAssets,
    generating, streamingContent, contextTokenCount, contextPreview,
    handleGenerate, handleCancel, handleInsert, handleRetry,
  };
}
