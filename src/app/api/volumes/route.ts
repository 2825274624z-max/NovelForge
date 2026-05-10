import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const volumes = await (prisma as any).volume.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    select: { id: true, title: true, summary: true, order: true, status: true },
  });
  return NextResponse.json(volumes);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { projectId, title, summary, order, status } = body;
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const vol = await (prisma as any).volume.create({
    data: { projectId, title: title || "新卷", summary: summary || "", order: order || 0, status: status || "planned" },
  });
  return NextResponse.json(vol, { status: 201 });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { id, title, summary, status } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const data: Record<string, any> = {};
  if (title !== undefined) data.title = title;
  if (summary !== undefined) data.summary = summary;
  if (status !== undefined) data.status = status;
  const vol = await (prisma as any).volume.update({ where: { id }, data });
  return NextResponse.json(vol);
}
