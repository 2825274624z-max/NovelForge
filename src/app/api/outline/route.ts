import { NextResponse } from "next/server";
import { getFullOutline } from "@/lib/memory/outline-manager";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const data = await getFullOutline(projectId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/outline error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
