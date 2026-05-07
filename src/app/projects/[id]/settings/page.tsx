"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Save, Key, Trash2, Download, FileText, Wifi, Loader2,
  Users, Globe, Eye, Plus, Pencil, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Gemini" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "ollama", label: "Ollama (本地)" },
];

interface CharData { id: string; name: string; identity: string; personality: string; goals: string; appearance: string; backstory: string; relationships: string; quirks: string; }
interface WorldData { id: string; title: string; content: string; type: string; }
interface ForeData { id: string; title: string; description: string; chapterHint: string; resolved: boolean; }

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [form, setForm] = useState({
    title: "", type: "novel", genre: "", style: "", targetWords: 0,
    description: "", worldView: "", writingReqs: "", status: "draft",
  });
  const [aiSettings, setAiSettings] = useState({
    provider: "openai", model: "gpt-4o", baseUrl: "", apiKey: "",
    temperature: 0.7, maxTokens: 4096,
  });
  const [testing, setTesting] = useState(false);

  // Assets
  const [characters, setCharacters] = useState<CharData[]>([]);
  const [worldItems, setWorldItems] = useState<WorldData[]>([]);
  const [foreshadowings, setForeshadowings] = useState<ForeData[]>([]);
  const [editingChar, setEditingChar] = useState<string | null>(null);
  const [editingWorld, setEditingWorld] = useState<string | null>(null);
  const [editingFore, setEditingFore] = useState<string | null>(null);
  const [charForm, setCharForm] = useState<Record<string, string>>({});
  const [worldForm, setWorldForm] = useState<Record<string, string>>({});
  const [foreForm, setForeForm] = useState<Record<string, string>>({});

  const loadData = () => {
    fetch(`/api/projects?id=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data) return;
        setForm({
          title: data.title || "", type: data.type || "novel", genre: data.genre || "",
          style: data.style || "", targetWords: data.targetWords || 0,
          description: data.description || "", worldView: data.worldView || "",
          writingReqs: data.writingReqs || "", status: data.status || "draft",
        });
        if (data.aiSettings) {
          setAiSettings({
            provider: data.aiSettings.provider || "openai",
            model: data.aiSettings.model || "gpt-4o",
            baseUrl: data.aiSettings.baseUrl || "",
            apiKey: data.aiSettings.apiKey || "",
            temperature: data.aiSettings.temperature || 0.7,
            maxTokens: data.aiSettings.maxTokens || 4096,
          });
        }
      });
  };

  useEffect(() => { loadData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadAssets = () => {
    fetch(`/api/characters?projectId=${projectId}`).then(r => r.json()).then(setCharacters);
    fetch(`/api/world-building?projectId=${projectId}`).then(r => r.json()).then(setWorldItems);
    fetch(`/api/foreshadowings?projectId=${projectId}`).then(r => r.json()).then(setForeshadowings);
  };
  useEffect(() => { loadAssets(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleSave = async () => {
    try {
      await fetch(`/api/projects?id=${projectId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      await fetch("/api/ai/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...aiSettings }),
      });
      toast.success("设置已保存");
    } catch { toast.error("保存失败"); }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiSettings),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`连接成功 — ${result.model || "OK"}`);
      } else {
        toast.error(`连接失败: ${result.message}`);
      }
    } catch { toast.error("测试请求失败"); }
    finally { setTesting(false); }
  };

  const handleExport = async (format: string) => {
    try {
      const res = await fetch(`/api/export?projectId=${projectId}&format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${form.title || "export"}.${format}`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(`已导出 ${format.toUpperCase()} 文件`);
    } catch { toast.error("导出失败"); }
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除此作品吗？此操作不可恢复。")) return;
    await fetch(`/api/projects?id=${projectId}`, { method: "DELETE" });
    toast.success("作品已删除"); router.push("/projects");
  };

  // Asset CRUD helpers
  const addAsset = async (type: string) => {
    const endpoints: Record<string, string> = {
      character: "/api/characters",
      world: "/api/world-building",
      fore: "/api/foreshadowings",
    };
    const defaults: Record<string, Record<string, string>> = {
      character: { name: "新角色" },
      world: { title: "新条目" },
      fore: { title: "新伏笔" },
    };
    const res = await fetch(endpoints[type], {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, ...defaults[type] }),
    });
    if (res.ok) { loadAssets(); toast.success("已添加"); }
  };

  const saveAsset = async (type: string, id: string, data: Record<string, unknown>) => {
    const endpoints: Record<string, string> = {
      character: "/api/characters",
      world: "/api/world-building",
      fore: "/api/foreshadowings",
    };
    await fetch(`${endpoints[type]}?id=${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  const deleteAsset = async (type: string, id: string) => {
    const endpoints: Record<string, string> = {
      character: "/api/characters",
      world: "/api/world-building",
      fore: "/api/foreshadowings",
    };
    await fetch(`${endpoints[type]}?id=${id}`, { method: "DELETE" });
    loadAssets();
    toast.success("已删除");
  };

  const providerDefaultModels: Record<string, string> = {
    openai: "gpt-4o", anthropic: "claude-sonnet-4-6", gemini: "gemini-2.0-flash",
    deepseek: "deepseek-chat", openrouter: "anthropic/claude-sonnet-4-6", ollama: "llama3",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-12 border-b flex items-center px-3 gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium text-sm">作品设置</span>
        <div className="flex-1" />
        <ThemeToggle />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>作品标题</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>类型</Label>
                <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>风格</Label>
              <Input value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>目标字数</Label>
              <Input type="number" value={form.targetWords}
                onChange={(e) => setForm({ ...form, targetWords: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>简介</Label>
              <Textarea className="h-20" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>世界观设定</Label>
              <Textarea className="h-20" value={form.worldView}
                onChange={(e) => setForm({ ...form, worldView: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>写作要求</Label>
              <Textarea className="h-20" value={form.writingReqs}
                onChange={(e) => setForm({ ...form, writingReqs: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="w-4 h-4" /> AI 模型配置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={aiSettings.provider} onValueChange={(v) => {
                if (!v) return;
                setAiSettings({ ...aiSettings, provider: v, model: providerDefaultModels[v] || "gpt-4o" });
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>模型名称</Label>
              <Input value={aiSettings.model}
                onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })} />
            </div>
            {aiSettings.provider !== "ollama" && (
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" placeholder="留空则使用环境变量" value={aiSettings.apiKey}
                  onChange={(e) => setAiSettings({ ...aiSettings, apiKey: e.target.value })} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Base URL（可选）</Label>
              <Input placeholder="留空使用默认" value={aiSettings.baseUrl}
                onChange={(e) => setAiSettings({ ...aiSettings, baseUrl: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Temperature ({aiSettings.temperature})</Label>
                <Input type="number" min={0} max={2} step={0.1} value={aiSettings.temperature}
                  onChange={(e) => setAiSettings({ ...aiSettings, temperature: parseFloat(e.target.value) || 0.7 })} />
              </div>
              <div className="space-y-2">
                <Label>Max Tokens</Label>
                <Input type="number" value={aiSettings.maxTokens}
                  onChange={(e) => setAiSettings({ ...aiSettings, maxTokens: parseInt(e.target.value) || 4096 })} />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testing}>
              {testing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Wifi className="w-3.5 h-3.5 mr-1" />}
              测试连接
            </Button>
          </CardContent>
        </Card>

        {/* Asset: Characters */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" /> 角色管理 ({characters.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => addAsset("character")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> 添加
            </Button>
          </CardHeader>
          <CardContent>
            {characters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">暂无角色，点击添加</p>
            ) : (
              <div className="space-y-2">
                {characters.map((char) => {
                  const isEditing = editingChar === char.id;
                  return (
                    <div key={char.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        {isEditing ? (
                          <Input className="text-sm h-7 w-40" value={charForm.name || ""}
                            placeholder="角色名"
                            onChange={(e) => setCharForm({ ...charForm, name: e.target.value })} />
                        ) : (
                          <span className="font-medium text-sm">{char.name || "未命名"}</span>
                        )}
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={async () => {
                                  await saveAsset("character", char.id, charForm);
                                  setEditingChar(null); loadAssets(); toast.success("已保存");
                                }}>
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => setEditingChar(null)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => {
                                  setEditingChar(char.id);
                                  setCharForm({
                                    name: char.name || "",
                                    identity: char.identity || "",
                                    personality: char.personality || "",
                                    goals: char.goals || "",
                                    appearance: char.appearance || "",
                                    backstory: char.backstory || "",
                                  });
                                }}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                                onClick={() => deleteAsset("character", char.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Input className="text-xs h-7" placeholder="身份" value={charForm.identity || ""}
                              onChange={(e) => setCharForm({ ...charForm, identity: e.target.value })} />
                            <Input className="text-xs h-7" placeholder="性格" value={charForm.personality || ""}
                              onChange={(e) => setCharForm({ ...charForm, personality: e.target.value })} />
                          </div>
                          <Input className="text-xs h-7" placeholder="目标" value={charForm.goals || ""}
                            onChange={(e) => setCharForm({ ...charForm, goals: e.target.value })} />
                          <Input className="text-xs h-7" placeholder="外貌" value={charForm.appearance || ""}
                            onChange={(e) => setCharForm({ ...charForm, appearance: e.target.value })} />
                          <Textarea className="text-xs h-16" placeholder="背景故事"
                            value={charForm.backstory || ""}
                            onChange={(e) => setCharForm({ ...charForm, backstory: e.target.value })} />
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {char.identity && <p>身份: {char.identity}</p>}
                          {char.personality && <p>性格: {char.personality}</p>}
                          {char.backstory && <p className="line-clamp-2">{char.backstory}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asset: World Building */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" /> 世界观设定 ({worldItems.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => addAsset("world")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> 添加
            </Button>
          </CardHeader>
          <CardContent>
            {worldItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">暂无条目</p>
            ) : (
              <div className="space-y-2">
                {worldItems.map((item) => {
                  const isEditing = editingWorld === item.id;
                  return (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        {isEditing ? (
                          <Input className="text-sm h-7 w-40" value={worldForm.title || ""}
                            onChange={(e) => setWorldForm({ ...worldForm, title: e.target.value })} />
                        ) : (
                          <span className="font-medium text-sm">{item.title || "未命名"}</span>
                        )}
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={async () => {
                                  await saveAsset("world", item.id, worldForm);
                                  setEditingWorld(null); loadAssets(); toast.success("已保存");
                                }}>
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => setEditingWorld(null)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => {
                                  setEditingWorld(item.id);
                                  setWorldForm({
                                    title: item.title || "",
                                    type: item.type || "general",
                                    content: item.content || "",
                                  });
                                }}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                                onClick={() => deleteAsset("world", item.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input className="text-xs h-7" placeholder="类型 (如: 魔法体系, 社会结构)" value={worldForm.type || ""}
                            onChange={(e) => setWorldForm({ ...worldForm, type: e.target.value })} />
                          <Textarea className="text-xs h-16" placeholder="内容描述"
                            value={worldForm.content || ""}
                            onChange={(e) => setWorldForm({ ...worldForm, content: e.target.value })} />
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {item.type && <span className="bg-muted px-1 rounded mr-1">{item.type}</span>}
                          {item.content && <p className="line-clamp-2 mt-1">{item.content}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asset: Foreshadowing */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" /> 伏笔管理 ({foreshadowings.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => addAsset("fore")}>
              <Plus className="w-3.5 h-3.5 mr-1" /> 添加
            </Button>
          </CardHeader>
          <CardContent>
            {foreshadowings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">暂无伏笔</p>
            ) : (
              <div className="space-y-2">
                {foreshadowings.map((item) => {
                  const isEditing = editingFore === item.id;
                  return (
                    <div key={item.id} className={`border rounded-lg p-3 ${item.resolved ? "opacity-50" : ""}`}>
                      <div className="flex items-center justify-between mb-1">
                        {isEditing ? (
                          <Input className="text-sm h-7 w-40" value={foreForm.title || ""}
                            onChange={(e) => setForeForm({ ...foreForm, title: e.target.value })} />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{item.title || "未命名"}</span>
                            {item.resolved && <span className="text-xs bg-green-100 text-green-700 px-1 rounded">已回收</span>}
                          </div>
                        )}
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={async () => {
                                  await saveAsset("fore", item.id, foreForm);
                                  setEditingFore(null); loadAssets(); toast.success("已保存");
                                }}>
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => setEditingFore(null)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => {
                                  setEditingFore(item.id);
                                  setForeForm({
                                    title: item.title || "",
                                    description: item.description || "",
                                    chapterHint: item.chapterHint || "",
                                    resolved: item.resolved ? "true" : "false",
                                  });
                                }}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                                onClick={() => deleteAsset("fore", item.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea className="text-xs h-12" placeholder="伏笔描述"
                            value={foreForm.description || ""}
                            onChange={(e) => setForeForm({ ...foreForm, description: e.target.value })} />
                          <div className="flex items-center gap-2">
                            <Input className="text-xs h-7 flex-1" placeholder="关联章节提示"
                              value={foreForm.chapterHint || ""}
                              onChange={(e) => setForeForm({ ...foreForm, chapterHint: e.target.value })} />
                            <Label className="text-xs flex items-center gap-1">
                              <input type="checkbox" checked={foreForm.resolved === "true"}
                                onChange={(e) => setForeForm({ ...foreForm, resolved: e.target.checked ? "true" : "false" })} />
                              已回收
                            </Label>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {item.description && <p className="line-clamp-2">{item.description}</p>}
                          {item.chapterHint && <p className="mt-0.5">📍 {item.chapterHint}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport("md")}>
              <FileText className="w-3.5 h-3.5 mr-1" /> 导出 MD
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("txt")}>
              <Download className="w-3.5 h-3.5 mr-1" /> 导出 TXT
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
              <Download className="w-3.5 h-3.5 mr-1" /> 备份 JSON
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> 删除
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-3.5 h-3.5 mr-1" /> 保存
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
