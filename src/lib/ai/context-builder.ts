// Context Builder v4 — 智能调度器，按章节目标选择性组装上下文

import { estimateTokens, truncateByTokens } from "@/lib/token-count";

export interface BuildContextInput {
  bible: string;                          // compact 小说圣经
  arcPlan: { title: string; summary: string } | null;  // 当前卷
  taskCard: string | null;                // 章节任务卡 JSON
  outline: string;                        // 大纲
  description: string;                    // 作品简介
  worldView: string;                      // 世界观
  writingReqs: string;                    // 写作要求
  currentChapterContent: string;
  currentChapterTitle: string;
  chapters: { title: string; summary: string; stateJson: string; order: number }[];
  currentChapterId: string | null;
  foreshadowings: { title: string; description?: string; status?: string }[];
  characters: { name: string; identity?: string; personality?: string }[];
  worldItems: { title: string; content?: string }[];
  locations: { name: string; description?: string }[];
  userContext: string;
  maxTokens: number;
}

interface ChapterState {
  summary: string;
  new_facts?: string[];
  character_changes?: { name: string; change: string }[];
  foreshadowing_added?: string[];
  foreshadowing_resolved?: string[];
  threads_advanced?: string[];
  items_introduced?: string[];
  locations_visited?: string[];
}

function parseState(stateJson: string): ChapterState | null {
  if (!stateJson) return null;
  try { return JSON.parse(stateJson); } catch { return null; }
}

/** 智能上下文构建器 */
export function buildContextV4(input: BuildContextInput): string {
  const budget = Math.floor(input.maxTokens * 0.8);
  const parts: string[] = [];
  let usedEstimate = 0;

  function add(label: string, content: string, maxChars?: number) {
    const text = maxChars ? content.slice(0, maxChars) : content;
    if (!text.trim()) return;
    parts.push(label + "\n" + text);
    usedEstimate += estimateTokens(text);
  }

  // ── 1. 小说 Bible（固定必带，≤2000 chars） ──
  if (input.bible) {
    add("【小说 Bible】", input.bible, 2000);
  } else {
    // 自动用设定拼一个临时 Bible
    const tmp = [
      input.description && `简介：${input.description}`,
      input.worldView && `世界观：${input.worldView}`,
      input.writingReqs && `风格要求：${input.writingReqs}`,
    ].filter(Boolean).join("\n");
    add("【小说设定】", tmp, 1500);
  }

  // ── 2. 当前卷目标 / 大纲（有卷时大纲精简） ──
  if (input.arcPlan) {
    add(`【当前卷：${input.arcPlan.title}】`, input.arcPlan.summary, 800);
    if (input.outline) {
      add("【全书大纲（精简）】", input.outline, 500);
    }
  } else if (input.outline) {
    add("【全书大纲】", input.outline, 2000);
  }

  // ── 3. 章节任务卡（结构化约束，最高优先级） ──
  if (input.taskCard) {
    add("【章节任务卡 — 本次写作必须严格遵循】", input.taskCard, 3000);
  }

  // ── 4. 上一章结尾原文（语气连续性） ──
  if (input.currentChapterContent) {
    const tail = input.currentChapterContent.length > 2000
      ? "…" + input.currentChapterContent.slice(-2000)
      : input.currentChapterContent;
    add(`【上文结尾原文（接续语气和场景）】`, tail, 2000);
  }

  // ── 5. 出场人物状态（从 stateJson 历史聚合） ──
  const charLines: string[] = [];
  // 为每个角色聚合所有历史变化
  const charHistory: Record<string, string[]> = {};
  for (const ch of input.chapters) {
    const st = parseState(ch.stateJson);
    if (st?.character_changes) {
      for (const cc of st.character_changes) {
        if (!charHistory[cc.name]) charHistory[cc.name] = [];
        charHistory[cc.name].push(`[${ch.title}] ${cc.change}`);
      }
    }
  }
  for (const c of input.characters) {
    const name = c.name;
    const identity = c.identity ? `（${c.identity}）` : "";
    const personality = c.personality ? ` — ${c.personality}` : "";
    const history = charHistory[name];
    const recentChanges = history ? history.slice(-3).join("；") : "";
    const stateHint = recentChanges ? ` | 状态变化：${recentChanges}` : "";
    charLines.push(`${name}${identity}${personality}${stateHint}`);
  }
  // 补上只出现在 stateJson 但不在资产库中的角色
  for (const [name, history] of Object.entries(charHistory)) {
    if (!input.characters.find((c) => c.name === name)) {
      charLines.push(`${name} | 状态变化：${history.slice(-3).join("；")}`);
    }
  }
  if (charLines.length > 0) {
    add(`【人物状态（${charLines.length}人）】`, charLines.join("\n"), 2000);
  }

  // ── 6. 活跃伏笔（全部，因为都是相关的） ──
  const activeFores = input.foreshadowings.filter(
    (f) => f.status !== "resolved"
  );
  if (activeFores.length > 0) {
    const lines = activeFores.map((f) => {
      const tag = f.status === "resolving" ? "◐" : "○";
      return `${tag} ${f.title}${f.description ? `：${f.description}` : ""}`;
    });
    add(`【活跃伏笔（${lines.length}条）】`, lines.join("\n"), 2000);
  }

  // ── 7. 近期章节摘要（最近3章） ──
  const sorted = [...input.chapters].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const others = sorted.filter((c) => c.summary);
  if (others.length > 0) {
    const recent = others.slice(-3);
    const lines = recent.map((c) => `- ${c.title}：${c.summary}`);
    add("【近期章节摘要】", lines.join("\n"), 1500);
  }

  // ── 8. 相关历史事件（从 stateJson 提取） ──
  const eventLines: string[] = [];
  for (const ch of others.slice(0, -3)) {
    const st = parseState(ch.stateJson);
    if (st?.new_facts?.length) {
      for (const f of st.new_facts.slice(0, 2)) {
        if (eventLines.length < 15) eventLines.push(`[${ch.title}] ${f}`);
      }
    }
  }
  if (eventLines.length > 0) {
    add("【前文关键事实】", eventLines.join("\n"), 2000);
  }

  // ── 9. 世界资产 ──
  const assetLines: string[] = [];
  if (input.worldItems.length > 0) {
    assetLines.push("世界观：" + input.worldItems.map((w) => `${w.title}${w.content ? `（${w.content.slice(0, 100)}）` : ""}`).join("；"));
  }
  if (input.locations.length > 0) {
    assetLines.push("地点：" + input.locations.map((l) => `${l.name}${l.description ? `（${l.description.slice(0, 100)}）` : ""}`).join("；"));
  }
  if (assetLines.length > 0) {
    add("【世界资产】", assetLines.join("\n"), 1000);
  }

  // ── 10. 风格要求 ──
  if (input.writingReqs) {
    add("【风格要求】", input.writingReqs, 500);
  }

  // ── 11. 用户额外上下文 ──
  if (input.userContext) {
    add("【额外说明】", input.userContext, 1000);
  }

  const raw = parts.join("\n\n");
  return truncateByTokens(raw, budget);
}
