"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, User, Clock } from "lucide-react";
import Link from "next/link";
import type { Project } from "@/store/useStore";

const typeLabels: Record<string, string> = {
  novel: "长篇", novella: "中篇", short: "短篇", serial: "连载", other: "其他",
};

const typeColors: Record<string, { accent: string; bg: string; border: string }> = {
  novel:       { accent: "bg-amber-500", bg: "bg-amber-500/5", border: "border-amber-500/30" },
  novella:     { accent: "bg-sky-500",   bg: "bg-sky-500/5",   border: "border-sky-500/30" },
  short:       { accent: "bg-emerald-500", bg: "bg-emerald-500/5", border: "border-emerald-500/30" },
  serial:      { accent: "bg-violet-500",  bg: "bg-violet-500/5",  border: "border-violet-500/30" },
  other:       { accent: "bg-muted-foreground/40", bg: "bg-muted", border: "border-border" },
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
}

export function ProjectCard({
  project,
  onDelete,
  index = 0,
}: {
  project: Project;
  onDelete: (id: string) => void;
  index?: number;
}) {
  const t = typeColors[project.type] || typeColors.other;

  return (
    <Link href={`/projects/${project.id}`} className="block group" style={{ animationDelay: `${index * 60}ms` }}>
      <Card
        className={`relative overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-foreground/10 ${t.bg}`}
      >
        {/* Left accent strip */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.accent} rounded-l-xl opacity-60 group-hover:opacity-100 transition-opacity`} />

        <CardHeader className="pb-2 pl-5">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 min-w-0">
              <CardTitle className="text-base lg:text-lg truncate">{project.title}</CardTitle>
              <CardDescription className="line-clamp-2 text-xs leading-relaxed">
                {project.description || "暂无简介"}
              </CardDescription>
            </div>
            <div className="shrink-0">
              <Badge variant="secondary" className={`text-[10px] font-normal ${t.border} border`}>
                {typeLabels[project.type] || project.type}
              </Badge>
            </div>
          </div>
        </CardHeader>

        {/* Tags row */}
        <div className="px-6 flex flex-wrap gap-1 mb-2">
          {project.genre && (
            <Badge variant="outline" className="text-[10px] py-0 h-5 font-normal text-muted-foreground">
              {project.genre}
            </Badge>
          )}
          {project.style && (
            <Badge variant="outline" className="text-[10px] py-0 h-5 font-normal text-muted-foreground">
              {project.style}
            </Badge>
          )}
        </div>

        {/* Stats + actions */}
        <div className="px-6 pb-4 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {project._count?.chapters ?? 0} 章
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {project._count?.characters ?? 0} 角色
          </span>
          {project.targetWords > 0 && (
            <span className="tabular-nums">{project.targetWords.toLocaleString()} 字目标</span>
          )}
          <span className="flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" />
            {relativeTime(project.updatedAt)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-200 text-destructive/60 hover:text-destructive -mr-1"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(project.id);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </Card>
    </Link>
  );
}
