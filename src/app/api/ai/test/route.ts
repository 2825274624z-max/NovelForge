import { NextResponse } from "next/server";
import { createProvider, type AIProviderConfig } from "@/lib/ai/provider";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, model, baseUrl, apiKey } = body;

    const config: AIProviderConfig = {
      provider: provider || "openai",
      model: model || "gpt-4o",
      baseUrl: baseUrl || "",
      apiKey: apiKey || "",
      temperature: 0.1,
      maxTokens: 50,
    };

    const ai = createProvider(config);
    const response = await ai.chat({
      system: "用中文回复「连接成功」",
      messages: [{ role: "user", content: "测试" }],
    });

    return NextResponse.json({
      success: true,
      model: response.model,
      message: response.content,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "连接失败",
    });
  }
}
