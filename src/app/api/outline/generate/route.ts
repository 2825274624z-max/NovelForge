import { NextResponse } from "next/server";
import { generateOutline } from "@/lib/memory/outline-manager";
import type { AIProviderConfig } from "@/lib/ai/provider";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, provider, model, baseUrl, apiKey, temperature, maxTokens } = body;
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const config: AIProviderConfig = {
      provider: (provider || "deepseek") as AIProviderConfig["provider"],
      model: model || "deepseek-v4-flash",
      baseUrl: baseUrl || "https://api.deepseek.com",
      apiKey: apiKey || "",
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 8192,
    };

    const result = await generateOutline(projectId, config);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/outline/generate error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "生成失败" }, { status: 500 });
  }
}
