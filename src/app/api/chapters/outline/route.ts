import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const chapterId = searchParams.get("chapterId");
  if (!chapterId) return NextResponse.json({ error: "Missing chapterId" }, { status: 400 });

  const outline = await (prisma as any).chapterOutline.findUnique({
    where: { chapterId },
    select: { summary: true, keyEvents: true, characterArcs: true, plotThreads: true, wordTarget: true, taskCard: true },
  });
  return NextResponse.json(outline || {});
}

export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url);
  const chapterId = searchParams.get("chapterId");
  if (!chapterId) return NextResponse.json({ error: "Missing chapterId" }, { status: 400 });

  const body = await req.json();
  const outline = await (prisma as any).chapterOutline.upsert({
    where: { chapterId },
    update: {
      summary: body.summary ?? undefined,
      keyEvents: body.keyEvents ?? undefined,
      characterArcs: body.characterArcs ?? undefined,
      plotThreads: body.plotThreads ?? undefined,
      wordTarget: body.wordTarget ?? undefined,
      taskCard: body.taskCard ?? undefined,
    },
    create: {
      chapterId,
      summary: body.summary || "",
      keyEvents: body.keyEvents || "[]",
      characterArcs: body.characterArcs || "[]",
      plotThreads: body.plotThreads || "[]",
      wordTarget: body.wordTarget || 0,
      taskCard: body.taskCard || "",
    },
  });
  return NextResponse.json(outline);
}
