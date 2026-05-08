import { NextResponse } from "next/server";
import { saveChapterOutline } from "@/lib/memory/outline-manager";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chapterId } = body;
    if (!chapterId) {
      return NextResponse.json({ error: "Missing chapterId" }, { status: 400 });
    }

    const outline = await saveChapterOutline(body);
    return NextResponse.json(outline, { status: 201 });
  } catch (error) {
    console.error("POST /api/outline/chapter-outline error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
