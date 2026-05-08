// 分级大纲管理器：卷 → 章 → 故事弧，支持 AI 生成和动态调整
import { prisma } from "@/lib/db";
import { createProviderWithRetry, type AIProviderConfig } from "@/lib/ai/provider";

interface VolumeData {
  id?: string;
  title: string;
  order: number;
  summary?: string;
  wordTarget?: number;
  status?: string;
}

interface StoryArcData {
  id?: string;
  name: string;
  description?: string;
  arcType?: string;
  status?: string;
}

interface ChapterOutlineData {
  chapterId: string;
  summary?: string;
  keyEvents?: string[];
  characterArcs?: string[];
  plotThreads?: string[];
  wordTarget?: number;
}

/** 获取完整分级大纲 */
export async function getFullOutline(projectId: string) {
  const [project, volumes, storyArcs, chapterOutlines] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { outline: true, title: true, targetWords: true },
    }),
    prisma.volume.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    }),
    prisma.storyArc.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.chapter.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        order: true,
        wordCount: true,
        summary: true,
        status: true,
        outline: true,
      },
      orderBy: { order: "asc" },
    }),
  ]);

  return {
    project: project ? {
      title: project.title,
      targetWords: project.targetWords,
      legacyOutline: project.outline,
    } : null,
    volumes,
    storyArcs,
    chapters: chapterOutlines.map((ch) => ({
      ...ch,
      outline: ch.outline ? JSON.parse(ch.outline.summary || "{}") : null,
    })),
  };
}

/** 创建或更新卷 */
export async function saveVolume(projectId: string, data: VolumeData) {
  if (data.id) {
    return prisma.volume.update({
      where: { id: data.id },
      data: {
        title: data.title,
        order: data.order,
        summary: data.summary,
        wordTarget: data.wordTarget,
        status: data.status,
      },
    });
  }
  return prisma.volume.create({
    data: {
      projectId,
      title: data.title,
      order: data.order,
      summary: data.summary || "",
      wordTarget: data.wordTarget,
      status: data.status || "planned",
    },
  });
}

/** 删除卷 */
export async function deleteVolume(id: string) {
  return prisma.volume.delete({ where: { id } });
}

/** 创建或更新故事弧 */
export async function saveStoryArc(projectId: string, data: StoryArcData) {
  if (data.id) {
    return prisma.storyArc.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        arcType: data.arcType,
        status: data.status,
      },
    });
  }
  return prisma.storyArc.create({
    data: {
      projectId,
      name: data.name,
      description: data.description || "",
      arcType: data.arcType || "plot",
      status: data.status || "open",
    },
  });
}

/** 删除故事弧 */
export async function deleteStoryArc(id: string) {
  return prisma.storyArc.delete({ where: { id } });
}

/** 保存章节大纲 */
export async function saveChapterOutline(data: ChapterOutlineData) {
  return prisma.chapterOutline.upsert({
    where: { chapterId: data.chapterId },
    update: {
      summary: data.summary,
      keyEvents: JSON.stringify(data.keyEvents || []),
      characterArcs: JSON.stringify(data.characterArcs || []),
      plotThreads: JSON.stringify(data.plotThreads || []),
      wordTarget: data.wordTarget || 0,
    },
    create: {
      chapterId: data.chapterId,
      summary: data.summary || "",
      keyEvents: JSON.stringify(data.keyEvents || []),
      characterArcs: JSON.stringify(data.characterArcs || []),
      plotThreads: JSON.stringify(data.plotThreads || []),
      wordTarget: data.wordTarget || 0,
    },
  });
}

/** AI 生成整本分级大纲 */
export async function generateOutline(
  projectId: string,
  config: AIProviderConfig
): Promise<{ volumes: VolumeData[]; arcs: StoryArcData[]; legacyOutline: string }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { title: true, type: true, genre: true, style: true, description: true, worldView: true, targetWords: true },
  });
  if (!project) throw new Error("项目不存在");

  const prompt = `请为以下小说项目生成分级大纲。

项目信息：
- 标题：${project.title}
- 类型：${project.type}
- 题材：${project.genre}
- 风格：${project.style}
- 简介：${project.description}
- 世界观：${project.worldView}
- 目标总字数：${project.targetWords || "未设定"}

请返回 JSON 格式（不要 markdown）：
{
  "legacyOutline": "传统 Markdown 大纲（含三幕结构、情节点、人物弧光等）",
  "volumes": [
    {"title": "卷名", "order": 0, "summary": "本卷概要", "wordTarget": 50000}
  ],
  "storyArcs": [
    {"name": "弧线名", "description": "描述", "arcType": "character|plot|theme"}
  ]
}`;

  const provider = createProviderWithRetry(config);
  const response = await provider.chat({
    system: "你是一位资深的文学策划师。请只返回 JSON。",
    messages: [{ role: "user", content: prompt }],
  });

  let data: { legacyOutline: string; volumes: VolumeData[]; storyArcs: StoryArcData[] };
  try {
    data = JSON.parse(response.content.replace(/```json\s*|\s*```/g, "").trim());
  } catch {
    throw new Error("AI 返回格式异常，无法解析大纲");
  }

  // 保存卷
  for (const v of data.volumes) {
    await prisma.volume.create({
      data: {
        projectId,
        title: v.title,
        order: v.order,
        summary: v.summary || "",
        wordTarget: v.wordTarget,
      },
    });
  }

  // 保存故事弧
  for (const a of data.storyArcs) {
    await prisma.storyArc.create({
      data: {
        projectId,
        name: a.name,
        description: a.description || "",
        arcType: a.arcType || "plot",
      },
    });
  }

  // 更新传统大纲
  if (data.legacyOutline) {
    await prisma.project.update({
      where: { id: projectId },
      data: { outline: data.legacyOutline },
    });
  }

  return { volumes: data.volumes, arcs: data.storyArcs, legacyOutline: data.legacyOutline };
}

interface AdjustResult {
  pace: string;
  paceNote: string;
  plotBalance: { name: string; status: string; suggestion: string }[];
  adjustments: { volumeOrder?: number; chapterTitle?: string; change: string }[];
  nextTarget: { wordTarget: number; focus: string };
}

/** AI 根据已写内容调整后续大纲 */
export async function adjustOutline(
  projectId: string,
  config: AIProviderConfig
): Promise<AdjustResult> {
  const [project, chapters, plotThreads] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { outline: true },
    }),
    prisma.chapter.findMany({
      where: { projectId },
      select: { title: true, order: true, summary: true, wordCount: true },
      orderBy: { order: "asc" },
    }),
    prisma.plotThread.findMany({
      where: { projectId },
      select: { name: true, status: true, description: true },
    }),
  ]);

  const chapterSummaries = chapters.map((c) =>
    `第${c.order}章 ${c.title} (${c.wordCount}字): ${c.summary || "无摘要"}`
  ).join("\n");

  const threadStatus = plotThreads.map((t) =>
    `- ${t.name} [${t.status}]: ${t.description}`
  ).join("\n");

  const prompt = `当前大纲：\n${(project?.outline || "无").slice(0, 2000)}\n\n已写章节：\n${chapterSummaries}\n\n剧情线状态：\n${threadStatus}`;

  const provider = createProviderWithRetry(config);
  const response = await provider.chat({
    system: "你是一位资深的文学策划师。请分析写作进度并给出调整建议。只返回 JSON。",
    messages: [{ role: "user", content: prompt }],
  });

  let result: AdjustResult;
  try {
    result = JSON.parse(response.content.replace(/```json\s*|\s*```/g, "").trim());
  } catch {
    throw new Error("AI 返回格式异常");
  }

  return result;
}
