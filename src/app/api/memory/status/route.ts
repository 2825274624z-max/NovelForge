import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const [
      project,
      ptTotal, ptOpen, ptOngoing, ptResolved,
      cgTotal, cgPlanted, cgPaidOff,
      teCount, csCount,
      chCount, chWords,
    ] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: { title: true, targetWords: true },
      }),
      prisma.plotThread.count({ where: { projectId } }),
      prisma.plotThread.count({ where: { projectId, status: "open" } }),
      prisma.plotThread.count({ where: { projectId, status: "ongoing" } }),
      prisma.plotThread.count({ where: { projectId, status: "resolved" } }),
      prisma.chekhovGun.count({ where: { projectId } }),
      prisma.chekhovGun.count({ where: { projectId, status: "planted" } }),
      prisma.chekhovGun.count({ where: { projectId, status: "paid_off" } }),
      prisma.timelineEvent.count({ where: { projectId } }),
      prisma.characterState.count(),
      prisma.chapter.count({ where: { projectId } }),
      prisma.chapter.aggregate({ where: { projectId }, _sum: { wordCount: true } }),
    ]);

    const lastExtract = await prisma.timelineEvent.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, chapterNum: true },
    });

    return NextResponse.json({
      project: project ? { title: project.title, targetWords: project.targetWords } : null,
      totalChapters: chCount,
      totalWords: chWords._sum.wordCount || 0,
      plotThreads: {
        total: ptTotal,
        open: ptOpen,
        ongoing: ptOngoing,
        resolved: ptResolved,
      },
      chekhovGuns: { total: cgTotal, planted: cgPlanted, paidOff: cgPaidOff },
      timelineEvents: teCount,
      characterStateSnapshots: csCount,
      lastExtract: lastExtract ? { chapterNum: lastExtract.chapterNum, at: lastExtract.createdAt } : null,
    });
  } catch (error) {
    console.error("GET /api/memory/status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
