"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Trash2, Check, Users, Globe, MapPin,
  Building2, Package, Eye, Clock, Sparkles, Loader2, Search, X,
} from "lucide-react";
import { toast } from "sonner";

type AssetType = "character" | "world" | "location" | "organization" | "item" | "fore" | "timeline";
type AssetEntry = Record<string, string>;

const ICONS: Record<AssetType, typeof Users> = {
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

interface Field { key: string; label: string; type?: "text" | "textarea"; placeholder?: string; }

const FIELDS: Record<AssetType, Field[]> = {
  character: [
    { key: "name", label: "姓名" }, { key: "identity", label: "身份" },
    { key: "personality", label: "性格" }, { key: "goals", label: "目标", type: "textarea" },
    { key: "relationships", label: "关系", type: "textarea" }, { key: "quirks", label: "特征/口癖" },
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

interface Props {
  open: boolean;
  activeType: AssetType;
  onOpenChange: (open: boolean) => void;
  onTypeChange: (type: AssetType) => void;
  items: AssetEntry[];
  allItems: Record<AssetType, AssetEntry[]>;
  chapters: { id: string; title: string }[];
  organizations: AssetEntry[];
  characters: AssetEntry[];
  onAdd: (type: AssetType) => void;
  onSave: (type: AssetType, id: string, data: Record<string, unknown>) => void;
  onDelete: (type: AssetType, id: string) => void;
  onGenerateAssetCard?: (chapterIds: string[], assetTypes: string[]) => void;
  generatingAssets?: boolean;
}

export function AssetSheet({
  open, activeType, onOpenChange, onTypeChange,
  items, allItems, chapters, organizations, characters,
  onAdd, onSave, onDelete,
  onGenerateAssetCard, generatingAssets,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssetEntry>({});
  const [search, setSearch] = useState("");
  const [showAIGen, setShowAIGen] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);

  const Icon = ICONS[activeType];
  const nameKey = NAME_KEYS[activeType];
  const fields = FIELDS[activeType];

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => Object.values(item).some((v) => String(v).toLowerCase().includes(q)));
  }, [items, search]);

  const startEdit = (item: AssetEntry) => {
    setEditingId(item.id);
    const init: AssetEntry = {};
    fields.forEach((f) => { init[f.key] = item[f.key] || ""; });
    const customs: { key: string; value: string }[] = [];
    for (const [k, v] of Object.entries(item)) {
      if (!fields.find((f) => f.key === k) && k !== "id" && k !== "projectId" && k !== "order" && k !== "createdAt" && k !== "updatedAt") {
        customs.push({ key: k, value: v as string });
      }
    }
    setCustomFields(customs);
    setForm(init);
  };

  const closeEdit = () => { setEditingId(null); setCustomFields([]); };

  const handleSave = async () => {
    if (!editingId) return;
    const data: Record<string, unknown> = { ...form };
    for (const cf of customFields) {
      if (cf.key.trim()) data[cf.key.trim()] = cf.value;
    }
    await onSave(activeType, editingId, data);
    closeEdit();
    toast.success("已保存");
  };

  const addCustomField = () => setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  const removeCustomField = (idx: number) => setCustomFields((prev) => prev.filter((_, i) => i !== idx));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-full w-[98vw] h-[98vh] p-0 flex flex-col gap-0 rounded-xl">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base flex items-center gap-2">
              <Icon className="w-5 h-5" /> 资产管理
            </DialogTitle>
            {onGenerateAssetCard && (
              <Button variant="ghost" size="sm" className="text-sm h-8" onClick={() => setShowAIGen(!showAIGen)}>
                <Sparkles className="w-4 h-4 mr-1.5" />
                {showAIGen ? "收起" : "AI 提取资产"}
              </Button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap pt-2">
            {(Object.keys(LABELS) as AssetType[]).map((t) => {
              const TIcon = ICONS[t];
              const count = (allItems[t] || items).length;
              return (
                <button
                  key={t}
                  onClick={() => { onTypeChange(t); closeEdit(); setSearch(""); }}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeType === t ? "bg-primary/10 text-primary font-medium ring-1 ring-primary/20" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <TIcon className="w-4 h-4" /> {LABELS[t]}
                  <span className="text-xs opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {showAIGen && onGenerateAssetCard && (
          <div className="px-6 py-3 border-b bg-muted/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">选择章节，AI 将提取角色/世界观/地点等资产：</p>
              <button className="text-sm text-primary hover:underline"
                onClick={() => {
                  const all = chapters.map((c) => c.id);
                  setSelectedChapters(selectedChapters.size === all.length ? new Set() : new Set(all));
                }}>
                {selectedChapters.size === chapters.length ? "取消全选" : `全选 (${selectedChapters.size}/${chapters.length})`}
              </button>
            </div>
            <div className="flex gap-3">
              <ScrollArea className="h-36 flex-1 border rounded-lg bg-background p-2">
                {chapters.map((ch) => (
                  <label key={ch.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/30 rounded px-2 py-1">
                    <input type="checkbox" className="w-4 h-4" checked={selectedChapters.has(ch.id)}
                      onChange={(e) => {
                        const next = new Set(selectedChapters);
                        e.target.checked ? next.add(ch.id) : next.delete(ch.id);
                        setSelectedChapters(next);
                      }} />
                    {ch.title || "未命名"}
                  </label>
                ))}
              </ScrollArea>
              <Button size="sm" className="text-sm h-auto px-4 shrink-0" disabled={selectedChapters.size === 0 || generatingAssets}
                onClick={() => onGenerateAssetCard(Array.from(selectedChapters), ["character", "world", "location", "item", "fore"])}>
                {generatingAssets ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                {generatingAssets ? "生成中..." : "开始提取"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: list */}
          <div className="w-64 border-r flex flex-col shrink-0 bg-muted/10">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input className="h-9 text-sm pl-9" placeholder={`搜索${LABELS[activeType]}...`}
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {filtered.map((item) => (
                  <button key={item.id}
                    onClick={() => startEdit(item)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                      editingId === item.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                    }`}
                  >
                    {item[nameKey] || "未命名"}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground/40 text-center py-8">
                    {search ? "无匹配结果" : `暂无${LABELS[activeType]}`}
                  </p>
                )}
              </div>
            </ScrollArea>
            <div className="p-3 border-t">
              <Button variant="outline" size="sm" className="w-full text-sm h-9" onClick={() => onAdd(activeType)}>
                <Plus className="w-4 h-4 mr-1.5" />新建{LABELS[activeType]}
              </Button>
            </div>
          </div>

          {/* CENTER: card grid */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b text-sm text-muted-foreground font-medium shrink-0">
              {search ? `搜索 "${search}" — ${filtered.length} 条` : `${LABELS[activeType]} · ${items.length} 项`}
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 grid grid-cols-2 xl:grid-cols-3 gap-3">
                {filtered.map((item) => (
                  <button key={item.id}
                    onClick={() => startEdit(item)}
                    className={`text-left p-4 rounded-xl border transition-colors ${
                      editingId === item.id ? "border-primary/40 bg-primary/5 ring-2 ring-primary/10" : "hover:bg-muted/30 hover:border-border"
                    }`}
                  >
                    <div className="text-sm font-semibold truncate">{item[nameKey] || "未命名"}</div>
                    <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description || item.content || item.backstory || item.identity || item.type || "点击编辑"}
                    </div>
                    {activeType === "character" && item.personality && (
                      <div className="text-xs text-muted-foreground/70 mt-1.5">{item.personality}</div>
                    )}
                    {activeType === "fore" && item.status && (
                      <div className="text-xs mt-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                          item.status === "resolved" ? "bg-emerald-500/10 text-emerald-600" :
                          item.status === "resolving" ? "bg-amber-500/10 text-amber-600" :
                          "bg-blue-500/10 text-blue-600"
                        }`}>{item.status}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT: editor */}
          <div className={`border-l flex flex-col shrink-0 transition-all ${editingId ? "w-96" : "w-0 border-l-0 overflow-hidden"}`}>
            {editingId && (
              <>
                <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
                  <span className="text-sm font-medium">编辑{LABELS[activeType]}</span>
                  <button onClick={closeEdit} className="text-muted-foreground hover:text-foreground p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {fields.map((f) => {
                      if (activeType === "fore" && (f.key === "plantChapterId" || f.key === "resolveChapterId")) {
                        return (
                          <div key={f.key} className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">{f.label}</Label>
                            <Select value={form[f.key] || ""} onValueChange={(v) => setForm({ ...form, [f.key]: v || "" })}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="选择章节..." /></SelectTrigger>
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
                          <div key={f.key} className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">{f.label}</Label>
                            <Select value={form[f.key] || ""} onValueChange={(v) => setForm({ ...form, [f.key]: v || "" })}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="选择角色..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">无</SelectItem>
                                {characters.map((c) => <SelectItem key={c.id} value={c.name || ""}>{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }
                      if (activeType === "location" && f.key === "faction") {
                        return (
                          <div key={f.key} className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">{f.label}</Label>
                            <Select value={form[f.key] || ""} onValueChange={(v) => setForm({ ...form, [f.key]: v || "" })}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="选择组织..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">无</SelectItem>
                                {organizations.map((o) => <SelectItem key={o.id} value={o.name || ""}>{o.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }
                      return f.type === "textarea" ? (
                        <div key={f.key} className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{f.label}</Label>
                          <Textarea className="text-sm h-20 resize-y" value={form[f.key] || ""}
                            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                        </div>
                      ) : (
                        <div key={f.key} className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{f.label}</Label>
                          <Input className="text-sm h-9" value={form[f.key] || ""}
                            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                        </div>
                      );
                    })}

                    {/* 自定义字段 */}
                    {customFields.map((cf, idx) => (
                      <div key={idx} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1.5">
                          <Input className="text-sm h-9" placeholder="字段名" value={cf.key}
                            onChange={(e) => {
                              const next = [...customFields];
                              next[idx] = { ...next[idx], key: e.target.value };
                              setCustomFields(next);
                            }} />
                        </div>
                        <div className="flex-[2] space-y-1.5">
                          <Input className="text-sm h-9" placeholder="值" value={cf.value}
                            onChange={(e) => {
                              const next = [...customFields];
                              next[idx] = { ...next[idx], value: e.target.value };
                              setCustomFields(next);
                            }} />
                        </div>
                        <button onClick={() => removeCustomField(idx)} className="text-muted-foreground/40 hover:text-destructive shrink-0 pb-2">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={addCustomField} className="text-sm text-primary hover:underline w-full text-left">
                      + 添加自定义字段
                    </button>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" className="text-sm h-9 flex-1" onClick={handleSave}>
                        <Check className="w-4 h-4 mr-1.5" />保存
                      </Button>
                      <Button size="sm" variant="destructive" className="text-sm h-9" onClick={() => {
                        const item = items.find((i) => i.id === editingId);
                        if (item && confirm(`删除 ${item[nameKey] || "此资产"}？`)) {
                          onDelete(activeType, editingId);
                          closeEdit();
                        }
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </div>

        <div className="px-4 py-2.5 border-t text-center text-xs text-muted-foreground/40 shrink-0">
          管理小说世界观资产 · 支持自定义字段扩展
        </div>
      </DialogContent>
    </Dialog>
  );
}
