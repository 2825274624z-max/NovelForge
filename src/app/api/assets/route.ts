import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Single endpoint to fetch all asset types for a project — replaces 7 parallel requests
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

    const [
      characters,
      worldBuilding,
      locations,
      organizations,
      items,
      foreshadowings,
      timelines,
    ] = await Promise.all([
      prisma.character.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
      prisma.worldBuilding.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
      prisma.location.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
      prisma.organization.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
      prisma.item.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
      prisma.foreshadowing.findMany({ where: { projectId }, orderBy: { order: "asc" } }),
      prisma.timeline.findMany({ where: { projectId }, orderBy: { timePos: "asc" } }),
    ]);

    return NextResponse.json({
      characters, worldBuilding, locations, organizations, items, foreshadowings, timelines,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
