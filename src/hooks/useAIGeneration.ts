import { useState, useRef, useCallback } from "react";
import { useAIStore } from "@/store/useStore";
import { estimateTokens, truncateByTokens } from "@/lib/token-count";
import type { TiptapEditorHandle } from "@/components/tiptap-editor";
import { toast } from "sonner";

interface UseAIGenerationParams {
  projectForm: {
    description: string;
    worldView: string;
    writingReqs: string;
  };
  aiSettings: {
    provider: string;
    model: string;
    baseUrl: string;
    apiKey: string;
    temperature: number;
    maxTokens: number;
  };
  assets: {
    characters: Record<string, string>[];
    worldItems: Record<string, string>[];
    locations: Record<string, string>[];
    orgs: Record<string, string>[];
    items: Record<string, string>[];
    fores: Record<string, string>[];
    timelines: Record<string, string>[];
  };
  currentChapterId: string | null;
  projectId: string;
  editorRef: React.RefObject<TiptapEditorHandle | null>;
}

function htmlFromText(text: string): string {
  return text
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function useAIGeneration({
  projectForm,
  aiSettings,
  assets,
  currentChapterId,
  projectId,
  editorRef,
}: UseAIGenerationParams) {
  const { generating, streamingContent, setGenerating, setStreamingContent, setError } =
    useAIStore();
  const abortRef = useRef<AbortController | null>(null);

  const [workflow, setWorkflow] = useState("draft");
  const [aiMessage, setAiMessage] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [aiAssets, setAiAssets] = useState<Record<string, boolean>>({
    characters: true, world: true, locations: true, organizations: true,
    items: true, fore: true, timeline: true,
  });

  const editorText = editorRef.current?.getText() || "";

  const buildContext = useCallback(() => {
    const raw = [
      projectForm.description && `简介：${projectForm.description}`,
      projectForm.worldView && `世界观：${projectForm.worldView}`,
      projectForm.writingReqs && `写作要求：${projectForm.writingReqs}`,
      aiAssets.characters && assets.characters.length > 0 &&
        `角色：${assets.characters.map((c) => `${c.name}${c.identity ? `（${c.identity}）` : ""}`).join("、")}`,
      aiAssets.world && assets.worldItems.length > 0 &&
        `世界观条目：${assets.worldItems.map((w) => w.title).join("、")}`,
      aiAssets.locations && assets.locations.length > 0 &&
        `地点：${assets.locations.map((l) => l.name).join("、")}`,
      aiAssets.organizations && assets.orgs.length > 0 &&
        `组织：${assets.orgs.map((o) => o.name).join("、")}`,
      aiAssets.items && assets.items.length > 0 &&
        `物品：${assets.items.map((i) => i.name).join("、")}`,
      aiAssets.fore && assets.fores.length > 0 &&
        `伏笔：${assets.fores.map((f) => f.title).join("、")}`,
      aiAssets.timeline && assets.timelines.length > 0 &&
        `时间线：${assets.timelines.map((t) => t.title).join("、")}`,
      aiContext,
    ].filter(Boolean).join("\n");
    return truncateByTokens(raw, Math.floor(aiSettings.maxTokens * 0.7));
  }, [projectForm, aiSettings.maxTokens, aiAssets, assets, aiContext]);

  const contextTokenCount = estimateTokens(buildContext());

  const handleGenerate = useCallback(async () => {
    if (!aiMessage && workflow !== "draft") {
      toast.error("请输入提示词");
      return;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      return;
    }
    setGenerating(true);
    setStreamingContent("");
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const ctx = buildContext();
      const needsContent = ["polish", "expand", "shorten", "rewrite", "consistency"].includes(workflow);
      const curContent = needsContent ? (editorRef.current?.getText() || "") : "";
      const msg = curContent ? `${aiMessage}\n\n---\n${curContent}` : aiMessage;
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiSettings.provider, model: aiSettings.model,
          baseUrl: aiSettings.baseUrl, apiKey: aiSettings.apiKey,
          temperature: aiSettings.temperature, maxTokens: aiSettings.maxTokens,
          workflow, message: msg, context: ctx,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const e = await res.text();
        throw new Error(e);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setStreamingContent(result);
      }

      // Insert content into editor
      const html = htmlFromText(result);
      if (["draft", "continue"].includes(workflow)) {
        editorRef.current?.appendText(result);
      } else if (["polish", "expand", "shorten", "rewrite"].includes(workflow)) {
        editorRef.current?.replaceContent(html);
      }

      fetch("/api/ai/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId, chapterId: currentChapterId, workflow,
          model: aiSettings.model, provider: aiSettings.provider,
          prompt: aiMessage.substring(0, 1000), systemPrompt: ctx,
          output: result, temperature: aiSettings.temperature,
          maxTokens: aiSettings.maxTokens,
        }),
      }).catch(() => {});
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        toast.info("生成已取消");
      } else {
        const m = e instanceof Error ? e.message : "AI 请求失败";
        setError(m);
        toast.error(m);
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }, [
    aiMessage, workflow, aiSettings, currentChapterId,
    projectId, buildContext, setGenerating, setStreamingContent, setError,
    editorRef,
  ]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const handleInsert = useCallback(() => {
    editorRef.current?.appendText(streamingContent);
    toast.success("已插入正文");
  }, [streamingContent, editorRef]);

  const handleRetry = useCallback(() => {
    setStreamingContent("");
    handleGenerate();
  }, [setStreamingContent, handleGenerate]);

  return {
    workflow, setWorkflow,
    aiMessage, setAiMessage,
    aiContext, setAiContext,
    aiAssets, setAiAssets,
    generating, streamingContent,
    contextTokenCount,
    handleGenerate, handleCancel, handleInsert, handleRetry,
  };
}
