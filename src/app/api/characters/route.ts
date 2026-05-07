import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");

    if (id) {
      const character = await prisma.character.findUnique({ where: { id } });
      return NextResponse.json(character);
    }
    if (projectId) {
      const characters = await prisma.character.findMany({
        where: { projectId },
        orderBy: { order: "asc" },
      });
      return NextResponse.json(characters);
    }
    return NextResponse.json([]);
  } catch (error) {
    console.error("GET /api/characters error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }
    const lastChar = await prisma.character.findFirst({
      where: { projectId: body.projectId },
      orderBy: { order: "desc" },
    });
    const character = await prisma.character.create({
      data: {
        projectId: body.projectId,
        name: body.name || "新角色",
        identity: body.identity || "",
        personality: body.personality || "",
        goals: body.goals || "",
        relationships: body.relationships || "",
        quirks: body.quirks || "",
        appearance: body.appearance || "",
        backstory: body.backstory || "",
        order: (lastChar?.order ?? -1) + 1,
      },
    });
    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    console.error("POST /api/characters error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json();
    const character = await prisma.character.update({ where: { id }, data: body });
    return NextResponse.json(character);
  } catch (error) {
    console.error("PUT /api/characters error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await prisma.character.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/characters error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
