import { NextResponse } from "next/server";
import { assembleContext } from "@/lib/memory/context-assembler";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const chapterNum = parseInt(searchParams.get("chapterNum") || "0", 10);

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const result = await assembleContext(projectId, chapterNum || 1);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/memory/context error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
