import { NextResponse } from "next/server";
import { extractMemories } from "@/lib/memory/memory-extractor";

export async function POST(req: Request) {
  try {
    const { projectId, chapterId } = await req.json();
    if (!projectId || !chapterId) {
      return NextResponse.json({ error: "Missing projectId or chapterId" }, { status: 400 });
    }

    const result = await extractMemories(projectId, chapterId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/memory/extract error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
