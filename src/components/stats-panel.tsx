"use client";

import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flame, Pencil, Calendar, TrendingUp } from "lucide-react";
import type { StatsData } from "@/lib/queries";

interface StatsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: StatsData | undefined;
  loading: boolean;
}

function getHeatColor(wordCount: number, maxWords: number): string {
  if (wordCount === 0) return "bg-muted";
  const ratio = Math.min(wordCount / Math.max(maxWords, 1), 1);
  if (ratio < 0.25) return "bg-emerald-200 dark:bg-emerald-800";
  if (ratio < 0.5) return "bg-emerald-300 dark:bg-emerald-700";
  if (ratio < 0.75) return "bg-emerald-400 dark:bg-emerald-600";
  return "bg-emerald-500 dark:bg-emerald-500";
}

function HeatmapGrid({ dailyLogs }: { dailyLogs: { date: string; wordCount: number }[] }) {
  const maxWords = useMemo(
    () => Math.max(...dailyLogs.map((d) => d.wordCount), 1),
    [dailyLogs],
  );

  // Build week columns: 7 rows (Mon..Sun) × N columns
  // dailyLogs[0] is 90 days ago, dailyLogs[89] is today
  const weeks: { date: string; wordCount: number }[][] = [];
  const firstDay = new Date(dailyLogs[0]?.date ?? "");
  const startDayOfWeek = firstDay.getDay(); // 0=Sun, 1=Mon,...

  // Add empty padding for the first week
  let currentWeek: { date: string; wordCount: number }[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push({ date: "", wordCount: -1 });
  }

  for (const log of dailyLogs) {
    currentWeek.push(log);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: "", wordCount: -1 });
    }
    weeks.push(currentWeek);
  }

  const dayLabels = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="flex gap-1">
      {/* Day labels */}
      <div className="flex flex-col gap-1 mr-1">
        {dayLabels.map((label, i) => (
          <div
            key={i}
            className="w-5 h-3 flex items-center justify-center text-[9px] text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Week columns */}
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 shrink-0">
            {week.map((day, di) => (
              <div
                key={`${wi}-${di}`}
                title={
                  day.wordCount >= 0
                    ? `${day.date}: ${day.wordCount.toLocaleString()} 字`
                    : ""
                }
                className={`w-3 h-3 rounded-sm transition-colors ${
                  day.wordCount >= 0
                    ? getHeatColor(day.wordCount, maxWords)
                    : "bg-transparent"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsPanel({ open, onOpenChange, stats, loading }: StatsPanelProps) {
  const defaults = {
    currentStreak: 0,
    bestStreak: 0,
    dailyAverage: 0,
    totalDays: 0,
    totalWords: 0,
    dailyLogs: [] as { date: string; wordCount: number }[],
  };

  const s = { ...defaults, ...stats };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[calc(100vw-2rem)] sm:w-[360px] md:w-[380px] max-w-full">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            写作统计
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-6 pb-4">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Current streak */}
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  连续写作
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {loading ? (
                    <span className="text-muted-foreground/40">-</span>
                  ) : (
                    s.currentStreak
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">天</div>
              </div>

              {/* Best streak */}
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  最佳纪录
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {loading ? (
                    <span className="text-muted-foreground/40">-</span>
                  ) : (
                    s.bestStreak
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">天</div>
              </div>

              {/* Daily average */}
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                  <Pencil className="w-3.5 h-3.5" />
                  日均字数
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {loading ? (
                    <span className="text-muted-foreground/40">-</span>
                  ) : (
                    s.dailyAverage.toLocaleString()
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">字/天</div>
              </div>

              {/* Total days */}
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  写作天数
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {loading ? (
                    <span className="text-muted-foreground/40">-</span>
                  ) : (
                    s.totalDays
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">/ 90 天</div>
              </div>
            </div>

            {/* Total words */}
            <div className="rounded-lg border bg-card p-3">
              <div className="text-[11px] text-muted-foreground mb-1">
                近 90 天总字数
              </div>
              <div className="text-xl font-bold tabular-nums">
                {loading ? (
                  <span className="text-muted-foreground/40">-</span>
                ) : (
                  s.totalWords.toLocaleString()
                )}
              </div>
            </div>

            {/* Heatmap */}
            <div>
              <div className="text-[11px] text-muted-foreground mb-2 font-medium">
                写作热力图（近 90 天）
              </div>
              {loading ? (
                <div className="h-[52px] bg-muted rounded-lg animate-pulse" />
              ) : s.dailyLogs.length > 0 ? (
                <HeatmapGrid dailyLogs={s.dailyLogs} />
              ) : (
                <div className="text-[11px] text-muted-foreground/60 py-4 text-center">
                  暂无数据，开始写作吧
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
