// TXT 小说解析器 v2 — 逐行状态机扫描，稳健识别标题/元信息/章节边界

export interface ParsedNovel {
  title: string;
  author?: string;
  description: string;
  chapters: { title: string; content: string }[];
}

// ─── 数字模式 ───
const CN_NUM = "[零一二三四五六七八九十百千]+";
const DIGIT = "\\d+";
const NUM = `(?:${CN_NUM}|${DIGIT})`;

// ─── 章节标题正则工厂（运行时构造，避免模板字符串与正则语法冲突） ───
function buildChapterPatterns(): RegExp[] {
  return [
    // 标准中文：第X章 / 第X节（含全角括号 ［ ）
    new RegExp(`^[\\t　\\s［\\[]*\\s*第\\s*${NUM}\\s*[章節节]\\s*[：:　\\s]*(.*)`, "u"),
    // 第X卷 第Y章（组合形式）
    new RegExp(`^[\\t　\\s]*第\\s*${NUM}\\s*卷\\s*.*第\\s*${NUM}\\s*[章節节].*`, "u"),
    // Chapter / Ch. 英文格式
    new RegExp(`^[\\t　\\s]*(?:Chapter|CH)\\s*${DIGIT}\\s*[：:　\\s]*(.*)`, "i"),
    new RegExp(`^[\\t　\\s]*Ch\\.?\\s*${DIGIT}\\s*[：:　\\s]*(.*)`, "i"),
    // Part X
    new RegExp(`^[\\t　\\s]*Part\\s*${DIGIT}\\s*[：:　\\s]*(.*)`, "i"),
    // 序章 / 楔子 / 引子 / 开篇
    /^[\t　\s]*(?:序[章言篇]|楔[子子]|引[子言章]|开[篇场端头])[：:　\s]*(.*)/u,
    // 尾声 / 结局 / 终章 / 后记 / 附录
    /^[\t　\s]*(?:尾[声章篇]|结[局束篇]|终[章章篇]|后[记记]|附[录录])[：:　\s]*(.*)/u,
    // 番外 / 外传 / 前传
    new RegExp(`^[\\t　\\s]*(?:番外|外传|前传|别传|后传)\\s*${NUM}?\\s*[：:　\\s]*(.*)`, "u"),
    // 全角方括号形式 ［第一章］
    new RegExp(`^[\\t　\\s]*［\\s*第\\s*${NUM}\\s*[章節节]\\s*[：:　\\s]*(.*)`, "u"),
    // 纯数字标题：1. / 1、/ 01 （弱匹配，避免误触发）
    /^[\t　\s]*\d{1,3}[\.、．]\s*(\S.*)/,
  ];
}

const CHAPTER_RES = buildChapterPatterns();

// ─── 元信息行正则 ───
const META_TITLE_RE = /^[　\s]*(?:书名|作品名|标题)[：:]\s*(.{1,80})/u;
const META_AUTHOR_RE = /^[　\s]*(?:作者|著者|笔者|writer|author)[：:]\s*(.{1,40})/ui;
const META_DESC_LABEL = /^(?:简介|文案|内容简介|内容介绍|作品简介)[：:]/u;

// ─── 噪声行过滤 ───
const NOISE_RES = [
  /^[　\s]*$/,
  /^[－—\-=*#～~]{3,}$/,
  /^(?:本站|本文|本章|更新|首发|转载|版权|声明|推广|广告|请勿|禁止|注意|提示|PS[：:])/,
  /(?:txt|TXT|小说|下载|阅读|网站|www\.|http[s]?:\/\/)/i,
];

function isNoise(line: string): boolean {
  return NOISE_RES.some((r) => r.test(line));
}

// ─── 匹配章节标题行，返回匹配到的标题字符串或 null ───
function matchChapterHeader(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return null;
  // 纯数字行排除（年份、数据等）
  if (/^\d{1,4}$/.test(trimmed)) return null;

  for (const re of CHAPTER_RES) {
    if (re.test(line)) {
      // 弱匹配（纯数字标题）需要额外验证：至少包含中文字符
      if (re === CHAPTER_RES[CHAPTER_RES.length - 1]) {
        if (!/[一-鿿]/.test(trimmed)) continue;
      }
      return trimmed;
    }
  }
  return null;
}

// ─── 提取书名（《》或元信息标签） ───
function extractTitle(lines: string[]): { title: string; consumed: number } {
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const line = lines[i].trim();
    // 《书名》
    const bracket = /《([^》]{1,60})》/.exec(line);
    if (bracket) return { title: bracket[1].trim(), consumed: i + 1 };
    // 书名：XXX
    const meta = META_TITLE_RE.exec(line);
    if (meta) return { title: meta[1].trim(), consumed: i + 1 };
    // 首行非空短行（不是元信息标签）
    if (i === 0 && line.length >= 2 && line.length <= 50
      && !line.startsWith("作者") && !line.startsWith("简介")) {
      return { title: line, consumed: 1 };
    }
  }
  return { title: "", consumed: 0 };
}

// ─── 提取作者 ───
function extractAuthor(lines: string[]): string | null {
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const m = META_AUTHOR_RE.exec(lines[i].trim());
    if (m) return m[1].trim();
  }
  return null;
}

function hasDescLabel(line: string): boolean {
  return META_DESC_LABEL.test(line.trim());
}

// ─── 清理章节标题 ───
function cleanChapterTitle(raw: string): string {
  return raw
    .replace(/[​-‏﻿]/g, "")
    .replace(/[：:]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── 找正文起点（跳过元信息区） ───
function findBodyStart(lines: string[]): number {
  for (let i = 0; i < Math.min(lines.length, 100); i++) {
    if (matchChapterHeader(lines[i])) return i;
  }
  let skip = 0;
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const l = lines[i].trim();
    if (isNoise(l) || l.length < 3 || l.includes("作者") || l.includes("简介") || l.includes("书名")) {
      skip = i + 1;
    } else break;
  }
  return skip;
}

// ─── 按空行分割 ───
function splitByBlankLines(lines: string[]): string[][] {
  const segments: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.trim()) { current.push(line); }
    else if (current.length > 0) { segments.push(current); current = []; }
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

// ═══════════════════════════════════════════════
// 主解析函数
// ═══════════════════════════════════════════════
export function parseNovelTxt(text: string): ParsedNovel | null {
  // 预处理
  let normalized = text
    .replace(/^﻿/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "    ");

  if (normalized.trim().length < 10) return null;

  const allLines = normalized.split("\n");

  // ── Phase 1: 元信息提取（前 80 行） ──
  const preambleEnd = Math.min(80, allLines.length);
  const preamble = allLines.slice(0, preambleEnd);

  const { title, consumed: titleConsumed } = extractTitle(preamble);
  const author = extractAuthor(preamble) || undefined;
  const restAfterTitle = preamble.slice(titleConsumed);

  let descStart = 0;
  if (restAfterTitle.length > 0 && hasDescLabel(restAfterTitle[0])) {
    descStart = 1;
  }

  let descEnd = restAfterTitle.length;
  for (let i = descStart; i < restAfterTitle.length; i++) {
    if (matchChapterHeader(restAfterTitle[i])) { descEnd = i; break; }
  }

  const descLines = restAfterTitle.slice(descStart, descEnd).filter((l) => !isNoise(l));
  const description = descLines.join("\n").trim().slice(0, 3000);

  // ── Phase 2: 章节扫描（逐行状态机） ──
  const chapters: { title: string; content: string }[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];
  let inPreamble = true;

  for (let i = 0; i < allLines.length; i++) {
    const header = matchChapterHeader(allLines[i]);

    if (header) {
      inPreamble = false;
      // 保存上一章
      if (currentTitle && currentLines.length > 0) {
        const content = currentLines.join("\n").trim();
        if (content.length > 5) {
          chapters.push({ title: cleanChapterTitle(currentTitle), content });
        }
      }
      currentTitle = header;
      currentLines = [];
    } else if (!inPreamble) {
      if (currentTitle) {
        currentLines.push(allLines[i]);
      } else if (allLines[i].trim() && !isNoise(allLines[i])) {
        // 第一个章节标记前的内容
        currentLines.push(allLines[i]);
      }
    }
  }

  // 最后一章
  if (currentTitle && currentLines.length > 0) {
    const content = currentLines.join("\n").trim();
    if (content.length > 5) {
      chapters.push({ title: cleanChapterTitle(currentTitle), content });
    }
  }

  // ── Phase 3: Fallback — 无章节标记 ──
  if (chapters.length === 0) {
    const bodyStart = findBodyStart(allLines);
    const body = allLines.slice(bodyStart);
    const segments = splitByBlankLines(body);

    if (segments.length >= 3) {
      let order = 1;
      for (const seg of segments) {
        const text = seg.join("\n").trim();
        if (text.length > 30) {
          chapters.push({ title: `第${order}章`, content: text });
          order++;
        }
      }
    } else {
      const fullText = body.map((l) => l.trim()).filter(Boolean).join("\n");
      const chunkSize = 5000;
      for (let i = 0, ch = 1; i < fullText.length; i += chunkSize, ch++) {
        const chunk = fullText.slice(i, i + chunkSize).trim();
        if (chunk.length > 30) {
          chapters.push({ title: `第${ch}章`, content: chunk });
        }
      }
    }
  }

  // ── Phase 4: 后处理 ──
  // 合并过短章节（< 50 字）
  const merged: typeof chapters = [];
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].content.length < 50 && merged.length > 0 && i + 1 < chapters.length) {
      merged[merged.length - 1].content +=
        "\n" + chapters[i].title + "\n" + chapters[i].content;
    } else {
      merged.push(chapters[i]);
    }
  }

  // 去重相邻相同内容
  const deduped = merged.filter(
    (ch, i) => i === 0 || ch.content !== merged[i - 1].content
  );

  return { title: title || "导入的小说", author, description, chapters: deduped };
}
