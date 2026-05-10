import { NextResponse } from "next/server";
import { createProviderWithRetry } from "@/lib/ai/provider";

export async function POST(req: Request) {
  try {
    const { provider, model, baseUrl, apiKey, outline, bible, arcPlan, chapterTitle, chapterGoal, prevEnding, activeForeshadowings, relevantCharacters } = await req.json();

    const systemPrompt = `你是一位资深的文学策划编辑。请根据提供的信息，生成一份详细的章节任务卡。

输出严格的 JSON 格式（不要用 \`\`\`json 包裹）：

{
  "chapter_title": "章节标题建议",
  "word_target": 3500,
  "main_goal": "本章核心目标（1句话）",
  "plot_points": ["情节点1", "情节点2", "情节点3"],
  "characters": ["出场角色1", "出场角色2"],
  "emotional_arc": "情绪变化路线（如：紧张→受挫→冷静反击→疑惑）",
  "foreshadowing_to_advance": ["需要推进的伏笔"],
  "foreshadowing_to_resolve": ["可以回收的伏笔"],
  "scene_suggestions": [
    {"scene": 1, "location": "", "purpose": "", "conflict": "", "ending": ""}
  ],
  "do_not_reveal": ["绝对不能在本章揭示的信息"],
  "must_include": ["本章必须包含的元素"],
  "style_notes": "本章风格注意事项"
}`;

    const userMsg = [
      bible && `【小说圣经】\n${bible}`,
      arcPlan && `【当前卷】\n${arcPlan}`,
      outline && `【全书大纲】\n${outline.slice(0, 2000)}`,
      chapterTitle && `【章节标题】${chapterTitle}`,
      chapterGoal && `【章节目标】${chapterGoal}`,
      activeForeshadowings?.length > 0 && `【活跃伏笔】\n${activeForeshadowings.join("\n")}`,
      relevantCharacters?.length > 0 && `【相关角色】\n${relevantCharacters.join("\n")}`,
      prevEnding && `【上一章结尾原文】\n…${prevEnding}`,
    ].filter(Boolean).join("\n\n");

    const providerObj = createProviderWithRetry({ provider, model, baseUrl, apiKey, temperature: 0.4, maxTokens: 3000 });
    const result = await providerObj.chat({
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    });

    // Try to parse the result as JSON
    let taskCard: any;
    try {
      const cleaned = result.content.replace(/```(?:json)?\s*|\s*```/g, "").trim();
      taskCard = JSON.parse(cleaned);
    } catch {
      taskCard = { raw: result.content };
    }

    return NextResponse.json({ taskCard: JSON.stringify(taskCard, null, 2) });
  } catch (e) {
    return NextResponse.json({ error: `生成失败：${e instanceof Error ? e.message : ""}` }, { status: 500 });
  }
}
