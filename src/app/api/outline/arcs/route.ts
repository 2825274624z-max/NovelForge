import { NextResponse } from "next/server";
import { saveStoryArc, deleteStoryArc } from "@/lib/memory/outline-manager";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, ...data } = body;
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const arc = await saveStoryArc(projectId, data);
    return NextResponse.json(arc, { status: 201 });
  } catch (error) {
    console.error("POST /api/outline/arcs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json();
    const arc = await saveStoryArc(body.projectId, { ...body, id });
    return NextResponse.json(arc);
  } catch (error) {
    console.error("PUT /api/outline/arcs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await deleteStoryArc(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/outline/arcs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
