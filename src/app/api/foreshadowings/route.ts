import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");

    if (id) {
      const entry = await prisma.foreshadowing.findUnique({ where: { id } });
      return NextResponse.json(entry);
    }
    if (projectId) {
      const entries = await prisma.foreshadowing.findMany({
        where: { projectId },
        orderBy: { order: "asc" },
      });
      return NextResponse.json(entries);
    }
    return NextResponse.json([]);
  } catch (error) {
    console.error("GET /api/foreshadowings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }
    const last = await prisma.foreshadowing.findFirst({
      where: { projectId: body.projectId },
      orderBy: { order: "desc" },
    });
    const entry = await prisma.foreshadowing.create({
      data: {
        projectId: body.projectId,
        title: body.title || "新伏笔",
        description: body.description || "",
        chapterHint: body.chapterHint || "",
        resolved: body.resolved ?? false,
        order: (last?.order ?? -1) + 1,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("POST /api/foreshadowings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json();
    const entry = await prisma.foreshadowing.update({ where: { id }, data: body });
    return NextResponse.json(entry);
  } catch (error) {
    console.error("PUT /api/foreshadowings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await prisma.foreshadowing.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/foreshadowings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
