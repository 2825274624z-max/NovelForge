import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { projectId, provider, model, baseUrl, apiKey, temperature, maxTokens, topP, frequencyPenalty, presencePenalty, reasoningEffort } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const data = {
      provider: provider || "openai", model: model || "gpt-4o",
      baseUrl: baseUrl || "", apiKey: apiKey || "",
      temperature: temperature ?? 0.7, maxTokens: maxTokens ?? 8192,
      topP: topP ?? 1.0, frequencyPenalty: frequencyPenalty ?? 0,
      presencePenalty: presencePenalty ?? 0, reasoningEffort: reasoningEffort || "",
    };

    const settings = await prisma.aISettings.upsert({
      where: { projectId },
      update: data,
      create: { projectId, ...data },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("PUT /api/ai/settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
