import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { projectId, provider, model, baseUrl, apiKey, temperature, maxTokens } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const settings = await prisma.aISettings.upsert({
      where: { projectId },
      update: {
        provider: provider || "openai",
        model: model || "gpt-4o",
        baseUrl: baseUrl || "",
        apiKey: apiKey || "",
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 4096,
      },
      create: {
        projectId,
        provider: provider || "openai",
        model: model || "gpt-4o",
        baseUrl: baseUrl || "",
        apiKey: apiKey || "",
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 4096,
      },
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
