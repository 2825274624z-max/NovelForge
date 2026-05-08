"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus, Pencil, Trash2, Check, Users, Globe, MapPin,
  Building2, Package, Eye, Clock, FileText,
} from "lucide-react";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

type AssetType = "character" | "world" | "location" | "organization" | "item" | "fore" | "timeline";
type AssetEntry = Record<string, string>;

const ICONS: Record<AssetType, typeof FileText> = {
  character: Users, world: Globe, location: MapPin,
  organization: Building2, item: Package, fore: Eye, timeline: Clock,
};

const LABELS: Record<AssetType, string> = {
  character: "角色卡", world: "世界观", location: "地点",
  organization: "组织", item: "物品/能力", fore: "伏笔", timeline: "时间线",
};

const NAME_KEYS: Record<AssetType, string> = {
  character: "name", world: "title", location: "name",
  organization: "name", item: "name", fore: "title", timeline: "title",
};

interface Field {
  key: string; label: string; type?: "text" | "textarea"; placeholder?: string;
}

const FIELDS: Record<AssetType, Field[]> = {
  character: [
    { key: "name", label: "姓名" }, { key: "identity", label: "身份" },
    { key: "personality", label: "性格" }, { key: "goals", label: "目标", type: "textarea" },
    { key: "relationships", label: "关系", type: "textarea" }, { key: "quirks", label: "口癖" },
    { key: "appearance", label: "外貌" }, { key: "characterArc", label: "人物弧光", type: "textarea" },
    { key: "backstory", label: "背景故事", type: "textarea" },
  ],
  world: [
    { key: "title", label: "标题" }, { key: "type", label: "类型", placeholder: "规则/历史/势力/限制" },
    { key: "rules", label: "规则", type: "textarea" }, { key: "history", label: "历史", type: "textarea" },
    { key: "factions", label: "势力", type: "textarea" }, { key: "limitations", label: "限制", type: "textarea" },
    { key: "content", label: "详细描述", type: "textarea" },
  ],
  location: [
    { key: "name", label: "名称" }, { key: "type", label: "类型" },
    { key: "description", label: "描述", type: "textarea" },
    { key: "importantEvents", label: "重要事件", type: "textarea" },
  ],
  organization: [
    { key: "name", label: "名称" }, { key: "type", label: "类型" },
    { key: "goals", label: "目标", type: "textarea" }, { key: "members", label: "成员", type: "textarea" },
    { key: "resources", label: "资源", type: "textarea" }, { key: "rivalries", label: "敌对关系", type: "textarea" },
    { key: "description", label: "描述", type: "textarea" },
  ],
  item: [
    { key: "name", label: "名称" }, { key: "type", label: "类型" },
    { key: "effect", label: "效果", type: "textarea" }, { key: "limitations", label: "限制", type: "textarea" },
    { key: "sideEffects", label: "副作用", type: "textarea" }, { key: "source", label: "来源", type: "textarea" },
    { key: "description", label: "描述", type: "textarea" },
  ],
  fore: [
    { key: "title", label: "标题" }, { key: "description", label: "说明", type: "textarea" },
    { key: "status", label: "状态", placeholder: "planted / hinted / resolving / resolved" },
    { key: "chapterHint", label: "章节提示" },
  ],
  timeline: [
    { key: "title", label: "事件" }, { key: "timePos", label: "时间顺序" },
    { key: "content", label: "详细描述", type: "textarea" },
  ],
};

const PREVIEW_KEYS: Record<AssetType, string[]> = {
  character: ["identity", "personality", "goals", "backstory"],
  world: ["type", "content", "rules"],
  location: ["type", "description"],
  organization: ["type", "goals", "description"],
  item: ["type", "effect", "description"],
  fore: ["status", "description", "chapterHint"],
  timeline: ["timePos", "content", "relatedCharacters"],
};

interface Props {
  open: boolean;
  activeType: AssetType;
  onOpenChange: (open: boolean) => void;
  onTypeChange: (type: AssetType) => void;
  items: AssetEntry[];
  chapters: { id: string; title: string }[];
  organizations: AssetEntry[];
  characters: AssetEntry[];
  onAdd: (type: AssetType) => void;
  onSave: (type: AssetType, id: string, data: Record<string, unknown>) => void;
  onDelete: (type: AssetType, id: string) => void;
}

export function AssetSheet({
  open, activeType, onOpenChange, onTypeChange,
  items, chapters, organizations, characters,
  onAdd, onSave, onDelete,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetEntry>({});
  const Icon = ICONS[activeType];
  const nameKey = NAME_KEYS[activeType];
  const fields = FIELDS[activeType];

  const startEdit = (item: AssetEntry) => {
    setEditingId(item.id);
    const init: AssetEntry = {};
    fields.forEach((f) => { init[f.key] = item[f.key] || ""; });
    setForm(init);
  };

  const handleSave = async () => {
    if (!editingId) return;
    await onSave(activeType, editingId, form);
    setEditingId(null);
    toast.success("已保存");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[calc(100vw-2rem)] sm:w-[380px] md:w-[420px] p-0 flex flex-col max-w-full">
        <SheetHeader className="p-4 pb-2 border-b">
          <SheetTitle className="text-sm flex items-center gap-2">
            <Icon className="w-4 h-4" /> {LABELS[activeType]}
            <span className="text-muted-foreground font-normal">({items.length})</span>
          </SheetTitle>
          {/* Type tabs */}
          <div className="flex gap-1 flex-wrap pt-1">
            {(Object.keys(LABELS) as AssetType[]).map((t) => {
              const TIcon = ICONS[t];
              return (
                <button
                  key={t}
                  onClick={() => { onTypeChange(t); setEditingId(null); }}
                  className={`text-[11px] px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                    activeType === t
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <TIcon className="w-3 h-3" /> {LABELS[t]}
                </button>
              );
            })}
          </div>
        </SheetHeader>

        {/* Add button */}
        <div className="px-4 py-2 border-b">
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onAdd(activeType)}>
            <Plus className="w-3 h-3 mr-1" />新建{LABELS[activeType]}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {items.map((item) => {
              const isEdit = editingId === item.id;
              return (
                <div
                  key={item.id}
                  className={`border rounded-lg transition-colors ${
                    isEdit ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/30"
                  }`}
                >
                  {isEdit ? (
                    <div className="p-3 space-y-2.5">
                      {fields.map((f) => {
                        // Special handling for asset linking fields
                        if (activeType === "location" && f.key === "faction") {
                          return (
                            <div key={f.key} className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                              <Select value={form[f.key] || ""} onValueChange={(v) => setForm({ ...form, [f.key]: v || "" })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择组织..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">无</SelectItem>
                                  {organizations.map((o) => <SelectItem key={o.id} value={o.name || ""}>{o.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }
                        if (activeType === "fore" && (f.key === "plantChapterId" || f.key === "resolveChapterId")) {
                          return (
                            <div key={f.key} className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                              <Select value={form[f.key] || ""} onValueChange={(v) => setForm({ ...form, [f.key]: v || "" })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择章节..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">无</SelectItem>
                                  {chapters.map((ch) => <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }
                        if (activeType === "timeline" && f.key === "relatedCharacters") {
                          return (
                            <div key={f.key} className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                              <Select value={form[f.key] || ""} onValueChange={(v) => setForm({ ...form, [f.key]: v || "" })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择角色..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">无</SelectItem>
                                  {characters.map((c) => <SelectItem key={c.id} value={c.name || ""}>{c.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }
                        if (activeType === "timeline" && f.key === "relatedChapters") {
                          return (
                            <div key={f.key} className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                              <Select value={form[f.key] || ""} onValueChange={(v) => setForm({ ...form, [f.key]: v || "" })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择章节..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">无</SelectItem>
                                  {chapters.map((ch) => <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        }
                        return f.type === "textarea" ? (
                          <div key={f.key} className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                            <Textarea className="text-xs h-16" placeholder={f.placeholder || f.label}
                              value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                          </div>
                        ) : (
                          <div key={f.key} className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                            <Input className="text-xs h-8" placeholder={f.placeholder || f.label}
                              value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                          </div>
                        );
                      })}
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" className="text-xs h-8 flex-1" onClick={handleSave}>
                          <Check className="w-3 h-3 mr-1" />保存
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setEditingId(null)}>
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="p-3 flex items-start gap-3 cursor-pointer group"
                      onClick={() => startEdit(item)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium">{item[nameKey] || "未命名"}</div>
                        <div className="text-[11px] text-muted-foreground space-y-0.5 mt-0.5">
                          {PREVIEW_KEYS[activeType].map((k) =>
                            item[k] ? <p key={k} className={k === "content" || k === "description" || k === "backstory" ? "line-clamp-1" : ""}>{item[k]}</p> : null
                          )}
                          {PREVIEW_KEYS[activeType].every((k) => !item[k]) && <span className="opacity-40">点击编辑</span>}
                        </div>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <TooltipProvider delay={400}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); startEdit(item); }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>编辑</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); onDelete(activeType, item.id); }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>删除</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {items.length === 0 && (
              <div className="text-center py-16">
                <Icon className="w-8 h-8 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-[13px] text-muted-foreground">暂无{LABELS[activeType]}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">点击上方按钮创建</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
