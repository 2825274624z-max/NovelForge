"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEditorStore } from "@/store/useStore";
import { useProject, useChapters, useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset, useUpdateProject, useSaveAISettings, useTestConnection } from "@/lib/queries";
import { useStats, useTrackWords } from "@/lib/queries";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAIGeneration } from "@/hooks/useAIGeneration";
import { countWords } from "@/lib/word-count";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  FileText, Plus, Trash2, Sparkles, Users, Globe, Eye, ArrowLeft,
  Settings, Download, MapPin, Building2, Package, Clock,
  PanelRightClose, PanelRightOpen, ChevronDown, ChevronRight,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatsPanel } from "@/components/stats-panel";
import { EditorPanel } from "./editor-panel";
import { AIPanel } from "./ai-panel";
import { AssetSheet } from "./asset-sheet";
import { SettingsSheet } from "./settings-sheet";
import type { TiptapEditorHandle } from "@/components/tiptap-editor";

type AssetType = "character" | "world" | "location" | "organization" | "item" | "fore" | "timeline";
type AssetEntry = Record<string, string>;

const ASSET_DEFS: { type: AssetType; label: string; icon: typeof FileText }[] = [
  { type: "character", label: "角色卡", icon: Users },
  { type: "world", label: "世界观", icon: Globe },
  { type: "location", label: "地点", icon: MapPin },
  { type: "organization", label: "组织", icon: Building2 },
  { type: "item", label: "物品/能力", icon: Package },
  { type: "fore", label: "伏笔", icon: Eye },
  { type: "timeline", label: "时间线", icon: Clock },
];

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // ─── Panel state ───
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [assetSheetOpen, setAssetSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [statsSheetOpen, setStatsSheetOpen] = useState(false);
  const [activeAssetType, setActiveAssetType] = useState<AssetType>("character");
  const [assetListExpanded, setAssetListExpanded] = useState(true);

  // ─── React Query: server data ───
  const { data: projectData } = useProject(projectId);
  const { data: chapters = [] } = useChapters(projectId);
  const { data: assetsData } = useAssets(projectId);
  const updateProject = useUpdateProject();
  const saveAISettings = useSaveAISettings();
  const testConnection = useTestConnection();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const { data: statsData, isLoading: statsLoading } = useStats(projectId);
  const trackWords = useTrackWords();
  const lastTrackedWordCount = useRef<number>(0);
  const lastTrackedDate = useRef<string>("");

  // ─── AI Settings (local form state) ───
  const [aiSettings, setAiSettings] = useState({
    provider: "openai", model: "gpt-4o", baseUrl: "", apiKey: "",
    temperature: 0.7, maxTokens: 4096,
  });

  // Sync project data → AI settings form
  useEffect(() => {
    if (projectData?.aiSettings) {
      setAiSettings({
        provider: projectData.aiSettings.provider || "openai",
        model: projectData.aiSettings.model || "gpt-4o",
        baseUrl: projectData.aiSettings.baseUrl || "",
        apiKey: projectData.aiSettings.apiKey || "",
        temperature: projectData.aiSettings.temperature || 0.7,
        maxTokens: projectData.aiSettings.maxTokens || 4096,
      });
    }
  }, [projectData?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Project form (for settings) ───
  const [projectForm, setProjectForm] = useState({
    title: "", type: "novel", genre: "", style: "", targetWords: 0,
    description: "", worldView: "", writingReqs: "",
  });

  useEffect(() => {
    if (projectData) {
      setProjectForm({
        title: projectData.title || "", type: projectData.type || "novel",
        genre: projectData.genre || "", style: projectData.style || "",
        targetWords: projectData.targetWords || 0,
        description: projectData.description || "",
        worldView: projectData.worldView || "",
        writingReqs: projectData.writingReqs || "",
      });
    }
  }, [projectData?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Inline AI suggestion ───
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleAcceptSuggestion = useCallback(() => {
    if (suggestion) {
      editorRef.current?.appendText(suggestion);
      setSuggestion(null);
      toast.success("已采纳续写");
    }
  }, [suggestion]);

  const handleDismissSuggestion = useCallback(() => {
    setSuggestion(null);
  }, []);

  const handlePause = useCallback(async (context: string) => {
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiSettings.provider,
          model: aiSettings.model,
          baseUrl: aiSettings.baseUrl,
          apiKey: aiSettings.apiKey,
          temperature: 0.4,
          maxTokens: 200,
          workflow: "continue",
          message: "请根据上文，用3-5句话自然地续写下去，不添加场景说明：",
          context: `${projectForm.description ? `作品：${projectForm.description}\n` : ""}${projectForm.writingReqs ? `要求：${projectForm.writingReqs}\n` : ""}上文：${context}`,
        }),
      });
      if (!res.ok) return;
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }
      if (result.trim()) setSuggestion(result.trim());
    } catch {
      // Silently fail
    }
  }, [aiSettings, projectForm]);

  // ─── Editor state (Zustand) ───
  const {
    currentChapterId, chapterContent, chapterTitle, saving, wordCount,
    loadChapter, setChapterContent, setChapterTitle,
    setWordCount, saveChapter, addChapter, deleteChapter,
  } = useEditorStore();

  // ─── Assets (derived from React Query) ───
  const characters = (assetsData?.characters ?? []) as AssetEntry[];
  const worldItems = (assetsData?.worldBuilding ?? []) as AssetEntry[];
  const locations = (assetsData?.locations ?? []) as AssetEntry[];
  const orgs = (assetsData?.organizations ?? []) as AssetEntry[];
  const items = (assetsData?.items ?? []) as AssetEntry[];
  const fores = (assetsData?.foreshadowings ?? []) as AssetEntry[];
  const timelines = (assetsData?.timelines ?? []) as AssetEntry[];

  const assetMap: Record<AssetType, AssetEntry[]> = {
    character: characters, world: worldItems, location: locations,
    organization: orgs, item: items, fore: fores, timeline: timelines,
  };

  // ─── Custom hooks ───
  useAutoSave();
  useKeyboardShortcuts(projectId);

  const editorRef = useRef<TiptapEditorHandle | null>(null);

  useEffect(() => {
    const toggle = () => setRightPanelOpen((v) => !v);
    window.addEventListener("toggle-ai-panel", toggle);
    return () => window.removeEventListener("toggle-ai-panel", toggle);
  }, []);

  const aiGen = useAIGeneration({
    projectForm,
    aiSettings,
    assets: { characters, worldItems, locations, orgs, items, fores, timelines },
    currentChapterId,
    projectId,
    editorRef,
  });

  // ─── Project name for top bar ───
  const projectName = projectData?.title || "加载中...";

  // ─── Word count effect ───
  useEffect(() => {
    const text = editorRef.current?.getText() || "";
    setWordCount(countWords(text));
  }, [chapterContent, setWordCount]);

  // ─── Word tracking (delta-based) ───
  useEffect(() => {
    const wc = countWords(editorRef.current?.getText() || "");
    lastTrackedWordCount.current = wc;
    lastTrackedDate.current = new Date().toISOString().slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapterId]);

  const trackWordDelta = useCallback(() => {
    const newWC = countWords(editorRef.current?.getText() || "");
    const delta = newWC - lastTrackedWordCount.current;
    const today = new Date().toISOString().slice(0, 10);

    if (lastTrackedDate.current !== today) {
      if (delta > 0) {
        trackWords.mutate({ projectId, date: lastTrackedDate.current || today, wordCount: delta });
      }
      lastTrackedWordCount.current = newWC;
      lastTrackedDate.current = today;
      return;
    }

    if (delta > 0) {
      trackWords.mutate({ projectId, date: today, wordCount: delta });
      lastTrackedWordCount.current = newWC;
    }
  }, [projectId, trackWords]);

  const prevSaving = useRef(false);
  useEffect(() => {
    if (prevSaving.current && !saving) {
      trackWordDelta();
    }
    prevSaving.current = saving;
  }, [saving, trackWordDelta]);

  // ─── Asset operations ───
  const handleAddAsset = async (type: AssetType) => {
    const defaults: Record<AssetType, Record<string, string>> = {
      character: { name: "新角色" }, world: { title: "新条目" },
      location: { name: "新地点" }, organization: { name: "新组织" },
      item: { name: "新物品" }, fore: { title: "新伏笔" }, timeline: { title: "新事件" },
    };
    try {
      await createAsset.mutateAsync({ type, projectId, ...defaults[type] });
      toast.success("已添加");
    } catch { toast.error("添加失败"); }
  };

  const handleSaveAsset = async (type: AssetType, id: string, data: Record<string, unknown>) => {
    await updateAsset.mutateAsync({ type, id, projectId, ...data });
  };

  const handleDeleteAsset = async (type: AssetType, id: string) => {
    await deleteAsset.mutateAsync({ type, id, projectId });
    toast.success("已删除");
  };

  // ─── Settings ───
  const handleSaveSettings = async () => {
    try {
      await updateProject.mutateAsync({ id: projectId, ...projectForm });
      await saveAISettings.mutateAsync({ projectId, ...aiSettings });
      toast.success("设置已保存");
      setSettingsSheetOpen(false);
    } catch { toast.error("保存失败"); }
  };

  const handleTestConnection = async () => {
    try {
      const r = await testConnection.mutateAsync(aiSettings);
      if (r.success) toast.success(`连接成功 — ${r.model || "OK"}`);
      else toast.error(`连接失败: ${r.message}`);
    } catch { toast.error("测试请求失败"); }
  };

  const handleExport = async (format: string) => {
    try {
      const res = await fetch(`/api/export?projectId=${projectId}&format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${projectForm.title || "export"}.${format}`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(`已导出 ${format.toUpperCase()}`);
    } catch { toast.error("导出失败"); }
  };

  // ─── Chapter operations ───
  const handleAddChapter = async () => {
    const ch = await addChapter(projectId);
    if (ch) {
      loadChapter(ch.id).then(() => {
        editorRef.current?.replaceContent("");
      });
      toast.success("新章节已创建");
    }
  };

  const handleSwitchChapter = (chId: string) => {
    if (currentChapterId) saveChapter(currentChapterId);
    loadChapter(chId).then(() => {
      const { chapterContent: newContent } = useEditorStore.getState();
      editorRef.current?.replaceContent(newContent || "");
    });
  };

  const handleDeleteChapter = async (chId: string) => {
    await deleteChapter(chId);
    toast.success("章节已删除");
  };

  // ─── Computed ───
  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const wordProgress = projectForm.targetWords > 0
    ? Math.min(100, Math.round((totalWords / projectForm.targetWords) * 100))
    : 0;

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* ─── Top Bar ─── */}
      <header className="h-10 border-b flex items-center px-3 gap-2 shrink-0 bg-muted/5 glass">
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" className="h-7 w-7 transition-transform duration-200 hover:scale-110 active:scale-95" onClick={() => router.push("/projects")}>
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>返回作品列表</TooltipContent>
        </Tooltip>
        <span className="text-[11px] sm:text-[13px] font-semibold truncate max-w-[120px] sm:max-w-[180px] animate-slide-up">{projectName}</span>
        <span className="text-[9px] sm:text-[10px] text-muted-foreground hidden sm:inline tabular-nums">
          {totalWords.toLocaleString()}<span className="text-muted-foreground/40">/</span>{projectForm.targetWords.toLocaleString()} 字
        </span>
        {wordProgress > 0 && (
          <div className="w-12 h-1 bg-muted/50 rounded-full overflow-hidden hidden sm:block">
            <div className="h-full bg-primary/60 rounded-full transition-all duration-700 ease-out" style={{ width: `${wordProgress}%` }} />
          </div>
        )}
        <div className="flex-1" />
        {saving && <span className="text-[9px] sm:text-[10px] text-muted-foreground/60 animate-breathe">保存中</span>}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" className="h-7 w-7 transition-all duration-200 hover:scale-110 hover:text-primary active:scale-90" onClick={() => setStatsSheetOpen(true)}>
              <BarChart3 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>写作统计</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" className="h-7 w-7 transition-all duration-200 hover:scale-110 hover:text-primary active:scale-90" onClick={() => handleExport("md")}>
              <Download className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>导出 MD</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" className="h-7 w-7 transition-all duration-200 hover:scale-110 hover:text-primary active:scale-90" onClick={() => setSettingsSheetOpen(true)}>
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>作品设置</TooltipContent>
        </Tooltip>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Sidebar ─── */}
        <aside className="flex border-r flex-col shrink-0 bg-muted/5" style={{ width: "clamp(140px, 13vw, 240px)" }}>
          <TooltipProvider delay={500}>
          <div className="p-2 border-b flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">章节</span>
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleAddChapter}>
                  <Plus className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>新建章节</TooltipContent>
            </Tooltip>
          </div>
          <ScrollArea className="flex-1 scroll-thin">
            <div className="p-1 space-y-0.5">
              {chapters.map((ch, i) => (
                <Tooltip key={ch.id}>
                  <TooltipTrigger>
                    <div
                      onClick={() => handleSwitchChapter(ch.id)}
                      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-all duration-200 ${
                        currentChapterId === ch.id
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20 shadow-sm"
                          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground hover:translate-x-0.5"
                      }`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                      <span className="text-[11px] sm:text-[12px] lg:text-[13px] truncate flex-1">{ch.title || "未命名"}</span>
                      <span className="text-[8px] sm:text-[9px] text-muted-foreground/40 shrink-0">{ch.wordCount}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleDeleteChapter(ch.id); }}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </TooltipTrigger>
                  {ch.summary && (
                    <TooltipContent side="right" className="max-w-[240px]">
                      <span className="font-medium">{ch.title}</span>
                      <span className="text-muted-foreground ml-1">{ch.summary}</span>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
              {chapters.length === 0 && (
                <div className="text-[11px] text-muted-foreground text-center py-10 px-3">点击 + 创建章节</div>
              )}
            </div>
          </ScrollArea>

          {/* Assets */}
          <div className="border-t p-1.5">
            <button
              onClick={() => setAssetListExpanded(!assetListExpanded)}
              className="w-full flex items-center justify-between px-1 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              资产库
              {assetListExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            {assetListExpanded && (
              <div className="mt-0.5 space-y-0.5">
                {ASSET_DEFS.map(({ type, label, icon: Icon }, i) => (
                  <Tooltip key={type}>
                    <TooltipTrigger>
                      <button
                        onClick={() => { setActiveAssetType(type); setAssetSheetOpen(true); }}
                        style={{ animationDelay: `${i * 40}ms` }}
                        className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5 transition-all duration-200 animate-float-in"
                      >
                        <Icon className="w-3 h-3 shrink-0" />
                        <span className="flex-1 text-left">{label}</span>
                        <span className="text-[9px] opacity-40">{assetMap[type].length}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{label} · {assetMap[type].length} 项</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
            {/* Watermark */}
            <div className="mt-auto pt-2 pb-1.5 px-2 border-t border-border/20">
              <p className="text-[9px] text-muted-foreground/30 text-center leading-relaxed">
                Yuagent · 斗包要打野 · 2825274624z@gmail.com
              </p>
            </div>
          </div>
          </TooltipProvider>
        </aside>

        {/* ─── Center: Editor ─── */}
        <EditorPanel
          chapterTitle={chapterTitle}
          chapterContent={chapterContent}
          wordCount={wordCount}
          saving={saving}
          onTitleChange={setChapterTitle}
          onContentChange={setChapterContent}
          editorRef={editorRef}
          suggestion={suggestion}
          onAcceptSuggestion={handleAcceptSuggestion}
          onDismissSuggestion={handleDismissSuggestion}
          onPause={handlePause}
        />

        {/* ─── Right: AI Panel ─── */}
        {rightPanelOpen ? (
          <aside className="border-l flex-col shrink-0 bg-muted/5 animate-in slide-in-from-right duration-300 flex" style={{ width: "clamp(280px, 24vw, 480px)" }}>
            <div className="border-b flex items-center px-2 py-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />AI 助手
              </span>
              <div className="flex-1" />
              <Tooltip>
                <TooltipTrigger>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRightPanelOpen(false)}>
                    <PanelRightClose className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>关闭 AI 面板</TooltipContent>
              </Tooltip>
            </div>
            <AIPanel
              workflow={aiGen.workflow}
              aiMessage={aiGen.aiMessage}
              aiContext={aiGen.aiContext}
              aiAssets={aiGen.aiAssets}
              generating={aiGen.generating}
              streamingContent={aiGen.streamingContent}
              contextTokenCount={aiGen.contextTokenCount}
              onWorkflowChange={aiGen.setWorkflow}
              onMessageChange={aiGen.setAiMessage}
              onContextChange={aiGen.setAiContext}
              onAssetsChange={aiGen.setAiAssets}
              onGenerate={aiGen.handleGenerate}
              onCancel={aiGen.handleCancel}
              onInsert={aiGen.handleInsert}
              onRetry={aiGen.handleRetry}
            />
          </aside>
        ) : (
          <div className="border-l bg-muted/5 flex items-start pt-2">
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRightPanelOpen(true)}>
                  <PanelRightOpen className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>打开 AI 面板</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* ─── Asset Sheet ─── */}
      <AssetSheet
        open={assetSheetOpen}
        activeType={activeAssetType}
        onOpenChange={setAssetSheetOpen}
        onTypeChange={setActiveAssetType}
        items={assetMap[activeAssetType]}
        chapters={chapters.map((ch) => ({ id: ch.id, title: ch.title }))}
        organizations={orgs}
        characters={characters}
        onAdd={handleAddAsset}
        onSave={handleSaveAsset}
        onDelete={handleDeleteAsset}
      />

      {/* ─── Stats Sheet ─── */}
      <StatsPanel
        open={statsSheetOpen}
        onOpenChange={setStatsSheetOpen}
        stats={statsData}
        loading={statsLoading}
      />

      {/* ─── Settings Sheet ─── */}
      <SettingsSheet
        open={settingsSheetOpen}
        onOpenChange={setSettingsSheetOpen}
        projectForm={projectForm}
        aiSettings={aiSettings}
        testing={testConnection.isPending}
        onProjectFormChange={setProjectForm}
        onAiSettingsChange={setAiSettings}
        onSave={handleSaveSettings}
        onTestConnection={handleTestConnection}
        onExport={handleExport}
        onDelete={async () => {
          if (!confirm("确定要删除此作品吗？此操作不可恢复。")) return;
          await fetch(`/api/projects?id=${projectId}`, { method: "DELETE" });
          toast.success("作品已删除");
          router.push("/projects");
        }}
      />
    </div>
  );
}
