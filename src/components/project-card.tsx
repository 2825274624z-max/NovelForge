"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, User } from "lucide-react";
import Link from "next/link";
import type { Project } from "@/store/useStore";

const typeLabels: Record<string, string> = {
  novel: "长篇小说",
  novella: "中篇小说",
  short: "短篇小说",
  serial: "连载",
  other: "其他",
};

export function ProjectCard({
  project,
  onDelete,
}: {
  project: Project;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      <Link href={`/projects/${project.id}/editor`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{project.title}</CardTitle>
              <CardDescription className="line-clamp-2">
                {project.description || "暂无简介"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardFooter className="flex gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{typeLabels[project.type] || project.type}</Badge>
          {project.genre && <Badge variant="outline">{project.genre}</Badge>}
          <span className="flex items-center gap-1 ml-auto">
            <FileText className="w-3.5 h-3.5" />
            {project._count?.chapters ?? 0} 章
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {project._count?.characters ?? 0} 角色
          </span>
        </CardFooter>
      </Link>
      <div className="px-6 pb-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.preventDefault();
            onDelete(project.id);
          }}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          删除
        </Button>
      </div>
    </Card>
  );
}
