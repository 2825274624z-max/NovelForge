import { NextResponse } from "next/server";
import { createProviderWithRetry } from "@/lib/ai/provider";

export async function POST(req: Request) {
  try {
    const { provider, model, baseUrl, apiKey, chapterContent, chapterTitle, prevStateJson } = await req.json();

    const systemPrompt = `你是一位文学设定整理专家。请从章节内容中提取结构化状态信息。

输出严格 JSON（不要用 \`\`\`json 包裹）：

{
  "summary": "本章摘要（150-250字）",
  "new_facts": ["本章新增的关键事实"],
  "character_changes": [{"name": "角色名", "change": "角色状态/关系/认知变化"}],
  "foreshadowing_added": ["本章新埋下的伏笔线索"],
  "foreshadowing_resolved": ["本章回收的伏笔"],
  "threads_advanced": ["本章推进的情节线"],
  "items_introduced": ["本章新出现的物品/能力"],
  "locations_visited": ["本章出现的地点"],
  "tone": "本章整体语气",
  "ending_hook": "本章结尾悬念"
}

规则：
- summary 必须精确，只写推进主线的事件
- new_facts 是本章新增的客观事实，不是感受
- character_changes 只记录有实际变化的角色
- 没有的字段返回空数组 []
- 注意对比 prevStateJson 中的旧状态，识别变化`;

    const userMsg = [
      `## ${chapterTitle || "章节"}`,
      chapterContent.slice(0, 12000),
      prevStateJson ? `\n【上一章状态参考】\n${prevStateJson}` : "",
    ].join("\n");

    const providerObj = createProviderWithRetry({ provider, model, baseUrl, apiKey, temperature: 0.2, maxTokens: 2000 });
    const result = await providerObj.chat({
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    });

    const cleaned = result.content.replace(/```(?:json)?\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ state: parsed, stateJson: JSON.stringify(parsed) });
  } catch (e) {
    return NextResponse.json({ error: `提取失败：${e instanceof Error ? e.message : ""}` }, { status: 500 });
  }
}
