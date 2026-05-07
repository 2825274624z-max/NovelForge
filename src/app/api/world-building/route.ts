import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");

    if (id) {
      const entry = await prisma.worldBuilding.findUnique({ where: { id } });
      return NextResponse.json(entry);
    }
    if (projectId) {
      const entries = await prisma.worldBuilding.findMany({
        where: { projectId },
        orderBy: { order: "asc" },
      });
      return NextResponse.json(entries);
    }
    return NextResponse.json([]);
  } catch (error) {
    console.error("GET /api/world-building error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }
    const last = await prisma.worldBuilding.findFirst({
      where: { projectId: body.projectId },
      orderBy: { order: "desc" },
    });
    const entry = await prisma.worldBuilding.create({
      data: {
        projectId: body.projectId,
        title: body.title || "新条目",
        content: body.content || "",
        type: body.type || "general",
        order: (last?.order ?? -1) + 1,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("POST /api/world-building error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json();
    const entry = await prisma.worldBuilding.update({ where: { id }, data: body });
    return NextResponse.json(entry);
  } catch (error) {
    console.error("PUT /api/world-building error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await prisma.worldBuilding.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/world-building error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
