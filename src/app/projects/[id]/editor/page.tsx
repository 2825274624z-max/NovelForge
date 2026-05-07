"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useEditorStore,
  useProjectStore,
  useAIStore,
  type ChapterItem,
} from "@/store/useStore";
import { countWords } from "@/lib/word-count";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Trash2,
  Settings,
  ArrowLeft,
  Wand2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

const WORKFLOWS = [
  { value: "draft", label: "生成草稿" },
  { value: "continue", label: "续写" },
  { value: "polish", label: "润色" },
  { value: "expand", label: "扩写" },
  { value: "shorten", label: "缩写" },
  { value: "summary", label: "总结章节" },
  { value: "outline", label: "生成大纲" },
];

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const [projectName, setProjectName] = useState("");

  const {
    chapters,
    currentChapterId,
    chapterContent,
    chapterTitle,
    saving,
    wordCount,
    fetchChapters,
    loadChapter,
    setChapterContent,
    setChapterTitle,
    setWordCount,
    saveChapter,
    addChapter,
    deleteChapter,
  } = useEditorStore();

  const { fetchProjects, setCurrentProject } = useProjectStore();
  const { generating, streamingContent, setGenerating, setStreamingContent, setError } = useAIStore();

  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [workflow, setWorkflow] = useState("draft");
  const [aiMessage, setAiMessage] = useState("");
  const [aiContext, setAiContext] = useState("");
  const [chapterListOpen, setChapterListOpen] = useState(true);

  useEffect(() => {
    fetchChapters(projectId);
    fetchProjects().then(() => {
      const p = useProjectStore.getState().projects.find((x) => x.id === projectId);
      if (p) {
        setCurrentProject(p);
        setProjectName(p.title);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Auto-save
  useEffect(() => {
    if (currentChapterId && chapterContent) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveChapter(currentChapterId);
      }, 2000);
    }
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterContent, currentChapterId]);

  useEffect(() => {
    setWordCount(countWords(chapterContent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterContent]);

  const handleSelectChapter = (ch: ChapterItem) => {
    if (currentChapterId) saveChapter(currentChapterId);
    loadChapter(ch.id);
  };

  const handleAddChapter = async () => {
    const ch = await addChapter(projectId);
    if (ch) {
      loadChapter(ch.id);
      toast.success("新章节已创建");
    }
  };

  const handleDeleteChapter = async (id: string) => {
    if (currentChapterId === id) {
      setChapterContent("");
      setChapterTitle("");
    }
    await deleteChapter(id);
    toast.success("章节已删除");
  };

  const handleAI = async () => {
    if (!aiMessage && workflow !== "draft") {
      toast.error("请输入提示词或选择文本");
      return;
    }

    setGenerating(true);
    setStreamingContent("");
    setError(null);

    try {
      // Get project settings + assets for AI context
      const [projectRes, charsRes, worldRes] = await Promise.all([
        fetch(`/api/projects?id=${projectId}`),
        fetch(`/api/characters?projectId=${projectId}`),
        fetch(`/api/world-building?projectId=${projectId}`),
      ]);
      const project = await projectRes.json();
      const characters = await charsRes.json();
      const worldItems = await worldRes.json();
      const aiSettings = project?.aiSettings || {};

      const charContext =
        characters.length > 0
          ? `角色列表：${characters.map((c: { name: string; identity: string; personality: string }) => `${c.name}${c.identity ? `（${c.identity}）` : ""}${c.personality ? `：${c.personality}` : ""}`).join("；")}`
          : "";

      const worldContext =
        worldItems.length > 0
          ? `世界观条目：${worldItems.map((w: { title: string; content: string }) => `${w.title}：${w.content}`).join("；")}`
          : "";

      const contextStr = [
        project.description && `简介：${project.description}`,
        project.worldView && `世界观：${project.worldView}`,
        project.writingReqs && `写作要求：${project.writingReqs}`,
        charContext,
        worldContext,
        aiContext,
      ]
        .filter(Boolean)
        .join("\n");

      const currentContent =
        workflow === "polish" || workflow === "expand" || workflow === "shorten"
          ? chapterContent
          : "";

      const systemPromptMap: Record<string, string> = {
        outline: "你是一位专业的文学创作顾问。根据用户提供的项目信息，生成一份详细的小说大纲。大纲应包括：故事主线、主要情节节点、核心冲突、人物弧光、主题立意。请用中文回复，结构清晰，分点论述。",
        draft: "你是一位优秀的小说写手。根据大纲和章节设定，撰写完整的章节正文。要求：文学性强，描写细腻，对话自然，情节推进合理。请用中文写作。",
        continue: "你是一位优秀的小说写手。请根据已有的章节内容，自然地续写下去。要求：保持风格一致，衔接自然，情节连贯。请用中文写作。",
        polish: "你是一位资深的文学编辑。请对以下文本进行润色。要求：保持原意和风格，优化表达，修正语病，提升文学性。请用中文回复，只输出润色后的文本。",
        expand: "你是一位资深的文学编辑。请对以下文本进行扩写。要求：丰富细节，增加描写和对话，扩展情节，保持风格一致。请用中文回复，只输出扩写后的文本。",
        shorten: "你是一位资深的文学编辑。请对以下文本进行缩写。要求：保留核心信息和风格，删减冗余，使表达更简洁有力。请用中文回复，只输出缩写后的文本。",
        summary: "请对以下章节内容进行简洁的总结。包括：主要事件、关键对话、重要伏笔。请在100-200字内完成，用中文回复。",
      };
      const systemPrompt = systemPromptMap[workflow] || systemPromptMap.draft;
      const fullSystem = contextStr ? `${systemPrompt}\n\n## 项目上下文\n${contextStr}` : systemPrompt;

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiSettings.provider || "openai",
          model: aiSettings.model || "gpt-4o",
          baseUrl: aiSettings.baseUrl || "",
          apiKey: aiSettings.apiKey || "",
          temperature: aiSettings.temperature || 0.7,
          maxTokens: aiSettings.maxTokens || 4096,
          workflow,
          message: currentContent
            ? `${aiMessage}\n\n---\n${currentContent}`
            : aiMessage,
          context: contextStr,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        result += text;
        setStreamingContent(result);
      }

      if (workflow === "draft" || workflow === "continue") {
        setChapterContent(chapterContent + "\n\n" + result);
      } else if (
        workflow === "polish" ||
        workflow === "expand" ||
        workflow === "shorten"
      ) {
        setChapterContent(result);
      }

      // Save AI generation to history
      fetch("/api/ai/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          chapterId: currentChapterId,
          workflow,
          model: aiSettings.model || "gpt-4o",
          provider: aiSettings.provider || "openai",
          prompt: currentContent
            ? `${aiMessage}\n\n---\n${currentContent.substring(0, 500)}`
            : aiMessage,
          systemPrompt: fullSystem,
          output: result,
          temperature: aiSettings.temperature || 0.7,
          maxTokens: aiSettings.maxTokens || 4096,
        }),
      }).catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI 请求失败";
      setError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="h-12 border-b flex items-center px-3 gap-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.push("/projects")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium text-sm truncate max-w-[200px]">
          {projectName}
        </span>
        <Separator orientation="vertical" className="h-5" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setChapterListOpen(!chapterListOpen)}
        >
          <FileText className="w-4 h-4 mr-1" />
          章节
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAiPanelOpen(!aiPanelOpen)}
        >
          <Sparkles className="w-4 h-4 mr-1" />
          AI
        </Button>
        <div className="flex-1" />
        {saving && (
          <span className="text-xs text-muted-foreground">保存中...</span>
        )}
        <span className="text-xs text-muted-foreground">{wordCount} 字</span>
        <Separator orientation="vertical" className="h-5" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/projects/${projectId}/settings`)}
        >
          <Settings className="w-4 h-4" />
        </Button>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chapter list */}
        {chapterListOpen && (
          <div className="w-56 border-r flex flex-col shrink-0">
            <div className="p-2 border-b flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                章节列表
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddChapter}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1 space-y-0.5">
                {chapters.map((ch, i) => (
                  <div
                    key={ch.id}
                    className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm ${
                      currentChapterId === ch.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => handleSelectChapter(ch)}
                  >
                    <span className="text-xs text-muted-foreground w-5 shrink-0">
                      {i + 1}
                    </span>
                    <span className="truncate flex-1">{ch.title}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 h-4 shrink-0"
                    >
                      {ch.wordCount}
                    </Badge>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChapter(ch.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {chapters.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    暂无章节
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Center: Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b">
            <Input
              className="text-lg font-bold border-0 px-0 focus-visible:ring-0"
              placeholder="章节标题"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
            />
          </div>
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-3xl mx-auto">
              <Textarea
                className="min-h-[60vh] border-0 resize-none text-base leading-relaxed focus-visible:ring-0 p-0"
                placeholder="开始写作...&#10;&#10;选择左侧章节或创建新章节，然后使用右侧 AI 面板辅助写作。"
                value={chapterContent}
                onChange={(e) => setChapterContent(e.target.value)}
              />
            </div>
          </ScrollArea>
        </div>

        {/* Right: AI Panel */}
        {aiPanelOpen && (
          <div className="w-80 border-l flex flex-col shrink-0">
            <div className="p-3 border-b">
              <h3 className="text-sm font-medium mb-2">AI 助手</h3>
              <Select value={workflow} onValueChange={(v) => v && setWorkflow(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOWS.map((w) => (
                    <SelectItem key={w.value} value={w.value}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {/* AI Context */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    项目上下文（可选）
                  </label>
                  <Textarea
                    className="h-16 text-xs"
                    placeholder="额外的写作指令或上下文..."
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                  />
                </div>

                {/* AI Message */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    {workflow === "draft" ? "大纲或设定" : "提示词"}
                  </label>
                  <Textarea
                    className="h-20 text-xs"
                    placeholder={
                      workflow === "draft"
                        ? "描述你要写的内容..."
                        : workflow === "continue"
                        ? "输入续写方向..."
                        : workflow === "polish"
                        ? "选中正文后点击，或输入润色要求..."
                        : "输入具体要求..."
                    }
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleAI}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5 mr-1" />
                  )}
                  {generating ? "生成中..." : "执行"}
                </Button>

                {/* Streaming Result */}
                {streamingContent && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="text-xs font-medium mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI 输出
                    </div>
                    <div className="text-xs whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                      {streamingContent}
                    </div>
                    {!generating && streamingContent && (
                      <div className="mt-2 flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            navigator.clipboard.writeText(streamingContent);
                            toast.success("已复制");
                          }}
                        >
                          复制
                        </Button>
                        {(workflow === "draft" || workflow === "continue") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                              const editor = useEditorStore.getState();
                              editor.setChapterContent(
                                editor.chapterContent + "\n\n" + streamingContent
                              );
                              toast.success("已插入正文");
                            }}
                          >
                            插入正文
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
