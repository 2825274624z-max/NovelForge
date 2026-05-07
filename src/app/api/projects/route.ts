import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          _count: { select: { chapters: true, characters: true } },
          aiSettings: true,
        },
      });
      if (!project) return NextResponse.json(null, { status: 404 });
      return NextResponse.json(project);
    }

    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { chapters: true, characters: true } },
      },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const project = await prisma.project.create({
      data: {
        title: body.title || "未命名作品",
        type: body.type || "novel",
        genre: body.genre || "",
        style: body.style || "",
        targetWords: body.targetWords || 0,
        description: body.description || "",
        worldView: body.worldView || "",
        writingReqs: body.writingReqs || "",
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
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
    const project = await prisma.project.update({
      where: { id },
      data: {
        title: body.title,
        type: body.type,
        genre: body.genre,
        style: body.style,
        targetWords: body.targetWords,
        description: body.description,
        worldView: body.worldView,
        writingReqs: body.writingReqs,
        status: body.status,
      },
    });
    return NextResponse.json(project);
  } catch (error) {
    console.error("PUT /api/projects error:", error);
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

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
