"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEditorStore, useAIConfigStore } from "@/store/useStore";
import { useProject, useChapters, useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset, useUpdateProject, useStats, useTrackWords } from "@/lib/queries";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAIGeneration } from "@/hooks/useAIGeneration";
import { countWords } from "@/lib/word-count";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { FileText, Plus, Trash2, Sparkles, Users, Globe, Eye, ArrowLeft, Settings, Download, MapPin, Building2, Package, Clock, PanelRightClose, PanelRightOpen, ChevronDown, ChevronRight, ChevronUp, BarChart3, Search, FileSearch } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { GlobalAISettings } from "@/components/global-ai-settings";
import { StatsPanel } from "@/components/stats-panel";
import { MemoryStatus } from "@/components/memory-status";
import { EditorPanel } from "./editor-panel";
import { AIPanel } from "./ai-panel";
import { AssetSheet } from "./asset-sheet";
import { OutlineSheet } from "./outline-sheet";
import { SettingsSheet } from "./settings-sheet";
import type { TiptapEditorHandle } from "@/components/tiptap-editor";

type AssetType = "character" | "world" | "location" | "organization" | "item" | "fore" | "timeline";
type AssetEntry = Record<string, string>;

const ASSET_DEFS: { type: AssetType; label: string; icon: typeof FileText }[] = [
  { type: "character", label: "角色卡", icon: Users }, { type: "world", label: "世界观", icon: Globe },
  { type: "location", label: "地点", icon: MapPin }, { type: "organization", label: "组织", icon: Building2 },
  { type: "item", label: "物品/能力", icon: Package }, { type: "fore", label: "伏笔", icon: Eye },
  { type: "timeline", label: "时间线", icon: Clock },
];

// 顶部工具栏图标按钮
function IconBtn({ onClick, icon: Icon, tip, size = "sm" }: { onClick: () => void; icon: typeof FileText; tip: string; size?: "sm" | "xs" }) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Button variant="ghost" size="icon" className={size === "xs" ? "h-6 w-6" : "h-7 w-7 transition-all duration-200 hover:scale-110 hover:text-primary active:scale-90"} onClick={onClick}>
          <Icon className={size === "xs" ? "w-3.5 h-3.5" : "w-3.5 h-3.5"} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

export default function ProjectPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();

  const [panels, setPanels] = useState({ right: true, asset: false, settings: false, stats: false, outline: false, assetExpanded: true });
  const [activeAssetType, setActiveAssetType] = useState<AssetType>("character");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [aiClosing, setAiClosing] = useState(false);

  // 关闭 AI 面板（带退出动画）
  const closeAIPanel = () => {
    setAiClosing(true);
    setTimeout(() => { setPanels((p) => ({ ...p, right: false })); setAiClosing(false); }, 250);
  };

  // 数据
  const { data: projectData } = useProject(projectId);
  const { data: chapters = [] } = useChapters(projectId);
  const { data: assetsData } = useAssets(projectId);
  const { data: statsData, isLoading: statsLoading } = useStats(projectId);
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const trackWords = useTrackWords();

  // 编辑器状态
  const { currentChapterId, chapterContent, chapterTitle, saving, wordCount, loadChapter, setChapterContent, setChapterTitle, setWordCount, saveChapter, addChapter, deleteChapter } = useEditorStore();

  // AI 设定 — 从全局 Zustand store 读取，首次加载时从配置文件同步
  const aiConfig = useAIConfigStore((s) => s.aiConfig);
  const replaceAIConfig = useAIConfigStore((s) => s.replaceAIConfig);
  const configLoaded = useAIConfigStore((s) => s.configLoaded);

  useEffect(() => {
    if (configLoaded) return;
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => {
        if (!cfg?.ai) return;
        const provider = cfg.ai.defaultProvider || "deepseek";
        const p = cfg.ai.providers?.[provider];
        if (p) {
          replaceAIConfig({
            provider,
            model: p.model || "deepseek-v4-flash",
            baseUrl: p.baseUrl || "https://api.deepseek.com",
            apiKey: p.apiKey || "",
            temperature: p.temperature ?? 0.7,
            maxTokens: p.maxTokens ?? 8192,
            topP: p.topP ?? 1.0,
            frequencyPenalty: p.frequencyPenalty ?? 0,
            presencePenalty: p.presencePenalty ?? 0,
            reasoningEffort: p.reasoningEffort || "",
          });
        }
      })
      .catch(() => {});
  }, [projectId, configLoaded, replaceAIConfig]);

  // 项目表单
  const defaultForm = { title: "", type: "novel", genre: "", style: "", targetWords: 0, description: "", worldView: "", writingReqs: "" };
  const [projectForm, setProjectForm] = useState(defaultForm);

  useEffect(() => {
    if (projectData) setProjectForm({
      title: projectData.title || "", type: projectData.type || "novel", genre: projectData.genre || "",
      style: projectData.style || "", targetWords: projectData.targetWords || 0,
      description: projectData.description || "", worldView: projectData.worldView || "", writingReqs: projectData.writingReqs || "",
    });
  }, [projectData]);

  // 资产数据
  const chars = (assetsData?.characters ?? []) as AssetEntry[];
  const worlds = (assetsData?.worldBuilding ?? []) as AssetEntry[];
  const locs = (assetsData?.locations ?? []) as AssetEntry[];
  const orgs = (assetsData?.organizations ?? []) as AssetEntry[];
  const items = (assetsData?.items ?? []) as AssetEntry[];
  const fores = (assetsData?.foreshadowings ?? []) as AssetEntry[];
  const tls = (assetsData?.timelines ?? []) as AssetEntry[];
  const assetMap: Record<AssetType, AssetEntry[]> = { character: chars, world: worlds, location: locs, organization: orgs, item: items, fore: fores, timeline: tls };

  // Hooks
  useAutoSave();
  useKeyboardShortcuts(projectId);
  const editorRef = useRef<TiptapEditorHandle | null>(null);

  const aiGenRef = useRef<typeof aiGen | null>(null);

  useEffect(() => {
    const toggle = () => setPanels((p) => ({ ...p, right: !p.right }));
    const triggerAI = () => { aiGenRef.current?.handleGenerate(); };
    window.addEventListener("toggle-ai-panel", toggle);
    window.addEventListener("trigger-ai-generation", triggerAI);
    return () => {
      window.removeEventListener("toggle-ai-panel", toggle);
      window.removeEventListener("trigger-ai-generation", triggerAI);
    };
  }, []);

  // 卷/Arc Plan
  const [arcPlan, setArcPlan] = useState<{ title: string; summary: string; order: number } | null>(null);
  useEffect(() => {
    fetch(`/api/volumes?projectId=${projectId}`).then(r => r.json()).then(data => {
      const vols = Array.isArray(data) ? data : [];
      const active = vols.find((v: any) => v.status === "writing") || vols[0] || null;
      if (active) setArcPlan({ title: active.title, summary: active.summary || "", order: active.order });
    }).catch(() => {});
  }, [projectId]);

  // 章节任务卡
  const [taskCard, setTaskCard] = useState<string | null>(null);
  useEffect(() => {
    setTaskCard(null);
    if (!currentChapterId) return;
    fetch(`/api/chapters/outline?chapterId=${currentChapterId}`).then(r => r.json()).then(data => {
      if (data?.taskCard) setTaskCard(data.taskCard);
    }).catch(() => {});
  }, [currentChapterId, saving]);

  const aiGen = useAIGeneration({ projectForm, projectBible: projectData?.bible || "", aiSettings: aiConfig, assets: { characters: chars, worldItems: worlds, locations: locs, orgs, items, fores, timelines: tls }, chapters, currentChapterId, currentChapterContent: chapterContent, projectOutline: projectData?.outline || "", projectId, editorRef, arcPlan, taskCard });
  aiGenRef.current = aiGen;

  // UX: 切换到 draft 且无任务卡时提示
  useEffect(() => {
    if (aiGen.workflow === "draft" && !taskCard && projectData?.bible) {
      const t = setTimeout(() => {
        toast("建议先生成任务卡", { description: "任务卡帮助 AI 理解本章的叙事目标和关键节拍，显著提升生成质量", duration: 4000 });
      }, 800);
      return () => clearTimeout(t);
    }
  }, [aiGen.workflow]);

  // UX: Bible 空时提示
  const bibleToastShown = useRef(false);
  useEffect(() => {
    if (!bibleToastShown.current && projectData && !projectData.bible && chapters.length > 0 && aiConfig.provider) {
      bibleToastShown.current = true;
      toast("小说 Bible 尚未生成", {
        description: "Bible 为 AI 提供精简设定参考，提升写作一致性",
        action: { label: "去生成", onClick: () => setPanels((p) => ({ ...p, settings: true })) },
        duration: 8000,
      });
    }
  }, [projectData?.bible, chapters.length, aiConfig.provider]);

  // UX: 检测缺少 stateJson 的章节
  useEffect(() => {
    if (!aiConfig.provider || chapters.length === 0) return;
    const missing = chapters.filter((c) => c.wordCount > 100 && !c.stateJson);
    if (missing.length > 0) {
      toast(`${missing.length} 个章节缺少状态提取`, {
        description: "保存章节将自动触发状态提取，追踪人物变化和伏笔进展",
        duration: 5000,
      });
    }
  }, [chapters.length, aiConfig.provider]);

  // 字数追踪
  const lastWC = useRef(0);
  const lastDate = useRef("");
  useEffect(() => {
    const wc = countWords(editorRef.current?.getText() || "");
    setWordCount(wc);
  }, [chapterContent, setWordCount]);

  useEffect(() => {
    lastWC.current = countWords(editorRef.current?.getText() || "");
    lastDate.current = new Date().toISOString().slice(0, 10);
  }, [currentChapterId]);

  const trackDelta = useCallback(() => {
    const wc = countWords(editorRef.current?.getText() || "");
    const delta = wc - lastWC.current;
    const today = new Date().toISOString().slice(0, 10);
    const useDate = lastDate.current !== today ? (lastDate.current || today) : today;
    if (delta > 0) { trackWords.mutate({ projectId, date: useDate, wordCount: delta }); lastWC.current = wc; }
    if (lastDate.current !== today) lastDate.current = today;
  }, [projectId, trackWords]);

  // 自动摘要：保存完成后若章节无摘要则后台生成
  const autoSummaryBusy = useRef(false);
  const prevSaving = useRef(false);
  useEffect(() => {
    if (prevSaving.current && !saving) {
      trackDelta();
      const cur = chapters.find((c) => c.id === currentChapterId);
      if (cur && cur.wordCount > 200 && !autoSummaryBusy.current && currentChapterId && aiConfig.provider) {
        autoSummaryBusy.current = true;
        const chId = currentChapterId;

        // 1. 生成/更新摘要（如果还没有）
        const doSummary = !cur.summary;
        const summaryPromise = doSummary ? fetch("/api/ai", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: aiConfig.provider, model: aiConfig.model, baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey,
            temperature: 0.3, maxTokens: 500, workflow: "summary",
            message: `请为以下章节生成200字以内摘要：\n标题：${chapterTitle}\n内容：${chapterContent.slice(0, 2500)}`,
            context: `作品：${projectForm.title}`,
          }),
        }).then(async (res) => {
          if (res.ok) {
            const summary = await res.text();
            await fetch(`/api/chapters?id=${chId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary: summary.trim() }) });
          }
        }).catch(() => {}) : Promise.resolve();

        // 2. 自动提取结构化状态（每次保存都做）
        const statePromise = fetch("/api/ai/extract-state", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: aiConfig.provider, model: aiConfig.model, baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey,
            chapterContent: chapterContent.slice(0, 12000),
            chapterTitle,
            prevStateJson: cur.stateJson || "",
          }),
        }).then(async (res) => {
          if (res.ok) {
            const { stateJson } = await res.json();
            await fetch(`/api/chapters?id=${chId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stateJson }) });
          }
        }).catch(() => {});

        // 3. 自动连续性检查（字数 > 1000 时执行）
        const consistencyPromise = cur.wordCount > 1000 ? fetch("/api/ai", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: aiConfig.provider, model: aiConfig.model, baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey,
            temperature: 0.3, maxTokens: 1500, workflow: "consistency",
            message: `请检查以下章节的一致性：\n标题：${chapterTitle}\n内容：${chapterContent.slice(0, 6000)}`,
            context: `作品：${projectForm.title}\n简介：${projectForm.description}\n世界观：${projectForm.worldView}`,
          }),
        }).then(async (res) => {
          if (res.ok) {
            const result = await res.text();
            // 追加到 notes 字段（保留历史）
            const existingNotes = cur.notes || "";
            const timestamp = new Date().toLocaleString("zh-CN");
            const newNotes = existingNotes
              ? `${existingNotes}\n\n---\n${timestamp} 检查：\n${result.slice(0, 1500)}`
              : `${timestamp} 检查：\n${result.slice(0, 2000)}`;
            await fetch(`/api/chapters?id=${chId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes: newNotes.slice(0, 4000) }) }).catch(() => {});
            // 检测是否有严重问题并提示
            if (result.includes("致命") || result.includes("严重")) {
              toast.warning("连续性检查发现需要注意的问题，已记录到章节备注");
            }
          }
        }).catch(() => {}) : Promise.resolve();

        Promise.all([summaryPromise, statePromise, consistencyPromise]).finally(() => { autoSummaryBusy.current = false; });
      }
    }
    prevSaving.current = saving;
  }, [saving, trackDelta, chapters, currentChapterId, chapterContent, chapterTitle, aiConfig, projectForm]);

  // ─── Handlers ───
  const handleSave = useCallback(() => { if (currentChapterId) { saveChapter(currentChapterId); toast.success("已保存"); } }, [currentChapterId, saveChapter]);

  const handleAcceptSuggestion = useCallback(() => {
    if (suggestion) { editorRef.current?.appendText(suggestion); setSuggestion(null); toast.success("已采纳续写"); }
  }, [suggestion]);

  const handleDismissSuggestion = useCallback(() => setSuggestion(null), []);

  const handlePause = useCallback(async (ctx: string) => {
    if (!aiConfig.provider || !aiConfig.apiKey) return;
    try {
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: aiConfig.provider, model: aiConfig.model, baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey, temperature: 0.4, maxTokens: 200, workflow: "continue", message: "请根据上文，用3-5句话自然地续写下去，不添加场景说明：", context: `${projectForm.description ? `作品：${projectForm.description}\n` : ""}${projectForm.writingReqs ? `要求：${projectForm.writingReqs}\n` : ""}上文：${ctx}` }),
      });
      if (!res.ok) return;
      const reader = res.body?.getReader(); if (!reader) return;
      const decoder = new TextDecoder(); let result = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; result += decoder.decode(value, { stream: true }); }
      if (result.trim()) setSuggestion(result.trim());
    } catch { /* silent */ }
  }, [aiConfig, projectForm]);

  const handleAddAsset = async (type: AssetType) => {
    const defs: Record<AssetType, Record<string, string>> = { character: { name: "新角色" }, world: { title: "新条目" }, location: { name: "新地点" }, organization: { name: "新组织" }, item: { name: "新物品" }, fore: { title: "新伏笔" }, timeline: { title: "新事件" } };
    try { await createAsset.mutateAsync({ type, projectId, ...defs[type] }); toast.success("已添加"); } catch (e) { toast.error(`添加失败: ${e instanceof Error ? e.message : "未知错误"}`); }
  };

  // 从章节 AI 生成资产卡片（分批处理，每批最多 8 章）
  const [generatingAssets, setGeneratingAssets] = useState(false);
  const handleGenerateAssetCard = async (chapterIds: string[], assetTypes: string[]) => {
    if (!aiConfig.provider || !aiConfig.model) { toast.error("请先在设置中配置 AI 模型"); return; }
    setGeneratingAssets(true);

    // 收集所有章节内容
    const chapterData: { title: string; content: string }[] = [];
    for (const chId of chapterIds) {
      const ch = chapters.find((c) => c.id === chId);
      if (!ch) continue;
      if (chId === currentChapterId) {
        chapterData.push({ title: ch.title, content: editorRef.current?.getText() || "" });
      } else {
        const res = await fetch(`/api/chapters?id=${chId}`);
        const data = await res.json();
        chapterData.push({ title: data.title || ch.title, content: data.content || "" });
      }
    }
    const valid = chapterData.filter((c) => c.content.trim());
    if (valid.length === 0) { toast.error("所选章节无内容"); setGeneratingAssets(false); return; }

    // 分批（每批最多 8 章，约 60K 字符/批）
    const BATCH_SIZE = 8;
    const batches: typeof valid[] = [];
    for (let i = 0; i < valid.length; i += BATCH_SIZE) {
      batches.push(valid.slice(i, i + BATCH_SIZE));
    }

    try {
      const allResults: Record<string, Record<string, unknown>[]> = {
        characters: [], worldItems: [], locations: [], items: [], foreshadowings: [],
      };

      for (let bi = 0; bi < batches.length; bi++) {
        const batch = batches[bi];
        const batchText = batch.map((c) => `## ${c.title}\n${c.content.slice(0, 6000)}`).join("\n");

        toast.info(`正在提取第 ${bi + 1}/${batches.length} 批...`);

        const response = await fetch("/api/ai", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: aiConfig.provider, model: aiConfig.model, baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey,
            temperature: 0.3, maxTokens: 8192, workflow: "assetCard",
            message: `请从以下章节内容中提取所有资产信息（角色、世界观、地点、物品、伏笔）：\n\n${batchText}`,
            context: `作品：${projectForm.title}\n简介：${projectForm.description}\n\n这是第 ${bi + 1}/${batches.length} 批章节。请只输出此批章节中出现的资产。`,
          }),
        });
        if (!response.ok) throw new Error(`第 ${bi + 1} 批 AI 请求失败`);
        const text = await response.text();

        // 解析 JSON
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
        const parsed = JSON.parse(jsonStr);

        // 合并结果
        for (const key of Object.keys(allResults)) {
          if (parsed[key]?.length > 0) {
            allResults[key].push(...parsed[key]);
          }
        }
      }

      // 去重（按 name/title 去重）
      const seen = new Map<string, Set<string>>();
      const deduped: typeof allResults = { characters: [], worldItems: [], locations: [], items: [], foreshadowings: [] };
      for (const key of Object.keys(allResults)) {
        if (!seen.has(key)) seen.set(key, new Set());
        const names = seen.get(key)!;
        for (const item of allResults[key]) {
          const name = String((item as any).name || (item as any).title || "").trim();
          if (name && !names.has(name)) {
            names.add(name);
            deduped[key].push(item);
          }
        }
      }

      // 批量创建
      let created = 0;
      const typeMap: Record<string, string> = {
        characters: "character", worldItems: "world", locations: "location",
        items: "item", foreshadowings: "fore",
      };
      for (const [key, items] of Object.entries(deduped)) {
        for (const item of items) {
          try {
            await createAsset.mutateAsync({ type: typeMap[key], projectId, ...item });
            created++;
          } catch { /* skip duplicate */ }
        }
      }
      toast.success(`已从 ${chapterIds.length} 章中提取 ${created} 个资产`);
    } catch (e) {
      toast.error(`提取失败: ${e instanceof Error ? e.message : "未知错误"}`);
    } finally {
      setGeneratingAssets(false);
    }
  };

  const handleSaveAsset = async (type: AssetType, id: string, data: Record<string, unknown>) => { await updateAsset.mutateAsync({ type, id, projectId, ...data }); };
  const handleDeleteAsset = async (type: AssetType, id: string) => { await deleteAsset.mutateAsync({ type, id, projectId }); toast.success("已删除"); };

  const handleSaveSettings = async () => {
    try {
      await updateProject.mutateAsync({ id: projectId, ...projectForm });
      toast.success("设置已保存");
      setPanels((p) => ({ ...p, settings: false }));
    } catch (e) {
      toast.error(`保存失败: ${e instanceof Error ? e.message : "未知错误"}`);
    }
  };

  const [generatingBible, setGeneratingBible] = useState(false);
  const [generatingTaskCard, setGeneratingTaskCard] = useState(false);
  const [extractingOutlineAssets, setExtractingOutlineAssets] = useState(false);
  const handleGenerateTaskCard = async () => {
    if (!aiConfig.provider || !aiConfig.model) { toast.error("请先配置 AI"); return; }
    if (!currentChapterId) { toast.error("请先选择章节"); return; }
    setGeneratingTaskCard(true);
    try {
      // 找上一章结尾
      const sorted = [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const curIdx = sorted.findIndex((c) => c.id === currentChapterId);
      const prev = curIdx > 0 ? sorted[curIdx - 1] : null;
      let prevEnding = "";
      if (prev && prev.id !== currentChapterId) {
        const r = await fetch(`/api/chapters?id=${prev.id}`);
        if (r.ok) { const d = await r.json(); prevEnding = (d.content || "").slice(-1500); }
      }

      const res = await fetch("/api/ai/task-card", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiConfig.provider, model: aiConfig.model, baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey,
          bible: projectData?.bible || "",
          arcPlan: arcPlan ? `${arcPlan.title}：${arcPlan.summary}` : "",
          outline: projectData?.outline || "",
          chapterTitle: chapterTitle,
          chapterGoal: "",
          prevEnding,
          activeForeshadowings: fores.filter((f: any) => f.status !== "resolved").map((f: any) => `${f.title}：${f.description || ""}`),
          relevantCharacters: chars.slice(0, 5).map((c: any) => `${c.name}(${c.identity || ""})`),
        }),
      });
      if (!res.ok) throw new Error();
      const { taskCard: tc } = await res.json();
      if (tc) {
        // 保存到 ChapterOutline
        await fetch(`/api/chapters/outline?chapterId=${currentChapterId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskCard: tc }),
        });
        setTaskCard(tc);
        toast.success("任务卡已生成");
      }
    } catch { toast.error("任务卡生成失败"); }
    finally { setGeneratingTaskCard(false); }
  };

  const handleExtractOutlineAssets = async () => {
    const outline = projectData?.outline;
    if (!outline?.trim()) { toast.error("请先生成大纲"); return; }
    if (!aiConfig.provider) { toast.error("请先配置 AI"); return; }
    setExtractingOutlineAssets(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiConfig.provider, model: aiConfig.model, baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey,
          temperature: 0.3, maxTokens: 4000, workflow: "outline-chat",
          message: `请从以下大纲中提取所有可辨识的资产信息，以 JSON 格式输出：

{
  "characters": [{"name":"","identity":"","personality":"","goals":"","backstory":"","characterArc":""}],
  "worldItems": [{"title":"","type":"","content":""}],
  "locations": [{"name":"","type":"","description":""}],
  "items": [{"name":"","type":"","effect":"","description":""}],
  "volumes": [{"title":"","summary":"","order":1}]
}

只输出 JSON，不要其他文字。`,
          context: `大纲内容：\n${outline}`,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const text = await res.text();
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[1].trim() : text.trim());

      let created = 0;
      if (parsed.characters?.length > 0) {
        for (const c of parsed.characters) {
          try { await createAsset.mutateAsync({ type: "character", projectId, ...c }); created++; } catch {}
        }
      }
      if (parsed.worldItems?.length > 0) {
        for (const w of parsed.worldItems) {
          try { await createAsset.mutateAsync({ type: "world", projectId, ...w }); created++; } catch {}
        }
      }
      if (parsed.locations?.length > 0) {
        for (const l of parsed.locations) {
          try { await createAsset.mutateAsync({ type: "location", projectId, ...l }); created++; } catch {}
        }
      }
      if (parsed.items?.length > 0) {
        for (const i of parsed.items) {
          try { await createAsset.mutateAsync({ type: "item", projectId, ...i }); created++; } catch {}
        }
      }
      if (parsed.volumes?.length > 0) {
        for (const v of parsed.volumes) {
          try {
            await fetch("/api/volumes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, title: v.title, summary: v.summary, order: v.order || 0, status: "planned" }) });
            created++;
          } catch {}
        }
      }
      toast.success(`已从大纲提取 ${created} 个资产`, { description: "打开资产管理查看" });
    } catch (e) {
      toast.error(`提取失败: ${e instanceof Error ? e.message : "解析错误"}`);
    } finally { setExtractingOutlineAssets(false); }
  };

  const handleGenerateBible = async () => {
    if (!aiConfig.provider || !aiConfig.model) { toast.error("请先配置 AI"); return; }
    setGeneratingBible(true);
    try {
      const res = await fetch("/api/ai/bible", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiConfig.provider, model: aiConfig.model, baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey,
          description: projectForm.description, worldView: projectForm.worldView, writingReqs: projectForm.writingReqs,
          outline: projectData?.outline || "", characters: chars.slice(0, 10), genre: projectForm.genre, style: projectForm.style,
        }),
      });
      if (!res.ok) throw new Error();
      const { bible } = await res.json();
      if (bible) {
        await fetch(`/api/projects?id=${projectId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bible }) });
        toast.success("小说 Bible 已生成");
      }
    } catch { toast.error("Bible 生成失败"); }
    finally { setGeneratingBible(false); }
  };

  const handleExport = async (fmt: string) => {
    try {
      const res = await fetch(`/api/export?projectId=${projectId}&format=${fmt}`);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }
      // 优先使用服务端设置的文件名
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename\*?=(?:UTF-8''|"?)?"?([^";]+(?:\.[^";]+))"?/);
      const safeTitle = (projectForm.title || "export").replace(/[\\/:*?"<>|]/g, "_");
      const filename = match?.[1] || `${safeTitle}.${fmt}`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`已导出 ${fmt.toUpperCase()}`);
    } catch (e) {
      toast.error(`导出失败: ${e instanceof Error ? e.message : "未知错误"}`);
    }
  };

  const handleAddChapter = async () => {
    const ch = await addChapter(projectId);
    if (ch) { loadChapter(ch.id).then(() => editorRef.current?.replaceContent("")); toast.success("新章节已创建"); }
  };

  const handleSwitchChapter = (chId: string) => {
    if (currentChapterId) saveChapter(currentChapterId);
    loadChapter(chId).then(() => { const c = useEditorStore.getState().chapterContent; editorRef.current?.replaceContent(c || ""); });
  };

  const handleDeleteChapter = async (chId: string) => {
    const ch = chapters.find((c) => c.id === chId);
    await deleteChapter(chId);
    toast.success("章节已删除", { description: ch?.title || "" });
  };
  const handleMoveChapter = async (chId: string, direction: -1 | 1) => {
    const sorted = [...chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idx = sorted.findIndex((c) => c.id === chId);
    if (idx < 0 || (direction === -1 && idx === 0) || (direction === 1 && idx === sorted.length - 1)) return;
    const a = sorted[idx], b = sorted[idx + direction];
    await fetch(`/api/chapters?id=${a.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: b.order }) });
    await fetch(`/api/chapters?id=${b.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: a.order }) });
    // 立即使 React Query 缓存失效，触发重新获取
    queryClient.invalidateQueries({ queryKey: ["chapters", projectId] });
  };

  // P1: 生成章节摘要
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const handleSummarizeChapter = async (chId: string) => {
    setSummarizingId(chId);
    try {
    const ch = chapters.find((c) => c.id === chId);
      const content = chId === currentChapterId ? (editorRef.current?.getText() || "") : "";
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiConfig.provider, model: aiConfig.model, baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey,
          temperature: 0.3, maxTokens: 600, workflow: "summary",
          message: `请为以下章节生成200字以内的摘要：\n标题：${ch?.title || "无标题"}\n${content ? `内容片段：${content.slice(0, 2000)}` : ""}`,
          context: `作品：${projectForm.title}\n简介：${projectForm.description}`,
        }),
      });
      if (!res.ok) throw new Error("生成失败");
      const summary = await res.text();
      await fetch(`/api/chapters?id=${chId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary: summary.trim() }) });
      toast.success("摘要已生成");
    } catch { toast.error("摘要生成失败"); }
    setSummarizingId(null);
  };

  // P1: 一致性检查
  const [checking, setChecking] = useState(false);
  const handleConsistencyCheck = async () => {
    setChecking(true);
    try {
      const titles = chapters.map((c) => `- ${c.title}（${c.wordCount} 字）${c.summary ? ` | ${c.summary.slice(0, 60)}...` : ""}`).join("\n");
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiConfig.provider, model: aiConfig.model, baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey,
          temperature: 0.3, maxTokens: 2000, workflow: "consistency",
          message: `请检查以下作品的情节一致性：\n\n## 作品信息\n标题：${projectForm.title}\n简介：${projectForm.description}\n大纲：${projectData?.outline || "暂无"}\n\n## 章节列表\n${titles}`,
          context: `作品：${projectForm.title}\n完整简介：${projectForm.description}\n大纲：${projectData?.outline || ""}\n世界观：${projectForm.worldView}`,
        }),
      });
      if (!res.ok) throw new Error("检查失败");
      const result = await res.text();
      toast.success("一致性检查完成", { description: result.slice(0, 200) + "..." });
    } catch { toast.error("一致性检查失败"); }
    setChecking(false);
  };

  // 大纲操作
  const handleSaveOutline = async (outline: string) => {
    await updateProject.mutateAsync({ id: projectId, outline });
  };
  const handleGenerateOutline = async (): Promise<string> => {
    const res = await fetch("/api/ai", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: aiConfig.provider, model: aiConfig.model, baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey,
        temperature: aiConfig.temperature, maxTokens: aiConfig.maxTokens,
        workflow: "outline",
        message: `请为以下作品生成完整的故事大纲：\n标题：${projectForm.title}\n类型：${projectForm.type}\n题材：${projectForm.genre}\n风格：${projectForm.style}\n简介：${projectForm.description}\n世界观：${projectForm.worldView}`,
        context: projectForm.description || "",
      }),
    });
    if (!res.ok) throw new Error("生成失败");
    return await res.text();
  };

  // ─── Computed ───
  const totalWords = chapters.reduce((s, ch) => s + ch.wordCount, 0);
  const wordProgress = projectForm.targetWords > 0 ? Math.min(100, Math.round((totalWords / projectForm.targetWords) * 100)) : 0;

  // ═══════════════════════ RENDER ═══════════════════════
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="h-10 border-b flex items-center px-3 gap-2 shrink-0 bg-muted/5 glass">
        <IconBtn onClick={() => router.push("/projects")} icon={ArrowLeft} tip="返回作品列表" />
        <span className="text-[11px] sm:text-[13px] font-semibold truncate max-w-[120px] sm:max-w-[180px] animate-slide-up">{projectData?.title || "加载中..."}</span>
        <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline tabular-nums">{totalWords.toLocaleString()}<span className="text-muted-foreground/40">/</span>{projectForm.targetWords.toLocaleString()} 字</span>
        {wordProgress > 0 && <div className="w-12 h-1 bg-muted/50 rounded-full overflow-hidden hidden sm:block"><div className="h-full bg-primary/60 rounded-full transition-all duration-700 ease-out" style={{ width: `${wordProgress}%` }} /></div>}
        <div className="flex-1" />
        {saving && <span className="text-[9px] sm:text-[10px] text-muted-foreground/60 animate-breathe">保存中</span>}
        <IconBtn onClick={() => setPanels((p) => ({ ...p, stats: true }))} icon={BarChart3} tip="写作统计" />
        <IconBtn onClick={handleConsistencyCheck} icon={FileSearch} tip={`一致性检查${checking ? "中..." : ""}`} />
        <IconBtn onClick={() => handleExport("md")} icon={Download} tip="导出 MD" />
        <GlobalAISettings />
        <IconBtn onClick={() => setPanels((p) => ({ ...p, settings: true }))} icon={Settings} tip="作品设置" />
        <ThemeToggle />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="flex border-r flex-col shrink-0 bg-muted/5" style={{ width: "clamp(140px, 13vw, 240px)" }}>
          <TooltipProvider delay={500}>
          <div className="p-2 border-b flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">章节</span>
            <IconBtn onClick={handleAddChapter} icon={Plus} tip="新建章节" size="xs" />
          </div>
          <ScrollArea className="flex-1 scroll-thin">
            <div className="p-1 space-y-0.5">
              {chapters.map((ch, i) => (
                <Tooltip key={ch.id}>
                  <TooltipTrigger>
                    <div onClick={() => handleSwitchChapter(ch.id)}
                      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-all duration-200 ${currentChapterId === ch.id ? "bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm" : "hover:bg-muted/60 text-muted-foreground hover:text-foreground hover:translate-x-0.5"}`}
                      style={{ animationDelay: `${i * 30}ms` }}>
                      <span className="text-[11px] sm:text-[12px] lg:text-[13px] truncate flex-1">{ch.title || "未命名"}</span>
                      <span className="text-[8px] sm:text-[9px] text-muted-foreground/40 shrink-0">{ch.wordCount}</span>
                      {ch.notes && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 shrink-0" title="有连续性检查备注" />
                      )}
                      <button className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-foreground shrink-0" onClick={(e) => { e.stopPropagation(); handleMoveChapter(ch.id, -1); }} title="上移">
                        <ChevronUp className="w-2.5 h-2.5" />
                      </button>
                      <button className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-foreground shrink-0" onClick={(e) => { e.stopPropagation(); handleMoveChapter(ch.id, 1); }} title="下移">
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                      <button className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-primary shrink-0" onClick={(e) => { e.stopPropagation(); handleSummarizeChapter(ch.id); }} title="生成摘要">
                        {summarizingId === ch.id ? <span className="w-2.5 h-2.5 border border-primary/30 rounded-full animate-spin border-t-primary" /> : <FileSearch className="w-2.5 h-2.5" />}
                      </button>
                      <button className="opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive shrink-0" onClick={(e) => { e.stopPropagation(); handleDeleteChapter(ch.id); }}>
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[320px] space-y-1">
                    <p><span className="font-medium">{ch.title}</span> · {ch.wordCount} 字</p>
                    {ch.summary && <p className="text-muted-foreground text-xs">{ch.summary}</p>}
                    {ch.notes && (
                      <div className="pt-1 border-t border-border/50">
                        <p className="text-[10px] text-amber-500 font-medium mb-0.5">连续性检查</p>
                        <p className="text-[10px] text-muted-foreground whitespace-pre-wrap line-clamp-6">{ch.notes}</p>
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              ))}
              {chapters.length === 0 && <div className="text-[11px] text-muted-foreground text-center py-10 px-3">点击 + 创建章节</div>}
            </div>
          </ScrollArea>

          <div className="border-t p-1.5">
            <button onClick={() => setPanels((p) => ({ ...p, assetExpanded: !p.assetExpanded }))}
              className="w-full flex items-center justify-between px-1 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
              资产库{panels.assetExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            {panels.assetExpanded && (
              <div className="mt-0.5 space-y-0.5">
                {ASSET_DEFS.map(({ type, label, icon: Icon }, i) => (
                  <Tooltip key={type}>
                    <TooltipTrigger>
                      <button onClick={() => { setActiveAssetType(type); setPanels((p) => ({ ...p, asset: true })); }}
                        style={{ animationDelay: `${i * 40}ms` }}
                        className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5 transition-all duration-200 animate-float-in">
                        <Icon className="w-3 h-3 shrink-0" /><span className="flex-1 text-left">{label}</span><span className="text-[9px] opacity-40">{assetMap[type].length}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{label} · {assetMap[type].length} 项</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
            <div className="mt-1.5 pt-1.5 border-t border-border/20 px-1">
              <button onClick={() => setPanels((p) => ({ ...p, outline: true }))}
                className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span className="flex-1 text-left">故事大纲</span>
                <span className="text-[9px] opacity-40">{(projectData?.outline?.length ?? 0) > 0 ? "✓" : "+"}</span>
              </button>
              <MemoryStatus projectId={projectId} />
            </div>
            <div className="mt-auto pt-2 pb-1.5 px-2 border-t border-border/20">
              <p className="text-[9px] text-muted-foreground/30 text-center leading-relaxed">NovelForge · 斗包要打野 · 2825274624z@gmail.com</p>
            </div>
          </div>
          </TooltipProvider>
        </aside>

        {/* Editor */}
        <EditorPanel chapterTitle={chapterTitle} chapterContent={chapterContent} wordCount={wordCount} saving={saving}
          onTitleChange={setChapterTitle} onContentChange={setChapterContent} onSave={handleSave} editorRef={editorRef}
          suggestion={suggestion} onAcceptSuggestion={handleAcceptSuggestion} onDismissSuggestion={handleDismissSuggestion} onPause={handlePause} />

        {/* AI Panel — 开关均有动画 */}
        <div className={`border-l flex-col shrink-0 bg-muted/5 ${aiClosing ? "flex animate-out slide-out-to-right duration-250" : panels.right ? "flex animate-in slide-in-from-right duration-300" : "hidden"}`} style={{ width: "clamp(280px, 24vw, 480px)" }}>
          <div className="border-b flex items-center px-2 py-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="w-3 h-3" />AI 助手</span>
            <div className="flex-1" />
            <IconBtn onClick={closeAIPanel} icon={PanelRightClose} tip="关闭 AI 面板" size="xs" />
          </div>
          <AIPanel workflow={aiGen.workflow} aiMessage={aiGen.aiMessage} aiContext={aiGen.aiContext} aiAssets={aiGen.aiAssets}
            generating={aiGen.generating} streamingContent={aiGen.streamingContent} contextTokenCount={aiGen.contextTokenCount} contextPreview={aiGen.contextPreview}
            taskCard={taskCard} generatingTaskCard={generatingTaskCard}
            onWorkflowChange={aiGen.setWorkflow} onMessageChange={aiGen.setAiMessage} onContextChange={aiGen.setAiContext}
            onAssetsChange={aiGen.setAiAssets} onGenerate={aiGen.handleGenerate} onCancel={aiGen.handleCancel} onInsert={aiGen.handleInsert} onRetry={aiGen.handleRetry}
            onGenerateTaskCard={handleGenerateTaskCard} />
        </div>
        {!panels.right && (
          <div className="border-l bg-muted/5 flex items-start pt-2 animate-in fade-in duration-200">
            <IconBtn onClick={() => setPanels((p) => ({ ...p, right: true }))} icon={PanelRightOpen} tip="打开 AI 面板" />
          </div>
        )}
      </div>

      <AssetSheet open={panels.asset} activeType={activeAssetType} onOpenChange={(v) => setPanels((p) => ({ ...p, asset: v }))}
        onTypeChange={setActiveAssetType} items={assetMap[activeAssetType]} allItems={assetMap}
        chapters={chapters.map((ch) => ({ id: ch.id, title: ch.title }))} organizations={orgs} characters={chars}
        onAdd={handleAddAsset} onSave={handleSaveAsset} onDelete={handleDeleteAsset}
        onGenerateAssetCard={handleGenerateAssetCard} generatingAssets={generatingAssets} />

      <OutlineSheet open={panels.outline} onOpenChange={(v) => setPanels((p) => ({ ...p, outline: v }))}
        outline={projectData?.outline || ""} chapters={chapters} onSave={handleSaveOutline} onGenerate={handleGenerateOutline}
        onNavigateChapter={(chId) => { handleSwitchChapter(chId); setPanels((p) => ({ ...p, outline: false })); }}
        aiConfig={aiConfig}
        onExtractAssets={handleExtractOutlineAssets} extractingAssets={extractingOutlineAssets}
        projectId={projectId}
        existingCharacters={chars.map((c: any) => ({ name: c.name, identity: c.identity, personality: c.personality }))}
        existingWorldItems={worlds.map((w: any) => ({ title: w.title, content: w.content }))} />

      <StatsPanel open={panels.stats} onOpenChange={(v) => setPanels((p) => ({ ...p, stats: v }))} stats={statsData} loading={statsLoading} />

      <SettingsSheet open={panels.settings} onOpenChange={(v) => setPanels((p) => ({ ...p, settings: v }))}
        projectForm={projectForm}
        onProjectFormChange={setProjectForm}
        onSave={handleSaveSettings} onExport={handleExport}
        onGenerateBible={handleGenerateBible} generatingBible={generatingBible}
        projectId={projectId}
        onDelete={async () => {
          if (!confirm("确定要删除此作品吗？此操作不可恢复。")) return;
          await fetch(`/api/projects?id=${projectId}`, { method: "DELETE" });
          toast.success("作品已删除"); router.push("/projects");
        }} />
    </div>
  );
}
