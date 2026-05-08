"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useProjects, useCreateProject, useDeleteProject } from "@/lib/queries";
import { ProjectCard } from "@/components/project-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  BookOpen,
  FileText,
  User,
  Search,
  Library,
  Sparkles,
} from "lucide-react";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

export default function ProjectsPage() {
  const router = useRouter();
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    title: "",
    type: "novel",
    genre: "",
    style: "",
    description: "",
  });

  const filtered = useMemo(
    () =>
      search.trim()
        ? projects.filter(
            (p) =>
              p.title.includes(search.trim()) ||
              (p.description && p.description.includes(search.trim())) ||
              (p.genre && p.genre.includes(search.trim()))
          )
        : projects,
    [projects, search]
  );

  const stats = useMemo(() => {
    const totalChapters = projects.reduce((s, p) => s + (p._count?.chapters ?? 0), 0);
    const totalCharacters = projects.reduce((s, p) => s + (p._count?.characters ?? 0), 0);
    return { totalProjects: projects.length, totalChapters, totalCharacters };
  }, [projects]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("请输入作品标题");
      return;
    }
    try {
      const project = await createProject.mutateAsync(form);
      toast.success("作品创建成功");
      setOpen(false);
      setForm({ title: "", type: "novel", genre: "", style: "", description: "" });
      router.push(`/projects/${project.id}`);
    } catch {
      toast.error("创建失败");
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProject.mutateAsync(id);
    toast.success("已删除");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─── */}
      <header className="relative border-b bg-gradient-to-b from-muted/30 to-transparent">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-background" />
            </div>
            <span className="font-semibold text-sm tracking-tight">Yuagent</span>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" className="text-xs h-7 sm:h-8 gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">新建作品</span>
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>创建新作品</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>作品标题</Label>
                    <Input
                      placeholder="输入作品名称"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>类型</Label>
                      <Select
                        value={form.type}
                        onValueChange={(v) => setForm({ ...form, type: v || "novel" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="novel">长篇小说</SelectItem>
                          <SelectItem value="novella">中篇小说</SelectItem>
                          <SelectItem value="short">短篇小说</SelectItem>
                          <SelectItem value="serial">连载</SelectItem>
                          <SelectItem value="other">其他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>题材</Label>
                      <Input
                        placeholder="如：玄幻、科幻、言情"
                        value={form.genre}
                        onChange={(e) => setForm({ ...form, genre: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>风格</Label>
                    <Input
                      placeholder="如：轻松、严肃、悬疑"
                      value={form.style}
                      onChange={(e) => setForm({ ...form, style: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>简介</Label>
                    <Textarea
                      placeholder="作品的简要介绍"
                      className="h-20"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreate} disabled={createProject.isPending}>
                    {createProject.isPending ? "创建中..." : "创建"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* ─── Hero ─── */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">我的作品</h2>
          <p className="text-muted-foreground mt-1.5 text-sm">AI 驱动的小说创作工作台</p>

          {/* Stats pills */}
          {stats.totalProjects > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                <Library className="w-3 h-3" />
                <span className="font-medium text-foreground">{stats.totalProjects}</span> 个作品
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                <FileText className="w-3 h-3" />
                <span className="font-medium text-foreground">{stats.totalChapters}</span> 章
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span className="font-medium text-foreground">{stats.totalCharacters}</span> 角色
              </div>
            </div>
          )}
        </div>

        {/* ─── Search ─── */}
        {projects.length > 0 && (
          <div className="relative mb-6 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              className="pl-9 h-9 text-xs"
              placeholder="搜索作品..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* ─── Content ─── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-xl border bg-card">
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-full" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                  <div className="flex gap-2 mt-3">
                    <div className="h-5 w-12 bg-muted rounded-full animate-pulse" />
                    <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
                  </div>
                  <div className="flex justify-between mt-3">
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          /* ─── Empty state ─── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mb-6">
              <Sparkles className="w-9 h-9 text-muted-foreground/25" />
            </div>
            <h3 className="text-lg font-semibold mb-2">开始你的第一部作品</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
              AI 辅助写作，从大纲到完稿。支持多 Provider、资产库管理、流式写作。
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                创建第一个作品
              </Button>
              <Button variant="outline" onClick={() => router.push("/projects")}>
                了解更多
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          /* ─── No search results ─── */
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">没有匹配的作品</p>
            <Button
              variant="link"
              size="sm"
              className="text-xs mt-1"
              onClick={() => setSearch("")}
            >
              清除搜索
            </Button>
          </div>
        ) : (
          /* ─── Project grid ─── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((p, i) => (
              <div key={p.id} className="animate-in fade-in slide-in-from-bottom-3 duration-300" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}>
                <ProjectCard project={p} onDelete={handleDelete} index={i} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/40 py-4 text-center mt-auto">
        <p className="text-[10px] text-muted-foreground/25">
          Yuagent · 斗包要打野 · 2825274624z@gmail.com
        </p>
      </footer>
    </div>
  );
}
