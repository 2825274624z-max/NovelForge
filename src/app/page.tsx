import Link from "next/link";
import { BookOpen, Sparkles, Users, Download, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="text-base font-bold tracking-tight">NovelForge</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              工作台
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto">
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs text-primary/80">
          <Sparkles className="w-3 h-3" /> AI 驱动 · 智能写作
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-4">
          用 AI 创作
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {" "}更好的小说
          </span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
          NovelForge 是你专属的智能小说工作台。从大纲到成稿，AI 辅助每一个创作环节。
          管理角色、世界观、伏笔，一切只为让你的故事更精彩。
        </p>

        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
        >
          开始创作
          <ChevronRight className="w-4 h-4" />
        </Link>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 w-full max-w-2xl">
          {[
            { icon: Sparkles, title: "10 种 AI 工作流", desc: "大纲、草稿、续写、润色、扩写、缩写..." },
            { icon: Users, title: "7 类资产库", desc: "角色卡、世界观、地点、组织、物品、伏笔、时间线" },
            { icon: Download, title: "多格式导出", desc: "Markdown、TXT、JSON 项目备份" },
          ].map((f) => (
            <div key={f.title} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30">
              <div className="w-10 h-10 rounded-full bg-background border flex items-center justify-center">
                <f.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{f.title}</span>
              <span className="text-xs text-muted-foreground text-center leading-relaxed">{f.desc}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer with watermark */}
      <footer className="border-t border-border/40 py-4 text-center">
        <p className="text-[11px] text-muted-foreground/50">
          NovelForge · 作者 <span className="font-medium text-muted-foreground/70">斗包要打野</span>
          {" · "}
          <span className="text-muted-foreground/50">2825274624z@gmail.com</span>
        </p>
      </footer>
    </div>
  );
}
