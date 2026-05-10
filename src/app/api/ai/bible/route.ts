import { NextResponse } from "next/server";
import { createProviderWithRetry } from "@/lib/ai/provider";

export async function POST(req: Request) {
  try {
    const { provider, model, baseUrl, apiKey, description, worldView, writingReqs, outline, characters, genre, style } = await req.json();

    const systemPrompt = `你是一位资深的文学策划编辑。请根据以下小说资料，生成一份"小说圣经"（Novel Bible）。

小说圣经是每次写作时必须携带的精简参考资料，控制在800字以内。

必须包含：
1. 小说类型与核心卖点（1句话）
2. 世界观核心规则（3-5条，编号）
3. 主角设定（姓名、身份、性格、长期目标）
4. 主要矛盾/冲突
5. 文风要求
6. 禁忌事项（绝对不能写的）

格式简洁，信息密度极高。`;

    const userMsg = [
      description && `简介：${description}`,
      worldView && `世界观：${worldView}`,
      writingReqs && `写作要求：${writingReqs}`,
      outline && `大纲：${outline.slice(0, 3000)}`,
      characters?.length > 0 && `角色：${characters.map((c: any) => `${c.name}(${c.identity || ""})`).join("、")}`,
      genre && `题材：${genre}`,
      style && `风格：${style}`,
    ].filter(Boolean).join("\n\n");

    const providerObj = createProviderWithRetry({ provider, model, baseUrl, apiKey, temperature: 0.3, maxTokens: 2000 });
    const result = await providerObj.chat({
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    });
    return NextResponse.json({ bible: result.content });
  } catch (e) {
    return NextResponse.json({ error: `生成失败：${e instanceof Error ? e.message : ""}` }, { status: 500 });
  }
}
