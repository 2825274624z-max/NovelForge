import { NextResponse } from "next/server";
import { adjustOutline } from "@/lib/memory/outline-manager";
import type { AIProviderConfig } from "@/lib/ai/provider";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, provider, model, baseUrl, apiKey } = body;
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const config: AIProviderConfig = {
      provider: (provider || "deepseek") as AIProviderConfig["provider"],
      model: model || "deepseek-v4-flash",
      baseUrl: baseUrl || "https://api.deepseek.com",
      apiKey: apiKey || "",
      temperature: 0.5,
      maxTokens: 4096,
    };

    const result = await adjustOutline(projectId, config);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/outline/adjust error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "调整失败" }, { status: 500 });
  }
}
