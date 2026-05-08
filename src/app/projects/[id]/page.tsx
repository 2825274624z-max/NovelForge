"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEditorStore } from "@/store/useStore";
import { useProject, useChapters, useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset, useUpdateProject, useSaveAISettings, useTestConnection, useStats, useTrackWords } from "@/lib/queries";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAIGeneration } from "@/hooks/useAIGeneration";
import { countWords } from "@/lib/word-count";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { FileText, Plus, Trash2, Sparkles, Users, Globe, Eye, ArrowLeft, Settings, Download, MapPin, Building2, Package, Clock, PanelRightClose, PanelRightOpen, ChevronDown, ChevronRight, BarChart3, Search, FileSearch } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatsPanel } from "@/components/stats-panel";
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
  const updateProject = useUpdateProject();
  const saveAISettings = useSaveAISettings();
  const testConnection = useTestConnection();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const trackWords = useTrackWords();

  // 编辑器状态
  const { currentChapterId, chapterContent, chapterTitle, saving, wordCount, loadChapter, setChapterContent, setChapterTitle, setWordCount, saveChapter, addChapter, deleteChapter } = useEditorStore();

  // AI 设定表单
  const defaultAI = { provider: "openai", model: "gpt-4o", baseUrl: "", apiKey: "", temperature: 0.7, maxTokens: 8192, topP: 1.0, frequencyPenalty: 0, presencePenalty: 0, reasoningEffort: "" };
  const [aiSettings, setAiSettings] = useState(defaultAI);

  // 项目表单
  const defaultForm = { title: "", type: "novel", genre: "", style: "", targetWords: 0, description: "", worldView: "", writingReqs: "" };
  const [projectForm, setProjectForm] = useState(defaultForm);

  // 同步远端 → 本地
  useEffect(() => {
    if (projectData?.aiSettings) setAiSettings({
      provider: projectData.aiSettings.provider || "openai", model: projectData.aiSettings.model || "gpt-4o",
      baseUrl: projectData.aiSettings.baseUrl || "", apiKey: projectData.aiSettings.apiKey || "",
      temperature: projectData.aiSettings.temperature ?? 0.7, maxTokens: projectData.aiSettings.maxTokens ?? 8192,
      topP: (projectData.aiSettings as any).topP ?? 1.0, frequencyPenalty: (projectData.aiSettings as any).frequencyPenalty ?? 0,
      presencePenalty: (projectData.aiSettings as any).presencePenalty ?? 0, reasoningEffort: (projectData.aiSettings as any).reasoningEffort || "",
    });
  }, [projectData?.id]);

  useEffect(() => {
    if (projectData) setProjectForm({
      title: projectData.title || "", type: projectData.type || "novel", genre: projectData.genre || "",
      style: projectData.style || "", targetWords: projectData.targetWords || 0,
      description: projectData.description || "", worldView: projectData.worldView || "", writingReqs: projectData.writingReqs || "",
    });
  }, [projectData?.id]);

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

  useEffect(() => {
    const toggle = () => setPanels((p) => ({ ...p, right: !p.right }));
    window.addEventListener("toggle-ai-panel", toggle);
    return () => window.removeEventListener("toggle-ai-panel", toggle);
  }, []);

  const aiGen = useAIGeneration({ projectForm, aiSettings, assets: { characters: chars, worldItems: worlds, locations: locs, orgs, items, fores, timelines: tls }, chapters, currentChapterId, currentChapterContent: chapterContent, projectOutline: projectData?.outline || "", projectId, editorRef });

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

  const prevSaving = useRef(false);
  useEffect(() => {
    if (prevSaving.current && !saving) trackDelta();
    prevSaving.current = saving;
  }, [saving, trackDelta]);

  // ─── Handlers ───
  const handleSave = useCallback(() => { if (currentChapterId) { saveChapter(currentChapterId); toast.success("已保存"); } }, [currentChapterId, saveChapter]);

  const handleAcceptSuggestion = useCallback(() => {
    if (suggestion) { editorRef.current?.appendText(suggestion); setSuggestion(null); toast.success("已采纳续写"); }
  }, [suggestion]);

  const handleDismissSuggestion = useCallback(() => setSuggestion(null), []);

  const handlePause = useCallback(async (ctx: string) => {
    try {
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: aiSettings.provider, model: aiSettings.model, baseUrl: aiSettings.baseUrl, apiKey: aiSettings.apiKey, temperature: 0.4, maxTokens: 200, workflow: "continue", message: "请根据上文，用3-5句话自然地续写下去，不添加场景说明：", context: `${projectForm.description ? `作品：${projectForm.description}\n` : ""}${projectForm.writingReqs ? `要求：${projectForm.writingReqs}\n` : ""}上文：${ctx}` }),
      });
      if (!res.ok) return;
      const reader = res.body?.getReader(); if (!reader) return;
      const decoder = new TextDecoder(); let result = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; result += decoder.decode(value, { stream: true }); }
      if (result.trim()) setSuggestion(result.trim());
    } catch { /* silent */ }
  }, [aiSettings, projectForm]);

  const handleAddAsset = async (type: AssetType) => {
    const defs: Record<AssetType, Record<string, string>> = { character: { name: "新角色" }, world: { title: "新条目" }, location: { name: "新地点" }, organization: { name: "新组织" }, item: { name: "新物品" }, fore: { title: "新伏笔" }, timeline: { title: "新事件" } };
    try { await createAsset.mutateAsync({ type, projectId, ...defs[type] }); toast.success("已添加"); } catch { toast.error("添加失败"); }
  };

  const handleSaveAsset = async (type: AssetType, id: string, data: Record<string, unknown>) => { await updateAsset.mutateAsync({ type, id, projectId, ...data }); };
  const handleDeleteAsset = async (type: AssetType, id: string) => { await deleteAsset.mutateAsync({ type, id, projectId }); toast.success("已删除"); };

  const handleSaveSettings = async () => {
    try { await updateProject.mutateAsync({ id: projectId, ...projectForm }); await saveAISettings.mutateAsync({ projectId, ...aiSettings }); toast.success("设置已保存"); setPanels((p) => ({ ...p, settings: false })); } catch { toast.error("保存失败"); }
  };

  const handleTestConnection = async () => {
    try { const r = await testConnection.mutateAsync(aiSettings); toast[r.success ? "success" : "error"](r.success ? `连接成功 — ${r.model || "OK"}` : `连接失败: ${r.message}`); } catch { toast.error("测试请求失败"); }
  };

  const handleExport = async (fmt: string) => {
    try {
      const res = await fetch(`/api/export?projectId=${projectId}&format=${fmt}`); if (!res.ok) throw new Error();
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${projectForm.title || "export"}.${fmt}`; a.click(); URL.revokeObjectURL(url);
      toast.success(`已导出 ${fmt.toUpperCase()}`);
    } catch { toast.error("导出失败"); }
  };

  const handleAddChapter = async () => {
    const ch = await addChapter(projectId);
    if (ch) { loadChapter(ch.id).then(() => editorRef.current?.replaceContent("")); toast.success("新章节已创建"); }
  };

  const handleSwitchChapter = (chId: string) => {
    if (currentChapterId) saveChapter(currentChapterId);
    loadChapter(chId).then(() => { const c = useEditorStore.getState().chapterContent; editorRef.current?.replaceContent(c || ""); });
  };

  const handleDeleteChapter = async (chId: string) => { await deleteChapter(chId); toast.success("章节已删除"); };

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
          provider: aiSettings.provider, model: aiSettings.model, baseUrl: aiSettings.baseUrl, apiKey: aiSettings.apiKey,
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
          provider: aiSettings.provider, model: aiSettings.model, baseUrl: aiSettings.baseUrl, apiKey: aiSettings.apiKey,
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
        provider: aiSettings.provider, model: aiSettings.model, baseUrl: aiSettings.baseUrl, apiKey: aiSettings.apiKey,
        temperature: aiSettings.temperature, maxTokens: aiSettings.maxTokens,
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
                      <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                      <span className="text-[11px] sm:text-[12px] lg:text-[13px] truncate flex-1">{ch.title || "未命名"}</span>
                      <span className="text-[8px] sm:text-[9px] text-muted-foreground/40 shrink-0">{ch.wordCount}</span>
                      <button className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-primary shrink-0" onClick={(e) => { e.stopPropagation(); handleSummarizeChapter(ch.id); }} title="生成摘要">
                        {summarizingId === ch.id ? <span className="w-2.5 h-2.5 border border-primary/30 rounded-full animate-spin border-t-primary" /> : <FileSearch className="w-2.5 h-2.5" />}
                      </button>
                      <button className="opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive shrink-0" onClick={(e) => { e.stopPropagation(); handleDeleteChapter(ch.id); }}>
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </TooltipTrigger>
                  {ch.summary && <TooltipContent side="right" className="max-w-[240px]"><span className="font-medium">{ch.title}</span><span className="text-muted-foreground ml-1">{ch.summary}</span></TooltipContent>}
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
            onWorkflowChange={aiGen.setWorkflow} onMessageChange={aiGen.setAiMessage} onContextChange={aiGen.setAiContext}
            onAssetsChange={aiGen.setAiAssets} onGenerate={aiGen.handleGenerate} onCancel={aiGen.handleCancel} onInsert={aiGen.handleInsert} onRetry={aiGen.handleRetry} />
        </div>
        {!panels.right && (
          <div className="border-l bg-muted/5 flex items-start pt-2 animate-in fade-in duration-200">
            <IconBtn onClick={() => setPanels((p) => ({ ...p, right: true }))} icon={PanelRightOpen} tip="打开 AI 面板" />
          </div>
        )}
      </div>

      <AssetSheet open={panels.asset} activeType={activeAssetType} onOpenChange={(v) => setPanels((p) => ({ ...p, asset: v }))}
        onTypeChange={setActiveAssetType} items={assetMap[activeAssetType]}
        chapters={chapters.map((ch) => ({ id: ch.id, title: ch.title }))} organizations={orgs} characters={chars}
        onAdd={handleAddAsset} onSave={handleSaveAsset} onDelete={handleDeleteAsset} />

      <OutlineSheet open={panels.outline} onOpenChange={(v) => setPanels((p) => ({ ...p, outline: v }))}
        outline={projectData?.outline || ""} onSave={handleSaveOutline} onGenerate={handleGenerateOutline} />

      <StatsPanel open={panels.stats} onOpenChange={(v) => setPanels((p) => ({ ...p, stats: v }))} stats={statsData} loading={statsLoading} />

      <SettingsSheet open={panels.settings} onOpenChange={(v) => setPanels((p) => ({ ...p, settings: v }))}
        projectForm={projectForm} aiSettings={aiSettings} testing={testConnection.isPending}
        onProjectFormChange={setProjectForm} onAiSettingsChange={setAiSettings}
        onSave={handleSaveSettings} onTestConnection={handleTestConnection} onExport={handleExport}
        onDelete={async () => {
          if (!confirm("确定要删除此作品吗？此操作不可恢复。")) return;
          await fetch(`/api/projects?id=${projectId}`, { method: "DELETE" });
          toast.success("作品已删除"); router.push("/projects");
        }} />
    </div>
  );
}
