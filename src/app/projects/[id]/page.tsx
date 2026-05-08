"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEditorStore, useProjectStore, useAIStore } from "@/store/useStore";
import { countWords } from "@/lib/word-count";
import { estimateTokens, truncateByTokens } from "@/lib/token-count";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  FileText, Plus, Trash2, Sparkles, Users, Globe, Eye, ArrowLeft,
  Settings, Download, MapPin, Building2, Package, Clock,
  PanelRightClose, PanelRightOpen, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { EditorPanel } from "./editor-panel";
import { AIPanel } from "./ai-panel";
import { AssetSheet } from "./asset-sheet";
import { SettingsSheet } from "./settings-sheet";

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

const ASSET_API: Record<AssetType, string> = {
  character: "/api/characters", world: "/api/world-building", location: "/api/locations",
  organization: "/api/organizations", item: "/api/items", fore: "/api/foreshadowings", timeline: "/api/timelines",
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ─── Panel state ───
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [assetSheetOpen, setAssetSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [activeAssetType, setActiveAssetType] = useState<AssetType>("character");
  const [assetListExpanded, setAssetListExpanded] = useState(true);
  const [testing, setTesting] = useState(false);

  // ─── Project ───
  const [projectName, setProjectName] = useState("");
  const [projectForm, setProjectForm] = useState({
    title: "", type: "novel", genre: "", style: "", targetWords: 0,
    description: "", worldView: "", writingReqs: "",
  });
  const [aiSettings, setAiSettings] = useState({
    provider: "openai", model: "gpt-4o", baseUrl: "", apiKey: "",
    temperature: 0.7, maxTokens: 4096,
  });

  // ─── Editor ───
  const {
    chapters, currentChapterId, chapterContent, chapterTitle, saving, wordCount,
    fetchChapters, loadChapter, setChapterContent, setChapterTitle,
    setWordCount, saveChapter, addChapter, deleteChapter,
  } = useEditorStore();
  const { fetchProjects, setCurrentProject } = useProjectStore();
  const { generating, streamingContent, setGenerating, setStreamingContent, setError } = useAIStore();

  // ─── AI ───
  const [workflow, setWorkflow] = useState("draft");
  const [aiMessage, setAiMessage] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [aiAssets, setAiAssets] = useState<Record<string, boolean>>({
    characters: true, world: true, locations: true, organizations: true, items: true, fore: true, timeline: true,
  });

  // ─── Assets ───
  const [characters, setCharacters] = useState<AssetEntry[]>([]);
  const [worldItems, setWorldItems] = useState<AssetEntry[]>([]);
  const [locations, setLocations] = useState<AssetEntry[]>([]);
  const [orgs, setOrgs] = useState<AssetEntry[]>([]);
  const [items, setItems] = useState<AssetEntry[]>([]);
  const [fores, setFores] = useState<AssetEntry[]>([]);
  const [timelines, setTimelines] = useState<AssetEntry[]>([]);

  const assetMap: Record<AssetType, AssetEntry[]> = {
    character: characters, world: worldItems, location: locations,
    organization: orgs, item: items, fore: fores, timeline: timelines,
  };

  // ─── Load data ───
  useEffect(() => {
    fetch(`/api/projects?id=${projectId}`).then((r) => r.json()).then((data) => {
      if (!data) return;
      setProjectName(data.title);
      setProjectForm({
        title: data.title || "", type: data.type || "novel", genre: data.genre || "",
        style: data.style || "", targetWords: data.targetWords || 0,
        description: data.description || "", worldView: data.worldView || "",
        writingReqs: data.writingReqs || "",
      });
      if (data.aiSettings) setAiSettings({
        provider: data.aiSettings.provider || "openai", model: data.aiSettings.model || "gpt-4o",
        baseUrl: data.aiSettings.baseUrl || "", apiKey: data.aiSettings.apiKey || "",
        temperature: data.aiSettings.temperature || 0.7, maxTokens: data.aiSettings.maxTokens || 4096,
      });
    });
  }, [projectId]);

  useEffect(() => {
    fetchChapters(projectId);
    fetchProjects().then(() => {
      const p = useProjectStore.getState().projects.find((x) => x.id === projectId);
      if (p) { setCurrentProject(p); setProjectName(p.title); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadAssets = useCallback(() => {
    fetch(`/api/assets?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.characters) setCharacters(data.characters);
        if (data.worldBuilding) setWorldItems(data.worldBuilding);
        if (data.locations) setLocations(data.locations);
        if (data.organizations) setOrgs(data.organizations);
        if (data.items) setItems(data.items);
        if (data.foreshadowings) setFores(data.foreshadowings);
        if (data.timelines) setTimelines(data.timelines);
      });
  }, [projectId]);
  useEffect(() => { loadAssets(); }, [loadAssets]);

  // ─── Auto-save ───
  useEffect(() => {
    if (currentChapterId && chapterContent) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveChapter(currentChapterId), 2000);
    }
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterContent, currentChapterId]);
  useEffect(() => { setWordCount(countWords(chapterContent)); }, [chapterContent, setWordCount]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      // Ctrl+S / Cmd+S: manual save
      if (e.key === "s") { e.preventDefault(); if (currentChapterId) saveChapter(currentChapterId); toast.success("已保存"); }
      // Ctrl+N / Cmd+N: new chapter
      if (e.key === "n") { e.preventDefault(); addChapter(projectId).then((ch) => { if (ch) loadChapter(ch.id); }); }
      // Ctrl+Shift+A: toggle AI panel
      if (e.key === "a" && e.shiftKey) { e.preventDefault(); setRightPanelOpen((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentChapterId, projectId, saveChapter, addChapter, loadChapter]);

  // ─── AI ───
  const buildContext = () => {
    const raw = [
      projectForm.description && `简介：${projectForm.description}`,
      projectForm.worldView && `世界观：${projectForm.worldView}`,
      projectForm.writingReqs && `写作要求：${projectForm.writingReqs}`,
      aiAssets.characters && characters.length > 0 && `角色：${characters.map((c) => `${c.name}${c.identity ? `（${c.identity}）` : ""}`).join("、")}`,
      aiAssets.world && worldItems.length > 0 && `世界观条目：${worldItems.map((w) => w.title).join("、")}`,
      aiAssets.locations && locations.length > 0 && `地点：${locations.map((l) => l.name).join("、")}`,
      aiAssets.organizations && orgs.length > 0 && `组织：${orgs.map((o) => o.name).join("、")}`,
      aiAssets.items && items.length > 0 && `物品：${items.map((i) => i.name).join("、")}`,
      aiAssets.fore && fores.length > 0 && `伏笔：${fores.map((f) => f.title).join("、")}`,
      aiAssets.timeline && timelines.length > 0 && `时间线：${timelines.map((t) => t.title).join("、")}`,
      aiContext,
    ].filter(Boolean).join("\n");
    return truncateByTokens(raw, Math.floor(aiSettings.maxTokens * 0.7));
  };

  const contextTokenCount = estimateTokens(buildContext());

  const handleGenerate = async () => {
    if (!aiMessage && workflow !== "draft") { toast.error("请输入提示词"); return; }
    if (abortRef.current) { abortRef.current.abort(); return; }
    setGenerating(true); setStreamingContent(""); setError(null);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const ctx = buildContext();
      const curContent = ["polish", "expand", "shorten", "rewrite", "consistency"].includes(workflow) ? chapterContent : "";
      const msg = curContent ? `${aiMessage}\n\n---\n${curContent}` : aiMessage;
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: aiSettings.provider, model: aiSettings.model, baseUrl: aiSettings.baseUrl, apiKey: aiSettings.apiKey, temperature: aiSettings.temperature, maxTokens: aiSettings.maxTokens, workflow, message: msg, context: ctx }),
        signal: controller.signal,
      });
      if (!res.ok) { const e = await res.text(); throw new Error(e); }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder(); let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setStreamingContent(result);
      }
      if (["draft", "continue"].includes(workflow)) setChapterContent(chapterContent + "\n\n" + result);
      else if (["polish", "expand", "shorten", "rewrite"].includes(workflow)) setChapterContent(result);
      fetch("/api/ai/generations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, chapterId: currentChapterId, workflow, model: aiSettings.model, provider: aiSettings.provider, prompt: aiMessage.substring(0, 1000), systemPrompt: ctx, output: result, temperature: aiSettings.temperature, maxTokens: aiSettings.maxTokens }),
      }).catch(() => {});
    } catch (e) {
      if ((e as Error).name === "AbortError") toast.info("生成已取消");
      else { const m = e instanceof Error ? e.message : "AI 请求失败"; setError(m); toast.error(m); }
    } finally { setGenerating(false); abortRef.current = null; }
  };

  // ─── Asset operations ───
  const handleAddAsset = async (type: AssetType) => {
    const defaults: Record<AssetType, Record<string, string>> = {
      character: { name: "新角色" }, world: { title: "新条目" }, location: { name: "新地点" },
      organization: { name: "新组织" }, item: { name: "新物品" }, fore: { title: "新伏笔" }, timeline: { title: "新事件" },
    };
    await fetch(ASSET_API[type], {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, ...defaults[type] }),
    });
    loadAssets(); toast.success("已添加");
  };

  const handleSaveAsset = async (type: AssetType, id: string, data: Record<string, unknown>) => {
    await fetch(`${ASSET_API[type]}?id=${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    loadAssets();
  };

  const handleDeleteAsset = async (type: AssetType, id: string) => {
    await fetch(`${ASSET_API[type]}?id=${id}`, { method: "DELETE" });
    loadAssets(); toast.success("已删除");
  };

  // ─── Settings ───
  const handleSaveSettings = async () => {
    try {
      await fetch(`/api/projects?id=${projectId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(projectForm) });
      await fetch("/api/ai/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, ...aiSettings }) });
      setProjectName(projectForm.title); toast.success("设置已保存"); setSettingsSheetOpen(false);
    } catch { toast.error("保存失败"); }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const r = await (await fetch("/api/ai/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(aiSettings) })).json();
      if (r.success) toast.success(`连接成功 — ${r.model || "OK"}`); else toast.error(`连接失败: ${r.message}`);
    } catch { toast.error("测试请求失败"); }
    finally { setTesting(false); }
  };

  const handleExport = async (format: string) => {
    try {
      const res = await fetch(`/api/export?projectId=${projectId}&format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${projectForm.title || "export"}.${format}`;
      a.click(); URL.revokeObjectURL(url); toast.success(`已导出 ${format.toUpperCase()}`);
    } catch { toast.error("导出失败"); }
  };

  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const wordProgress = projectForm.targetWords > 0 ? Math.min(100, Math.round((totalWords / projectForm.targetWords) * 100)) : 0;

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* ─── Top Bar ─── */}
      <header className="h-10 border-b flex items-center px-3 gap-2 shrink-0 bg-muted/10">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push("/projects")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-[13px] font-semibold truncate max-w-[180px]">{projectName || "加载中..."}</span>
        <span className="text-[10px] text-muted-foreground hidden sm:inline">
          {totalWords.toLocaleString()}/{projectForm.targetWords.toLocaleString()} 字
        </span>
        {wordProgress > 0 && (
          <div className="w-12 h-1 bg-muted rounded-full overflow-hidden hidden sm:block">
            <div className="h-full bg-primary/50 rounded-full transition-all" style={{ width: `${wordProgress}%` }} />
          </div>
        )}
        <div className="flex-1" />
        {saving && <span className="text-[10px] text-muted-foreground/60 animate-pulse">保存中</span>}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExport("md")} title="导出">
          <Download className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSettingsSheetOpen(true)} title="设置">
          <Settings className="w-3.5 h-3.5" />
        </Button>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Sidebar ─── */}
        <aside className="border-r flex flex-col shrink-0 bg-muted/5" style={{ width: "clamp(180px, 15vw, 260px)" }}>
          <div className="p-2 border-b flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">章节</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={async () => {
              const ch = await addChapter(projectId);
              if (ch) { loadChapter(ch.id); toast.success("新章节已创建"); }
            }}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <TooltipProvider delay={600}>
            <div className="p-1 space-y-0.5">
              {chapters.map((ch, i) => (
                <Tooltip key={ch.id}>
                  <TooltipTrigger>
                    <div
                      onClick={() => {
                        if (currentChapterId) saveChapter(currentChapterId);
                        loadChapter(ch.id);
                      }}
                      className={`group flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                        currentChapterId === ch.id
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-[10px] font-mono text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                      <span className="text-[12px] lg:text-[13px] truncate flex-1">{ch.title || "未命名"}</span>
                      <span className="text-[9px] text-muted-foreground/40 shrink-0">{ch.wordCount}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive shrink-0"
                        onClick={(e) => { e.stopPropagation(); deleteChapter(ch.id); toast.success("章节已删除"); }}
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
            </TooltipProvider>
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
                {ASSET_DEFS.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => { setActiveAssetType(type); setAssetSheetOpen(true); }}
                    className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="flex-1 text-left">{label}</span>
                    <span className="text-[9px] opacity-40">{assetMap[type].length}</span>
                  </button>
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
        </aside>

        {/* ─── Center: Editor ─── */}
        <EditorPanel
          chapterTitle={chapterTitle}
          chapterContent={chapterContent}
          wordCount={wordCount}
          saving={saving}
          onTitleChange={setChapterTitle}
          onContentChange={setChapterContent}
        />

        {/* ─── Right: AI Panel ─── */}
        {rightPanelOpen ? (
          <aside className="border-l flex flex-col shrink-0 bg-muted/5" style={{ width: "clamp(300px, 24vw, 480px)" }}>
            <div className="border-b flex items-center px-2 py-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />AI 助手
              </span>
              <div className="flex-1" />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRightPanelOpen(false)}>
                <PanelRightClose className="w-3.5 h-3.5" />
              </Button>
            </div>
            <AIPanel
              workflow={workflow}
              aiMessage={aiMessage}
              aiContext={aiContext}
              aiAssets={aiAssets}
              generating={generating}
              streamingContent={streamingContent}
              contextTokenCount={contextTokenCount}
              onWorkflowChange={setWorkflow}
              onMessageChange={setAiMessage}
              onContextChange={setAiContext}
              onAssetsChange={setAiAssets}
              onGenerate={handleGenerate}
              onCancel={() => { abortRef.current?.abort(); abortRef.current = null; }}
              onInsert={() => { setChapterContent(chapterContent + "\n\n" + streamingContent); toast.success("已插入正文"); }}
              onRetry={() => { setStreamingContent(""); handleGenerate(); }}
            />
          </aside>
        ) : (
          <div className="border-l bg-muted/5 flex items-start pt-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRightPanelOpen(true)} title="打开 AI 面板">
              <PanelRightOpen className="w-4 h-4" />
            </Button>
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

      {/* ─── Settings Sheet ─── */}
      <SettingsSheet
        open={settingsSheetOpen}
        onOpenChange={setSettingsSheetOpen}
        projectForm={projectForm}
        aiSettings={aiSettings}
        testing={testing}
        onProjectFormChange={setProjectForm}
        onAiSettingsChange={setAiSettings}
        onSave={handleSaveSettings}
        onTestConnection={handleTestConnection}
        onExport={handleExport}
        onDelete={async () => {
          if (!confirm("确定要删除此作品吗？此操作不可恢复。")) return;
          await fetch(`/api/projects?id=${projectId}`, { method: "DELETE" });
          toast.success("作品已删除"); router.push("/projects");
        }}
      />
    </div>
  );
}
