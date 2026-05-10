"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Save, Trash2, Download, FileText, BookOpen, Loader2, Plus, Layers } from "lucide-react";
import { toast } from "sonner";

interface ProjectForm {
  title: string; type: string; genre: string; style: string; targetWords: number;
  description: string; worldView: string; writingReqs: string;
}

interface VolumeItem { id: string; title: string; summary: string; order: number; status: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectForm: ProjectForm;
  onProjectFormChange: (v: ProjectForm) => void;
  onSave: () => void;
  onExport: (format: string) => void;
  onDelete: () => void;
  onGenerateBible: () => void;
  generatingBible: boolean;
  projectId: string;
}

export function SettingsSheet({
  open, onOpenChange,
  projectForm,
  onProjectFormChange,
  onSave, onExport, onDelete,
  onGenerateBible, generatingBible, projectId,
}: Props) {
  const set = (patch: Partial<ProjectForm>) => onProjectFormChange({ ...projectForm, ...patch });

  // Volume management
  const [volumes, setVolumes] = useState<VolumeItem[]>([]);
  const [newVolTitle, setNewVolTitle] = useState("");
  useEffect(() => {
    if (!open) return;
    fetch(`/api/volumes?projectId=${projectId}`).then(r => r.json()).then(d => setVolumes(Array.isArray(d) ? d : [])).catch(() => {});
  }, [open, projectId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-full w-[98vw] h-[98vh] p-0 flex flex-col gap-0 rounded-xl">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-base">作品设置</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full">
          {/* 基本信息 */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">基本信息</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">作品标题</Label>
              <Input className="text-xs h-8" value={projectForm.title} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">类型</Label>
                <Select value={projectForm.type} onValueChange={(v) => v && set({ type: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novel">长篇小说</SelectItem><SelectItem value="novella">中篇小说</SelectItem>
                    <SelectItem value="short">短篇小说</SelectItem><SelectItem value="serial">连载</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">题材</Label>
                <Input className="text-xs h-8" value={projectForm.genre} onChange={(e) => set({ genre: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">风格</Label>
              <Input className="text-xs h-8" value={projectForm.style} onChange={(e) => set({ style: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">目标字数</Label>
              <Input type="number" className="text-xs h-8" value={projectForm.targetWords}
                onChange={(e) => set({ targetWords: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">简介</Label>
              <Textarea className="text-sm h-24 resize-y" placeholder="作品的核心设定、故事梗概..."
                value={projectForm.description} onChange={(e) => set({ description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">世界观设定</Label>
              <Textarea className="text-sm h-28 resize-y" placeholder="世界背景、势力分布、规则体系..."
                value={projectForm.worldView} onChange={(e) => set({ worldView: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">写作要求</Label>
              <Textarea className="text-sm h-24 resize-y" placeholder="风格要求、叙事视角、节奏偏好..."
                value={projectForm.writingReqs} onChange={(e) => set({ writingReqs: e.target.value })} />
            </div>
          </div>

          {/* 卷/Arc 管理 */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3" />卷/篇章
            </h3>
            {volumes.length > 0 && (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {volumes.map((v) => (
                  <div key={v.id} className="flex items-center gap-2 text-[11px] bg-muted/20 rounded px-2 py-1">
                    <span className={v.status === "writing" ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                      {v.title}
                    </span>
                    <span className="text-[9px] text-muted-foreground/50 ml-auto">{v.status}</span>
                    <button className="text-[9px] text-primary hover:underline shrink-0" onClick={async () => {
                      await fetch("/api/volumes", {
                        method: "PUT", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: v.id, status: v.status === "writing" ? "planned" : "writing" }),
                      });
                      setVolumes(prev => prev.map(v2 => v2.id === v.id ? { ...v2, status: v2.status === "writing" ? "planned" : "writing" } : v2));
                    }}>{v.status === "writing" ? "暂停" : "设为当前"}</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1">
              <Input className="text-[11px] h-7" placeholder="新卷名" value={newVolTitle}
                onChange={(e) => setNewVolTitle(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && newVolTitle.trim()) {
                    const res = await fetch(`/api/volumes?projectId=${projectId}`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ projectId, title: newVolTitle.trim(), order: volumes.length, status: volumes.length === 0 ? "writing" : "planned" }),
                    });
                    if (res.ok) {
                      const v = await res.json();
                      setVolumes(prev => [...prev, v]);
                      setNewVolTitle("");
                      toast.success("卷已创建");
                    }
                  }
                }} />
              <Button variant="outline" size="sm" className="h-7 text-xs shrink-0"
                onClick={async () => {
                  if (!newVolTitle.trim()) return;
                  const res = await fetch(`/api/volumes?projectId=${projectId}`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId, title: newVolTitle.trim(), order: volumes.length, status: volumes.length === 0 ? "writing" : "planned" }),
                  });
                  if (res.ok) {
                    const v = await res.json();
                    setVolumes(prev => [...prev, v]);
                    setNewVolTitle("");
                  }
                }}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Bible 生成 */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">小说 Bible</h3>
            <p className="text-xs text-muted-foreground">自动生成精简设定参考（≤800字），每次写作自动携带。</p>
            <Button variant="outline" size="sm" className="text-xs h-7 w-full" onClick={onGenerateBible} disabled={generatingBible}>
              {generatingBible ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <BookOpen className="w-3 h-3 mr-1" />}
              生成小说 Bible
            </Button>
          </div>

          {/* 导出 */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">导出</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs h-7 flex-1" onClick={() => onExport("md")}>
                <FileText className="w-3 h-3 mr-1" />Markdown
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 flex-1" onClick={() => onExport("txt")}>
                <Download className="w-3 h-3 mr-1" />TXT
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 flex-1" onClick={() => onExport("json")}>
                <Download className="w-3 h-3 mr-1" />JSON
              </Button>
            </div>
          </div>

          {/* Danger zone + Save */}
          <div className="border-t pt-4 flex justify-between">
            <Button variant="destructive" size="sm" className="text-xs h-7" onClick={onDelete}>
              <Trash2 className="w-3 h-3 mr-1" />删除作品
            </Button>
            <Button size="sm" className="text-xs h-7" onClick={onSave}>
              <Save className="w-3 h-3 mr-1" />保存设置
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground/25 pt-2">
            AI 模型配置请使用顶栏「AI 设置」
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
