import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { countWords } from "@/lib/word-count";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");

    if (id) {
      const chapter = await prisma.chapter.findUnique({
        where: { id },
        include: { histories: { orderBy: { version: "desc" }, take: 5 } },
      });
      return NextResponse.json(chapter);
    }

    if (projectId) {
      const chapters = await prisma.chapter.findMany({
        where: { projectId },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          order: true,
          status: true,
          wordCount: true,
        },
      });
      return NextResponse.json(chapters);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error("GET /api/chapters error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, title } = body;
    if (!projectId)
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

    const lastChapter = await prisma.chapter.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
    });

    const chapter = await prisma.chapter.create({
      data: {
        projectId,
        title: title || "新章节",
        order: (lastChapter?.order ?? -1) + 1,
      },
    });
    return NextResponse.json(chapter, { status: 201 });
  } catch (error) {
    console.error("POST /api/chapters error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json();
    const existing = await prisma.chapter.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

    const wordCount = countWords(body.content || existing.content);

    const chapter = await prisma.chapter.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        content: body.content ?? existing.content,
        status: body.status ?? existing.status,
        wordCount,
      },
    });

    if (body.content && body.content !== existing.content) {
      const lastHistory = await prisma.chapterHistory.findFirst({
        where: { chapterId: id },
        orderBy: { version: "desc" },
      });
      await prisma.chapterHistory.create({
        data: {
          chapterId: id,
          title: body.title || existing.title,
          content: body.content || existing.content,
          wordCount,
          version: (lastHistory?.version ?? 0) + 1,
        },
      });
    }

    return NextResponse.json(chapter);
  } catch (error) {
    console.error("PUT /api/chapters error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await prisma.chapter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/chapters error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
