// 记忆提取器：写完一章后自动分析并提取结构化记忆
import { prisma } from "@/lib/db";
import { createProviderWithRetry, type AIProviderConfig } from "@/lib/ai/provider";
import { EXTRACT_PROMPT } from "./prompts";

interface ExtractResult {
  characterStates: { characterId: string; location: string; goal: string; emotion: string; relationships: string }[];
  plotThreads: { name: string; description: string; status: string; type: string; priority?: number }[];
  timelineEvents: { eventDesc: string; storyTime: string; characterIds: string[] }[];
  chekhovGuns: { description: string; type: string }[];
  contradictions: { type: string; description: string }[];
}

export interface ExtractOutcome {
  success: boolean;
  chapterNum: number;
  characterStates: number;
  plotThreads: number;
  timelineEvents: number;
  chekhovGuns: number;
  contradictions: { type: string; description: string }[];
  error?: string;
}

/** 对章节内容执行记忆提取 */
export async function extractMemories(
  projectId: string,
  chapterId: string
): Promise<ExtractOutcome> {
  try {
    // 1. 获取章节内容和 AI 设置
    const [chapter, aiSettings, chapters] = await Promise.all([
      prisma.chapter.findUnique({ where: { id: chapterId } }),
      prisma.aISettings.findUnique({ where: { projectId } }),
      prisma.chapter.findMany({
        where: { projectId },
        select: { id: true, order: true },
        orderBy: { order: "asc" },
      }),
    ]);

    if (!chapter) return { success: false, chapterNum: 0, characterStates: 0, plotThreads: 0, timelineEvents: 0, chekhovGuns: 0, contradictions: [], error: "章节不存在" };
    if (!chapter.content || chapter.content.trim().length < 100) {
      return { success: false, chapterNum: chapter.order, characterStates: 0, plotThreads: 0, timelineEvents: 0, chekhovGuns: 0, contradictions: [], error: "章节内容太短" };
    }

    const chapterNum = chapter.order;
    const config: AIProviderConfig = {
      provider: (aiSettings?.provider || "deepseek") as AIProviderConfig["provider"],
      model: aiSettings?.model || "deepseek-v4-flash",
      baseUrl: aiSettings?.baseUrl || "https://api.deepseek.com",
      apiKey: aiSettings?.apiKey || "",
      temperature: 0.3,
      maxTokens: 4096,
    };

    // 2. 调用 AI 提取
    const provider = createProviderWithRetry(config);
    const content = chapter.content.slice(0, 12000); // 截断过长的章节
    const response = await provider.chat({
      system: EXTRACT_PROMPT,
      messages: [{ role: "user", content }],
    });

    // 3. 解析 JSON
    let data: ExtractResult;
    try {
      const json = response.content.replace(/```json\s*|\s*```/g, "").trim();
      data = JSON.parse(json);
    } catch {
      return { success: false, chapterNum, characterStates: 0, plotThreads: 0, timelineEvents: 0, chekhovGuns: 0, contradictions: [], error: "AI 返回格式异常" };
    }

    // 4. 写入数据库
    let cs = 0, pt = 0, te = 0, cg = 0;

    // 角色状态
    for (const s of data.characterStates || []) {
      if (!s.characterId) continue;
      await prisma.characterState.create({
        data: {
          projectId,
          characterId: s.characterId,
          chapterNum,
          location: s.location || "",
          goal: s.goal || "",
          emotion: s.emotion || "",
          relationships: s.relationships || "",
        },
      });
      cs++;
    }

    // 剧情线
    for (const t of data.plotThreads || []) {
      if (!t.name) continue;
      const isNew = t.type === "new";
      if (isNew) {
        await prisma.plotThread.create({
          data: {
            projectId,
            name: t.name,
            description: t.description || "",
            priority: t.priority || 1,
            status: t.status || "open",
            openedChapter: chapterNum,
          },
        });
        pt++;
      } else {
        // 更新已存在的剧情线（按名称匹配）
        const existing = await prisma.plotThread.findFirst({
          where: { projectId, name: t.name },
        });
        if (existing) {
          await prisma.plotThread.update({
            where: { id: existing.id },
            data: {
              status: t.status || existing.status,
              resolvedChapter: t.type === "resolve" ? chapterNum : existing.resolvedChapter,
            },
          });
          pt++;
        }
      }
    }

    // 时间线事件
    for (const e of data.timelineEvents || []) {
      if (!e.eventDesc) continue;
      await prisma.timelineEvent.create({
        data: {
          projectId,
          chapterNum,
          eventDesc: e.eventDesc,
          storyTime: e.storyTime || "",
          characters: JSON.stringify(e.characterIds || []),
        },
      });
      te++;
    }

    // 契诃夫之枪
    for (const g of data.chekhovGuns || []) {
      if (!g.description) continue;
      await prisma.chekhovGun.create({
        data: {
          projectId,
          description: g.description,
          plantedChapter: chapterNum,
          payedChapter: g.type === "paid_off" ? chapterNum : null,
          status: g.type === "paid_off" ? "paid_off" : "planted",
        },
      });
      cg++;
    }

    return {
      success: true,
      chapterNum,
      characterStates: cs,
      plotThreads: pt,
      timelineEvents: te,
      chekhovGuns: cg,
      contradictions: data.contradictions || [],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "未知错误";
    return { success: false, chapterNum: 0, characterStates: 0, plotThreads: 0, timelineEvents: 0, chekhovGuns: 0, contradictions: [], error: msg };
  }
}
