"use client";

import { useState, useEffect } from "react";
import { Brain, Loader2 } from "lucide-react";

interface MemoryStatusData {
  totalChapters: number;
  totalWords: number;
  plotThreads: { total: number; open: number; ongoing: number; resolved: number };
  chekhovGuns: { total: number; planted: number; paidOff: number };
  timelineEvents: number;
  characterStateSnapshots: number;
  lastExtract: { chapterNum: number; at: string } | null;
}

interface Props {
  projectId: string;
  onOpenPanel?: () => void;
}

export function MemoryStatus({ projectId, onOpenPanel }: Props) {
  const [data, setData] = useState<MemoryStatusData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch(`/api/memory/status?projectId=${projectId}`)
      .then((res) => res.json())
      .then((d) => { if (!d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading && !data) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground/50">
        <Loader2 className="w-2.5 h-2.5 animate-spin" /> 加载记忆...
      </div>
    );
  }

  if (!data) return null;

  const activeIssues = data.plotThreads.open + data.plotThreads.ongoing + data.chekhovGuns.planted;
  const statusColor = activeIssues === 0 && data.totalChapters > 0
    ? "text-emerald-500"
    : data.lastExtract
      ? "text-amber-500"
      : "text-muted-foreground/50";

  return (
    <button
      onClick={onOpenPanel}
      className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
    >
      <Brain className={`w-3 h-3 shrink-0 ${statusColor}`} />
      <span className="flex-1 text-left">记忆系统</span>
      <span className="text-[9px] opacity-40">
        {data.plotThreads.total > 0
          ? `${data.plotThreads.total}线`
          : data.totalChapters > 0 ? "..." : "—"}
      </span>
    </button>
  );
}
