import { useState, useRef, useCallback } from "react";
import { useAIStore } from "@/store/useStore";
import { estimateTokens, truncateByTokens, formatTokens } from "@/lib/token-count";
import type { TiptapEditorHandle } from "@/components/tiptap-editor";
import { toast } from "sonner";

interface UseAIGenerationParams {
  projectForm: { description: string; worldView: string; writingReqs: string };
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
  chapters: { id: string; title: string; summary: string; wordCount: number }[];
  currentChapterId: string | null;
  currentChapterContent: string;
  projectOutline: string;
  projectId: string;
  editorRef: React.RefObject<TiptapEditorHandle | null>;
}

function toHtml(text: string): string {
  return text.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
}

export function useAIGeneration({
  projectForm, aiSettings, assets, chapters, currentChapterId, currentChapterContent, projectOutline, projectId, editorRef,
}: UseAIGenerationParams) {
  const { generating, streamingContent, setGenerating, setStreamingContent, setError } = useAIStore();
  const abortRef = useRef<AbortController | null>(null);

  const [workflow, setWorkflow] = useState("draft");
  const [aiMessage, setAiMessage] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [aiAssets, setAiAssets] = useState<Record<string, boolean>>({
    characters: true, world: true, locations: true, organizations: true, items: true, fore: true, timeline: true,
  });

  // ─── 分层上下文构建器 v2 ───
  const buildContext = useCallback(() => {
    const tokenBudget = Math.floor(aiSettings.maxTokens * 0.6); // 60% 给上下文，40% 给输出
    const parts: string[] = [];

    // 1. 项目设定 (~500 tokens)
    const meta = [
      projectForm.description && `【作品简介】${projectForm.description}`,
      projectForm.worldView && `【世界观】${projectForm.worldView}`,
      projectForm.writingReqs && `【写作要求】${projectForm.writingReqs}`,
      projectOutline && `【大纲】${projectOutline.slice(0, 1500)}`,
    ].filter(Boolean).join("\n");
    if (meta) parts.push(meta);

    // 2. 章节记忆（分层：近3章全文 + 前N章摘要）
    if (chapters.length > 0) {
      const sorted = [...chapters].sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0) || 0);
      const recent = sorted.filter((c) => c.id !== currentChapterId).slice(0, 3);
      const earlier = sorted.filter((c) => c.id !== currentChapterId && !recent.find((r) => r.id === c.id));

      // 近 3 章摘要（如果是当前章节，使用编辑器内容）
      const recentParts: string[] = [];
      for (const ch of recent) {
        if (ch.id === currentChapterId && currentChapterContent) {
          const snippet = currentChapterContent.slice(0, 1500);
          recentParts.push(`【当前章节：${ch.title}】${snippet}${currentChapterContent.length > 1500 ? "…" : ""}`);
        } else if (ch.summary) {
          recentParts.push(`【${ch.title}】摘要：${ch.summary}`);
        }
      }
      if (recentParts.length > 0) parts.push("── 近期章节 ──\n" + recentParts.join("\n"));

      // 前 N 章摘要
      const earlierSummaries = earlier.filter((c) => c.summary).map((c) => `- ${c.title}：${c.summary.slice(0, 200)}`);
      if (earlierSummaries.length > 0) {
        parts.push("── 历史章节摘要 ──\n" + earlierSummaries.slice(0, 30).join("\n"));
      }

      // 弧线摘要：每 10 章压缩
      if (chapters.length >= 10) {
        const arcs: string[] = [];
        for (let i = 0; i < chapters.length; i += 10) {
          const arc = chapters.slice(i, Math.min(i + 10, chapters.length));
          const arcSummaries = arc.filter((c) => c.summary).map((c) => c.summary.slice(0, 100));
          if (arcSummaries.length > 0) {
            arcs.push(`第${i + 1}-${Math.min(i + 10, chapters.length)}章：${arcSummaries.join("；")}`);
          }
        }
        if (arcs.length > 0) parts.push("── 弧线概括 ──\n" + arcs.join("\n"));
      }
    }

    // 3. 活跃伏笔（仅未解决的）
    const activeFores = assets.fores.filter((f) => f.status !== "resolved" && f.status !== "resolving");
    if (aiAssets.fore && activeFores.length > 0) {
      parts.push("── 活跃伏笔 ──\n" + activeFores.map((f) => `- ${f.title}${f.description ? `：${f.description.slice(0, 100)}` : ""} [${f.status || "planted"}]`).join("\n"));
    }

    // 4. 资产注入（精简版）
    const assetLines: string[] = [];
    if (aiAssets.characters && assets.characters.length > 0)
      assetLines.push(`角色：${assets.characters.map((c) => `${c.name}${c.identity ? `(${c.identity})` : ""}`).join("、")}`);
    if (aiAssets.world && assets.worldItems.length > 0)
      assetLines.push(`世界观：${assets.worldItems.map((w) => w.title).join("、")}`);
    if (aiAssets.locations && assets.locations.length > 0)
      assetLines.push(`地点：${assets.locations.map((l) => l.name).join("、")}`);
    if (assetLines.length > 0) parts.push("── 资产库 ──\n" + assetLines.join("\n"));

    // 5. 用户手动上下文
    if (aiContext) parts.push("── 额外说明 ──\n" + aiContext);

    const raw = parts.join("\n\n");
    return truncateByTokens(raw, tokenBudget);
  }, [projectForm, aiSettings.maxTokens, aiAssets, assets, aiContext, chapters, currentChapterId, currentChapterContent, projectOutline]);

  const contextTokenCount = estimateTokens(buildContext());
  const contextPreview = buildContext().slice(0, 300) + (buildContext().length > 300 ? "…" : "");

  // ─── 生成 ───
  const handleGenerate = useCallback(async () => {
    if (!aiMessage && workflow !== "draft") { toast.error("请输入提示词"); return; }
    if (abortRef.current) { abortRef.current.abort(); return; }
    setGenerating(true); setStreamingContent(""); setError(null);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const ctx = buildContext();
      // 文本处理类工作流：必须选中文字
      const needsSelection = ["polish", "expand", "shorten", "rewrite"].includes(workflow);
      let curContent = "";
      if (needsSelection) {
        const sel = editorRef.current?.getSelection();
        if (!sel || !sel.text.trim()) { toast.error("请先在编辑器中选中要处理的文字"); setGenerating(false); return; }
        curContent = sel.text;
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
      else if (["polish", "expand", "shorten", "rewrite"].includes(workflow)) editorRef.current?.replaceSelection(toHtml(result));

      fetch("/api/ai/generations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, chapterId: currentChapterId, workflow, model: aiSettings.model, provider: aiSettings.provider, prompt: aiMessage.substring(0, 1000), systemPrompt: ctx, output: result, temperature: aiSettings.temperature, maxTokens: aiSettings.maxTokens }),
      }).catch(() => {});
    } catch (e) {
      if ((e as Error).name === "AbortError") toast.info("生成已取消");
      else { const m = e instanceof Error ? e.message : "AI 请求失败"; setError(m); toast.error(m); }
    } finally { setGenerating(false); abortRef.current = null; }
  }, [aiMessage, workflow, aiSettings, currentChapterId, projectId, buildContext, setGenerating, setStreamingContent, setError, editorRef]);

  const handleCancel = useCallback(() => { abortRef.current?.abort(); abortRef.current = null; }, []);
  const handleInsert = useCallback(() => { editorRef.current?.appendText(streamingContent); toast.success("已插入正文"); }, [streamingContent, editorRef]);
  const handleRetry = useCallback(() => { setStreamingContent(""); handleGenerate(); }, [setStreamingContent, handleGenerate]);

  return {
    workflow, setWorkflow, aiMessage, setAiMessage, aiContext, setAiContext, aiAssets, setAiAssets,
    generating, streamingContent, contextTokenCount, contextPreview,
    handleGenerate, handleCancel, handleInsert, handleRetry,
  };
}
