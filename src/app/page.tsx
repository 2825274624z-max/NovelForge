"use client";

import Link from "next/link";
import { BookOpen, Sparkles, Download, ArrowRight, PenLine, Brain, Palette, Layers, FileText, Zap, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

const GITHUB_URL = "https://github.com/2825274624z-max/NovelForge";
const DOWNLOAD_URL = "https://github.com/2825274624z-max/NovelForge/releases/latest";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ─── 导航 ─── */}
      <header className="border-b border-border/30 sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/80 to-orange-600/80 flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">NovelForge</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <GithubIcon className="w-4 h-4" /> GitHub
            </a>
            <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              工作台
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.03] via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-br from-amber-500/[0.06] via-orange-500/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/8 border border-amber-500/15 text-xs text-amber-600 dark:text-amber-400 mb-8">
            <Sparkles className="w-3 h-3" /> AI 驱动 · 长篇小说写作引擎
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            用 AI 写出
            <br />
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              更好的长篇小说
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
            NovelForge 为长篇创作者而生。分层上下文记忆确保 AI 从不忘剧情，
            6 家 AI 提供商自由切换，本地运行、数据安全，专注写作 50 万字不跑偏。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="h-11 px-6 rounded-xl text-sm font-medium gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-lg shadow-foreground/10">
                <Download className="w-4 h-4" /> 下载 Windows 版
              </Button>
            </a>
            <Link href="/projects">
              <Button variant="outline" size="lg" className="h-11 px-6 rounded-xl text-sm font-medium gap-2">
                在线体验 <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground/50 mt-3">
            v0.5 · Windows 10+ · 约 211 MB · 解压即用
          </p>
        </div>
      </section>

      {/* ─── 特性 ─── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">为长篇小说写作而生</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            不仅是一个编辑器，更是一套完整的长篇创作系统
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Brain, title: "分层上下文记忆", desc: "近章全文 + 历史摘要 + 弧线概括 + 活跃伏笔。写到第 100 章，AI 仍记得第 1 章的细节。" },
            { icon: Layers, title: "6 种创作工作流", desc: "生成章节、续写、润色、扩写、缩写、重写。选中文字精准处理，整章重写一键完成。" },
            { icon: Palette, title: "7 类资产库", desc: "角色卡、世界观、地点、组织、物品、伏笔、时间线。统一管理，AI 自动引用。" },
            { icon: Zap, title: "6 家 AI 自由切换", desc: "DeepSeek / OpenAI / Anthropic / Gemini / OpenRouter / Ollama。API Key 本地存储，安全放心。" },
            { icon: FileText, title: "智能导出", desc: "一键导出 Markdown / TXT / JSON。完整备份包含章节、资产、AI 历史。" },
            { icon: PenLine, title: "专注写作体验", desc: "TipTap 富文本编辑器、专注模式、自动保存、智能续写建议。写作不被打断。" },
          ].map((f) => (
            <div key={f.title} className="group relative rounded-2xl border border-border/40 bg-card/50 p-6 hover:border-amber-500/20 hover:bg-card hover:shadow-lg hover:shadow-amber-500/[0.02] transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-amber-500/8 flex items-center justify-center mb-4 group-hover:bg-amber-500/12 transition-colors">
                <f.icon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 下载区 ─── */}
      <section className="border-t border-border/30">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">开始你的创作</h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-md mx-auto">
            Windows 桌面版，解压即用。数据存储在本地，完全离线也可写作。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="h-12 px-8 rounded-xl text-sm font-medium gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-lg shadow-foreground/10">
                <Download className="w-4 h-4" /> 下载 NovelForge
                <span className="ml-1 text-xs opacity-60 font-normal">211 MB</span>
              </Button>
            </a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="lg" className="h-12 px-8 rounded-xl text-sm font-medium gap-2">
                <GithubIcon className="w-4 h-4" /> GitHub 仓库
                <ChevronRight className="w-3.5 h-3.5 ml-1 opacity-40" />
              </Button>
            </a>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-muted-foreground/60">
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" /> Windows 10/11</div>
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" /> 本地 SQLite 数据库</div>
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" /> 离线可用</div>
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" /> 无需安装</div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/30 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
            <BookOpen className="w-3.5 h-3.5" />
            <span>NovelForge</span>
            <span className="text-muted-foreground/20">·</span>
            <span>v0.5</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground/50">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors flex items-center gap-1">
              <GithubIcon className="w-3 h-3" /> GitHub
            </a>
            <span className="text-muted-foreground/20">·</span>
            <Link href="/projects" className="hover:text-muted-foreground transition-colors">工作台</Link>
          </div>
        </div>
        <p className="text-center text-[10px] text-muted-foreground/25 mt-4">
          Made with care · 斗包要打野 · QQ 2825274624
        </p>
      </footer>
    </div>
  );
}
