import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project, ChapterItem } from "@/store/useStore";

// ─── Helpers ───
const qk = {
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  chapters: (projectId: string) => ["chapters", projectId] as const,
  chapter: (id: string) => ["chapters", "detail", id] as const,
  assets: (projectId: string) => ["assets", projectId] as const,
};

type AssetEntry = Record<string, string>;

interface AssetsData {
  characters?: AssetEntry[];
  worldBuilding?: AssetEntry[];
  locations?: AssetEntry[];
  organizations?: AssetEntry[];
  items?: AssetEntry[];
  foreshadowings?: AssetEntry[];
  timelines?: AssetEntry[];
}

interface ProjectDetail extends Project {
  aiSettings?: {
    provider: string;
    model: string;
    baseUrl: string;
    apiKey: string;
    temperature: number;
    maxTokens: number;
  };
}

// ═══════════════════════════════════════════════════
// Projects
// ═══════════════════════════════════════════════════

export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: async (): Promise<Project[]> => {
      const res = await fetch("/api/projects");
      return res.json();
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: qk.project(id ?? ""),
    queryFn: async (): Promise<ProjectDetail | null> => {
      const res = await fetch(`/api/projects?id=${id}`);
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("创建失败");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Record<string, unknown>) => {
      await fetch(`/api/projects?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.projects });
      qc.invalidateQueries({ queryKey: qk.project(vars.id as string) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects });
    },
  });
}

// ═══════════════════════════════════════════════════
// Chapters
// ═══════════════════════════════════════════════════

export function useChapters(projectId: string) {
  return useQuery({
    queryKey: qk.chapters(projectId),
    queryFn: async (): Promise<ChapterItem[]> => {
      const res = await fetch(`/api/chapters?projectId=${projectId}`);
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function useChapter(chapterId: string | null) {
  return useQuery({
    queryKey: qk.chapter(chapterId ?? ""),
    queryFn: async () => {
      const res = await fetch(`/api/chapters?id=${chapterId}`);
      return res.json() as Promise<{
        id: string;
        title: string;
        content: string;
        wordCount: number;
        summary: string;
        status: string;
      } | null>;
    },
    enabled: !!chapterId,
  });
}

export function useCreateChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      title,
    }: {
      projectId: string;
      title?: string;
    }) => {
      const res = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title: title || "新章节" }),
      });
      return res.json() as Promise<ChapterItem>;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.chapters(vars.projectId) });
    },
  });
}

export function useUpdateChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      ...body
    }: {
      id: string;
      projectId: string;
      title?: string;
      content?: string;
    }) => {
      await fetch(`/api/chapters?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.chapters(vars.projectId) });
      qc.invalidateQueries({ queryKey: qk.chapter(vars.id) });
    },
  });
}

export function useDeleteChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
    }: {
      id: string;
      projectId: string;
    }) => {
      await fetch(`/api/chapters?id=${id}`, { method: "DELETE" });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.chapters(vars.projectId) });
    },
  });
}

// ═══════════════════════════════════════════════════
// Assets (consolidated)
// ═══════════════════════════════════════════════════

export function useAssets(projectId: string) {
  return useQuery({
    queryKey: qk.assets(projectId),
    queryFn: async (): Promise<AssetsData> => {
      const res = await fetch(`/api/assets?projectId=${projectId}`);
      return res.json();
    },
    enabled: !!projectId,
  });
}

const ASSET_API: Record<string, string> = {
  character: "/api/characters",
  world: "/api/world-building",
  location: "/api/locations",
  organization: "/api/organizations",
  item: "/api/items",
  fore: "/api/foreshadowings",
  timeline: "/api/timelines",
};

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { type: string; projectId: string } & Record<string, string>) => {
      const { type, projectId, ...data } = vars;
      await fetch(ASSET_API[type], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...data }),
      });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.assets(vars.projectId) });
    },
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { type: string; id: string; projectId: string } & Record<string, unknown>) => {
      const { type, id, projectId, ...data } = vars;
      await fetch(`${ASSET_API[type]}?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.assets(vars.projectId) });
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      type,
      id,
      projectId,
    }: {
      type: string;
      id: string;
      projectId: string;
    }) => {
      await fetch(`${ASSET_API[type]}?id=${id}`, { method: "DELETE" });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.assets(vars.projectId) });
    },
  });
}

// ═══════════════════════════════════════════════════
// Stats
// ═══════════════════════════════════════════════════

export interface StatsData {
  dailyLogs: { date: string; wordCount: number }[];
  totalWords: number;
  currentStreak: number;
  bestStreak: number;
  dailyAverage: number;
  totalDays: number;
}

export function useStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ["stats", projectId],
    queryFn: async (): Promise<StatsData> => {
      const res = await fetch(`/api/stats?projectId=${projectId}`);
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function useTrackWords() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      projectId: string;
      date: string;
      wordCount: number;
    }) => {
      return fetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["stats", vars.projectId] });
    },
  });
}

// ═══════════════════════════════════════════════════
// AI Settings
// ═══════════════════════════════════════════════════

export function useSaveAISettings() {
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await fetch("/api/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async (settings: Record<string, unknown>) => {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      return res.json() as Promise<{ success: boolean; model?: string; message?: string }>;
    },
  });
}
