import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createProviderWithRetry, type AIProviderConfig } from "@/lib/ai/provider";
import { CONSISTENCY_PROMPT } from "@/lib/memory/prompts";
import { assembleContext } from "@/lib/memory/context-assembler";

export async function POST(req: Request) {
  try {
    const { projectId, chapterId } = await req.json();
    if (!projectId || !chapterId) {
      return NextResponse.json({ error: "Missing projectId or chapterId" }, { status: 400 });
    }

    // 获取章节内容和 AI 设置
    const [chapter, aiSettings] = await Promise.all([
      prisma.chapter.findUnique({ where: { id: chapterId } }),
      prisma.aISettings.findUnique({ where: { projectId } }),
    ]);

    if (!chapter) {
      return NextResponse.json({ error: "章节不存在" }, { status: 404 });
    }
    if (!chapter.content || chapter.content.trim().length < 100) {
      return NextResponse.json({ pass: true, issues: [], note: "章节内容太短，跳过检查" });
    }

    // 获取记忆上下文
    const ctx = await assembleContext(projectId, chapter.order);

    // 调用 AI 校验
    const config: AIProviderConfig = {
      provider: ((aiSettings?.provider || "deepseek") as AIProviderConfig["provider"]),
      model: aiSettings?.model || "deepseek-v4-flash",
      baseUrl: aiSettings?.baseUrl || "https://api.deepseek.com",
      apiKey: aiSettings?.apiKey || "",
      temperature: 0.2,
      maxTokens: 2048,
    };

    const provider = createProviderWithRetry(config);
    const prompt = CONSISTENCY_PROMPT
      .replace("{memoryContext}", ctx.systemContext.slice(0, 6000))
      .replace("{chapterContent}", chapter.content.slice(0, 8000));

    const response = await provider.chat({
      system: "你是一位严谨的文学审稿人。请只返回 JSON。",
      messages: [{ role: "user", content: prompt }],
    });

    let result: { pass: boolean; issues: { type: string; severity: string; detail: string; suggestion: string }[] };
    try {
      const json = response.content.replace(/```json\s*|\s*```/g, "").trim();
      result = JSON.parse(json);
    } catch {
      return NextResponse.json({ pass: true, issues: [], note: "AI 返回格式异常，跳过检查" });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/memory/check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
