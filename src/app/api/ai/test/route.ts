import { NextResponse } from "next/server";
import { createProvider, type AIProviderConfig } from "@/lib/ai/provider";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, model, baseUrl, apiKey } = body;

    if (!provider) return NextResponse.json({ success: false, message: "请选择 AI Provider" });
    if (!apiKey && !process.env[`${provider.toUpperCase()}_API_KEY`]) {
      return NextResponse.json({ success: false, message: "请填写 API Key 或在 .env 中配置" });
    }

    const config: AIProviderConfig = {
      provider: provider || "deepseek",
      model: model || "deepseek-v4-flash",
      baseUrl: baseUrl || "",
      apiKey: apiKey || "",
      temperature: 0.1,
      maxTokens: 50,
    };

    const ai = createProvider(config);
    const response = await ai.chat({
      system: "Reply with 'OK connected' in English only.",
      messages: [{ role: "user", content: "ping" }],
    });

    return NextResponse.json({
      success: true,
      model: response.model,
      message: response.content,
    });
  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : "连接失败";
    // 过滤掉 Node.js 底层 ByteString 错误，给出更友好的提示
    const friendlyMsg = rawMsg.includes("ByteString")
      ? "AI 服务通信异常，请检查 Provider 和 Base URL 是否匹配，或稍后重试"
      : rawMsg;
    return NextResponse.json({ success: false, message: friendlyMsg });
  }
}
