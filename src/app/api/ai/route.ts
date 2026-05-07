import { NextResponse } from "next/server";
import { createProvider, type AIProviderConfig } from "@/lib/ai/provider";

const SYSTEM_PROMPTS: Record<string, string> = {
  outline:
    "你是一位专业的文学创作顾问。根据用户提供的项目信息，生成一份详细的小说大纲。大纲应包括：故事主线、主要情节节点、核心冲突、人物弧光、主题立意。请用中文回复，结构清晰，分点论述。",
  draft:
    "你是一位优秀的小说写手。根据大纲和章节设定，撰写完整的章节正文。要求：文学性强，描写细腻，对话自然，情节推进合理。请用中文写作。",
  continue:
    "你是一位优秀的小说写手。请根据已有的章节内容，自然地续写下去。要求：保持风格一致，衔接自然，情节连贯。请用中文写作。",
  polish:
    "你是一位资深的文学编辑。请对以下文本进行润色。要求：保持原意和风格，优化表达，修正语病，提升文学性。请用中文回复，只输出润色后的文本。",
  expand:
    "你是一位资深的文学编辑。请对以下文本进行扩写。要求：丰富细节，增加描写和对话，扩展情节，保持风格一致。请用中文回复，只输出扩写后的文本。",
  shorten:
    "你是一位资深的文学编辑。请对以下文本进行缩写。要求：保留核心信息和风格，删减冗余，使表达更简洁有力。请用中文回复，只输出缩写后的文本。",
  summary:
    "请对以下章节内容进行简洁的总结。包括：主要事件、关键对话、重要伏笔。请在100-200字内完成，用中文回复。",
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, model, baseUrl, apiKey, temperature, maxTokens, workflow, message, context } = body;

    const config: AIProviderConfig = {
      provider: provider || "openai",
      model: model || "gpt-4o",
      baseUrl: baseUrl || "",
      apiKey: apiKey || "",
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 4096,
    };

    const ai = createProvider(config);
    const systemPrompt = SYSTEM_PROMPTS[workflow as string] || SYSTEM_PROMPTS.draft;
    const fullSystem = context
      ? `${systemPrompt}\n\n## 项目上下文\n${context}`
      : systemPrompt;

    const stream = await ai.stream({
      system: fullSystem,
      messages: [{ role: "user", content: message }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : "Stream error";
          controller.enqueue(encoder.encode(`\n\n[错误: ${errMsg}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("POST /api/ai error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI request failed" },
      { status: 500 }
    );
  }
}
