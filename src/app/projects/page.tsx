"use client";

import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/useStore";
import { ProjectCard } from "@/components/project-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function ProjectsPage() {
  const { projects, loading, fetchProjects, deleteProject } = useProjectStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "novel",
    genre: "",
    style: "",
    description: "",
  });

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("请输入作品标题");
      return;
    }
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("作品创建成功");
        setOpen(false);
        setForm({ title: "", type: "novel", genre: "", style: "", description: "" });
        fetchProjects();
      }
    } catch {
      toast.error("创建失败");
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProject(id);
    toast.success("已删除");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <BookOpen className="w-5 h-5" />
            Yuagent
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger>
                <Button>
                  <Plus className="w-4 h-4 mr-1" />
                  新建作品
                </Button>
              </DialogTrigger>
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
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreate}>创建</Button>
                </div>
              </DialogContent>
            </Dialog>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">我的作品</h2>
          <p className="text-muted-foreground mt-1">
            共 {projects.length} 个作品
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BookOpen className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg mb-2">还没有作品</p>
            <p className="text-sm mb-6">点击右上角&ldquo;新建作品&rdquo;开始创作</p>
            <Button variant="outline" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> 创建第一个作品
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border/40 py-3 text-center">
        <p className="text-[10px] text-muted-foreground/30">
          Yuagent · 斗包要打野 · 2825274624z@gmail.com
        </p>
      </footer>
    </div>
  );
}
