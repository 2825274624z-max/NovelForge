import { NextResponse } from "next/server";
import { saveVolume, deleteVolume } from "@/lib/memory/outline-manager";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, ...data } = body;
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const volume = await saveVolume(projectId, data);
    return NextResponse.json(volume, { status: 201 });
  } catch (error) {
    console.error("POST /api/outline/volumes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await req.json();
    const volume = await saveVolume(body.projectId, { ...body, id });
    return NextResponse.json(volume);
  } catch (error) {
    console.error("PUT /api/outline/volumes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await deleteVolume(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/outline/volumes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
