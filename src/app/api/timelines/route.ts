import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const projectId = searchParams.get("projectId");
    if (id) return NextResponse.json(await prisma.timeline.findUnique({ where: { id } }));
    if (projectId) return NextResponse.json(await prisma.timeline.findMany({ where: { projectId }, orderBy: { timePos: "asc" } }));
    return NextResponse.json([]);
  } catch (e) { console.error(e); return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    const last = await prisma.timeline.findFirst({ where: { projectId: body.projectId }, orderBy: { timePos: "desc" } });
    const entry = await prisma.timeline.create({
      data: {
        projectId: body.projectId, title: body.title || "新事件", content: body.content || "",
        timePos: body.timePos ?? (last?.timePos ?? -1) + 1,
        relatedCharacters: body.relatedCharacters || "", relatedChapters: body.relatedChapters || "",
        order: (last?.order ?? -1) + 1,
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    return NextResponse.json(await prisma.timeline.update({ where: { id }, data: await req.json() }));
  } catch (e) { console.error(e); return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await prisma.timeline.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) { console.error(e); return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}
