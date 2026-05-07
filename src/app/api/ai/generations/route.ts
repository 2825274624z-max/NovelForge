import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where = projectId ? { projectId } : {};
    const generations = await prisma.aIGeneration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(generations);
  } catch (error) {
    console.error("GET /api/ai/generations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      projectId,
      chapterId,
      workflow,
      model,
      provider,
      prompt,
      systemPrompt,
      output,
      temperature,
      maxTokens,
    } = body;

    if (!projectId || !workflow || !prompt || !output) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const gen = await prisma.aIGeneration.create({
      data: {
        projectId,
        chapterId: chapterId || null,
        workflow: workflow || "",
        model: model || "",
        provider: provider || "",
        prompt,
        systemPrompt: systemPrompt || "",
        output,
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 4096,
      },
    });
    return NextResponse.json(gen, { status: 201 });
  } catch (error) {
    console.error("POST /api/ai/generations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
