import { create } from "zustand";

// ─── Project Store ───
export interface Project {
  id: string;
  title: string;
  type: string;
  genre: string;
  style: string;
  targetWords: number;
  description: string;
  worldView: string;
  writingReqs: string;
  outline: string;
  bible: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { chapters: number; characters: number };
}

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  fetchProjects: () => Promise<void>;
  setCurrentProject: (p: Project | null) => void;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      set({ projects: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setCurrentProject: (p) => set({ currentProject: p }),

  deleteProject: async (id) => {
    await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },
}));

// ─── Editor Store ───
export interface ChapterItem {
  id: string;
  title: string;
  order: number;
  status: string;
  wordCount: number;
  summary: string;
  stateJson: string;
  notes: string;
}

interface EditorStore {
  chapters: ChapterItem[];
  currentChapterId: string | null;
  chapterContent: string;
  chapterTitle: string;
  saving: boolean;
  wordCount: number;
  setChapters: (chapters: ChapterItem[]) => void;
  setCurrentChapter: (id: string | null) => void;
  setChapterContent: (content: string) => void;
  setChapterTitle: (title: string) => void;
  setSaving: (s: boolean) => void;
  setWordCount: (n: number) => void;
  fetchChapters: (projectId: string) => Promise<void>;
  loadChapter: (chapterId: string) => Promise<void>;
  saveChapter: (chapterId: string) => Promise<void>;
  addChapter: (projectId: string, title?: string) => Promise<ChapterItem | null>;
  deleteChapter: (chapterId: string) => Promise<void>;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  chapters: [],
  currentChapterId: null,
  chapterContent: "",
  chapterTitle: "",
  saving: false,
  wordCount: 0,

  setChapters: (chapters) => set({ chapters }),
  setCurrentChapter: (id) => set({ currentChapterId: id }),
  setChapterContent: (content) => set({ chapterContent: content }),
  setChapterTitle: (title) => set({ chapterTitle: title }),
  setSaving: (s) => set({ saving: s }),
  setWordCount: (n) => set({ wordCount: n }),

  fetchChapters: async (projectId) => {
    const res = await fetch(`/api/chapters?projectId=${projectId}`);
    const data = await res.json();
    set({ chapters: data });
  },

  loadChapter: async (chapterId) => {
    const res = await fetch(`/api/chapters?id=${chapterId}`);
    const data = await res.json();
    if (data) {
      set({
        currentChapterId: chapterId,
        chapterContent: data.content || "",
        chapterTitle: data.title || "",
        wordCount: data.wordCount || 0,
      });
    }
  },

  saveChapter: async (chapterId) => {
    const state = get();
    if (!chapterId || state.saving) return;
    set({ saving: true });
    try {
      await fetch(`/api/chapters?id=${chapterId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.chapterTitle,
          content: state.chapterContent,
        }),
      });
    } finally {
      set({ saving: false });
    }
  },

  addChapter: async (projectId, title) => {
    const res = await fetch("/api/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, title: title || "新章节" }),
    });
    const chapter = await res.json();
    if (chapter) {
      set({ chapters: [...get().chapters, chapter] });
      return chapter;
    }
    return null;
  },

  deleteChapter: async (chapterId) => {
    await fetch(`/api/chapters?id=${chapterId}`, { method: "DELETE" });
    set({
      chapters: get().chapters.filter((c) => c.id !== chapterId),
      currentChapterId:
        get().currentChapterId === chapterId ? null : get().currentChapterId,
    });
  },
}));

// ─── AI Store ───
interface AIStore {
  generating: boolean;
  streamingContent: string;
  error: string | null;
  setGenerating: (g: boolean) => void;
  setStreamingContent: (c: string) => void;
  appendStreamingContent: (c: string) => void;
  setError: (e: string | null) => void;
}

export const useAIStore = create<AIStore>((set) => ({
  generating: false,
  streamingContent: "",
  error: null,
  setGenerating: (g) => set({ generating: g }),
  setStreamingContent: (c) => set({ streamingContent: c }),
  appendStreamingContent: (c) =>
    set((s) => ({ streamingContent: s.streamingContent + c })),
  setError: (e) => set({ error: e }),
}));

// ─── Global AI Config Store ───
export interface AIConfigState {
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  reasoningEffort: string;
}

interface AIConfigStore {
  aiConfig: AIConfigState;
  configLoaded: boolean;
  setAIConfig: (c: Partial<AIConfigState>) => void;
  replaceAIConfig: (c: AIConfigState) => void;
  setConfigLoaded: (v: boolean) => void;
}

const DEFAULT_AI_CONFIG: AIConfigState = {
  provider: "deepseek",
  model: "deepseek-v4-flash",
  baseUrl: "https://api.deepseek.com",
  apiKey: "",
  temperature: 0.7,
  maxTokens: 8192,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  reasoningEffort: "",
};

export const useAIConfigStore = create<AIConfigStore>((set) => ({
  aiConfig: { ...DEFAULT_AI_CONFIG },
  configLoaded: false,
  setAIConfig: (c) => set((s) => ({ aiConfig: { ...s.aiConfig, ...c } })),
  replaceAIConfig: (c) => set({ aiConfig: c, configLoaded: true }),
  setConfigLoaded: (v) => set({ configLoaded: v }),
}));
