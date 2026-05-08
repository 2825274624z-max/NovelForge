import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/stats?projectId=xxx
 * Returns daily writing statistics for the given project.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // Fetch logs for the last 90 days
    const today = new Date();
    const dates: string[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
    }

    const logs = await prisma.dailyWritingLog.findMany({
      where: {
        projectId,
        date: { gte: dates[0] },
      },
      orderBy: { date: "asc" },
    });

    // Build a map for quick lookup
    const logMap = new Map<string, number>();
    for (const log of logs) {
      logMap.set(log.date, log.wordCount);
    }

    // Build the dailyLogs array for the last 90 days
    const dailyLogs = dates.map((date) => ({
      date,
      wordCount: logMap.get(date) ?? 0,
    }));

    // Total words (sum of all daily logs)
    const totalWords = dailyLogs.reduce((sum, d) => sum + d.wordCount, 0);

    // Total days where words were written
    const totalDays = dailyLogs.filter((d) => d.wordCount > 0).length;

    // Daily average (over totalDays, or over 90 if no days)
    const dailyAverage =
      totalDays > 0 ? Math.round(totalWords / totalDays) : 0;

    // Current streak: consecutive days from today going backwards
    let currentStreak = 0;
    // Start from today (dates[89]) and go backwards
    for (let i = dates.length - 1; i >= 0; i--) {
      const count = logMap.get(dates[i]) ?? 0;
      if (count > 0) {
        currentStreak++;
      } else {
        // Today can be 0 (haven't written yet), but if today is 0,
        // check if it's today — skip today if today has no words yet
        const dateStr = dates[i];
        const todayStr = today.toISOString().slice(0, 10);
        if (dateStr === todayStr && count === 0) {
          // Today hasn't been written yet, continue checking yesterday
          continue;
        }
        break;
      }
    }

    // Best streak: maximum consecutive days in the 90-day period
    let bestStreak = 0;
    let streak = 0;
    for (const date of dates) {
      const count = logMap.get(date) ?? 0;
      if (count > 0) {
        streak++;
        if (streak > bestStreak) bestStreak = streak;
      } else {
        streak = 0;
      }
    }

    return NextResponse.json({
      dailyLogs,
      totalWords,
      currentStreak,
      bestStreak,
      dailyAverage,
      totalDays,
    });
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/stats
 * Body: { projectId, date, wordCount }
 * Upserts: if a record exists for (projectId, date), accumulates wordCount.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, date, wordCount } = body;

    if (!projectId || !date) {
      return NextResponse.json(
        { error: "Missing projectId or date" },
        { status: 400 },
      );
    }

    if (typeof wordCount !== "number" || wordCount <= 0) {
      return NextResponse.json({ skipped: true });
    }

    // Try to find existing record for this project+date
    const existing = await prisma.dailyWritingLog.findFirst({
      where: { projectId, date },
    });

    if (existing) {
      await prisma.dailyWritingLog.update({
        where: { id: existing.id },
        data: { wordCount: existing.wordCount + wordCount },
      });
    } else {
      await prisma.dailyWritingLog.create({
        data: { projectId, date, wordCount },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
