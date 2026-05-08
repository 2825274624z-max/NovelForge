// 上下文组装器：写新章前自动检索相关记忆，拼装成结构化上下文
import { prisma } from "@/lib/db";

export interface AssembledContext {
  /** 注入 AI system prompt 的完整上下文字符串 */
  systemContext: string;
  /** 各部分的 token 估算 */
  tokens: {
    plotThreads: number;
    characterStates: number;
    chekhovGuns: number;
    timelineEvents: number;
    outline: number;
    total: number;
  };
  /** 供前端展示的摘要 */
  summary: {
    activePlotThreads: number;
    activeChekhovGuns: number;
    recentEvents: number;
    charactersWithState: string[];
  };
}

/** 估算中文字符的 token 数（约 1.5 字符/token） */
function est(Text: string): number {
  return Math.ceil(Text.length / 1.5);
}

/** 为指定章节组装上下文 */
export async function assembleContext(
  projectId: string,
  chapterNum: number,
  options?: {
    maxPlotThreads?: number;
    maxChekhovGuns?: number;
    recentChapters?: number;
  }
): Promise<AssembledContext> {
  const maxPlot = options?.maxPlotThreads ?? 10;
  const maxGuns = options?.maxChekhovGuns ?? 8;
  const recentRange = options?.recentChapters ?? 5;

  const parts: string[] = [];
  let totalTokens = 0;

  // ─── 1. 大纲指引 ───
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { outline: true },
  });
  let outlineStr = "";
  if (project?.outline) {
    outlineStr = project.outline.slice(0, 1500);
    parts.push(`【大纲指引】\n${outlineStr}`);
    totalTokens += est(outlineStr);
  }

  // ─── 2. 活跃剧情线 ───
  const plotThreads = await prisma.plotThread.findMany({
    where: {
      projectId,
      status: { in: ["open", "ongoing"] },
    },
    orderBy: { priority: "desc" },
    take: maxPlot,
  });
  if (plotThreads.length > 0) {
    const lines = plotThreads.map((t) => {
      const opened = t.openedChapter ? `(第${t.openedChapter}章开启)` : "";
      return `- [${t.status === "ongoing" ? "进行中" : "待推进"}] ${t.name} ${opened}：${t.description}`;
    });
    const text = `【活跃剧情线】\n${lines.join("\n")}`;
    parts.push(text);
    totalTokens += est(text);
  }

  // ─── 3. 角色最新状态 ───
  const allCharacterStates = await prisma.characterState.findMany({
    where: {
      projectId,
      characterId: { not: "" },
      chapterNum: { gte: chapterNum - recentRange, lte: chapterNum },
    },
    orderBy: [{ characterId: "asc" }, { chapterNum: "desc" }],
  });
  // 每个角色取最新一条
  const latestStateMap = new Map<string, typeof allCharacterStates[0]>();
  for (const s of allCharacterStates) {
    if (!latestStateMap.has(s.characterId)) {
      latestStateMap.set(s.characterId, s);
    }
  }
  const latestStates = Array.from(latestStateMap.values());
  if (latestStates.length > 0) {
    const lines = latestStates.map((s) => {
      const parts = [`位置:${s.location || "?"}`, `目标:${s.goal || "?"}`, `情绪:${s.emotion || "?"}`];
      if (s.relationships) parts.push(`关系:${s.relationships}`);
      return `- ${s.characterId}：${parts.join("，")}`;
    });
    const text = `【角色最新状态】\n${lines.join("\n")}`;
    parts.push(text);
    totalTokens += est(text);
  }

  // ─── 4. 待回收伏笔 ───
  const chekhovGuns = await prisma.chekhovGun.findMany({
    where: {
      projectId,
      status: "planted",
    },
    take: maxGuns,
  });
  if (chekhovGuns.length > 0) {
    const lines = chekhovGuns.map((g) => `- 第${g.plantedChapter}章埋下：${g.description}`);
    const text = `【待回收伏笔】\n${lines.join("\n")}`;
    parts.push(text);
    totalTokens += est(text);
  }

  // ─── 5. 近期时间线 ───
  const timelineEvents = await prisma.timelineEvent.findMany({
    where: {
      projectId,
      chapterNum: { gte: chapterNum - recentRange, lte: chapterNum },
    },
    orderBy: { chapterNum: "asc" },
    take: 20,
  });
  if (timelineEvents.length > 0) {
    const lines = timelineEvents.map((e) => {
      const time = e.storyTime ? `[${e.storyTime}] ` : "";
      return `- 第${e.chapterNum}章：${time}${e.eventDesc}`;
    });
    const text = `【近期时间线】\n${lines.join("\n")}`;
    parts.push(text);
    totalTokens += est(text);
  }

  // ─── 6. 近期章节摘要 ───
  const recentChapters = await prisma.chapter.findMany({
    where: {
      projectId,
      order: { gte: Math.max(1, chapterNum - 3), lt: chapterNum },
    },
    select: { title: true, order: true, summary: true },
    orderBy: { order: "asc" },
  });
  if (recentChapters.length > 0) {
    const lines = recentChapters.map((c) => {
      const s = c.summary ? `：${c.summary.slice(0, 200)}` : "";
      return `- 第${c.order}章 ${c.title}${s}`;
    });
    const text = `【前情摘要】\n${lines.join("\n")}`;
    parts.push(text);
    totalTokens += est(text);
  }

  const systemContext = parts.join("\n\n");

  return {
    systemContext,
    tokens: {
      plotThreads: est(parts.find((p) => p.startsWith("【活跃剧情线】")) || ""),
      characterStates: est(parts.find((p) => p.startsWith("【角色最新状态】")) || ""),
      chekhovGuns: est(parts.find((p) => p.startsWith("【待回收伏笔】")) || ""),
      timelineEvents: est(parts.find((p) => p.startsWith("【近期时间线】")) || ""),
      outline: est(parts.find((p) => p.startsWith("【大纲指引】")) || ""),
      total: totalTokens,
    },
    summary: {
      activePlotThreads: plotThreads.length,
      activeChekhovGuns: chekhovGuns.length,
      recentEvents: timelineEvents.length,
      charactersWithState: latestStates.map((s) => s.characterId),
    },
  };
}
