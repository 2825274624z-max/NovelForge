# CLAUDE.md — NovelForge

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | 开发服务器 (Turbopack) |
| `npm run build` | 生产构建 |
| `npm run lint` | ESLint |
| `npm run db:init` | 初始化/重置 SQLite 数据库 |
| `npm run db:seed` | 填充演示数据 |
| `npm run electron:build:win` | 构建 Windows 桌面版 exe |
| `npm run electron:dev` | Electron 开发模式 |

## Architecture

```
src/app/
├── api/
│   ├── ai/route.ts              # AI 流式生成 (abortable)
│   ├── ai/bible/route.ts        # Compact Bible 生成
│   ├── ai/extract-state/route.ts # 结构化章节状态提取
│   ├── ai/task-card/route.ts    # 章节任务卡生成
│   ├── ai/test/route.ts         # 测试 AI 连接
│   ├── ai/generations/route.ts  # AI 生成历史
│   ├── assets/route.ts          # 7 类资产统一端点
│   ├── chapters/route.ts        # 章节 CRUD
│   ├── chapters/outline/route.ts # 章节大纲 + 任务卡读写
│   ├── config/route.ts          # 全局配置读写 (GET/PUT)
│   ├── export/route.ts          # MD/TXT/JSON 导出
│   ├── import/route.ts          # TXT 导入
│   ├── projects/route.ts        # 项目 CRUD
│   ├── stats/route.ts           # 写作统计
│   └── volumes/route.ts         # 卷/Arc CRUD
├── projects/
│   ├── page.tsx                 # 作品列表
│   └── [id]/
│       ├── page.tsx             # 主工作台 (含所有业务逻辑)
│       ├── editor-panel.tsx     # TipTap 编辑器面板
│       ├── ai-panel.tsx         # AI 助手面板 (8 工作流)
│       ├── asset-sheet.tsx      # 资产库 (全屏 3 栏)
│       ├── outline-sheet.tsx    # 大纲编辑器 (全屏双模式)
│       └── settings-sheet.tsx   # 作品设置 (全屏)
├── layout.tsx                   # 根布局
├── page.tsx                     # 首页 Landing
└── globals.css                  # Tailwind v4 + 编辑器样式

src/components/
├── ui/                          # shadcn/ui 组件 (@base-ui/react)
├── tiptap-editor.tsx            # TipTap 富文本编辑器
├── global-ai-settings.tsx       # 全局 AI 设置对话框
├── import-dialog.tsx            # TXT 导入对话框
├── stats-panel.tsx              # 写作统计面板
├── project-card.tsx             # 项目卡片
├── memory-status.tsx            # 记忆系统状态
└── theme-toggle.tsx             # 暗色/亮色切换

src/hooks/
├── useAIGeneration.ts           # AI 生成编排 + Context Builder v4
├── useAutoSave.ts               # 2s 防抖自动保存
└── useKeyboardShortcuts.ts      # 快捷键 (Ctrl+S/N/Enter/Shift+A)

src/lib/
├── ai/
│   ├── provider.ts              # 6 家 AI 统一接口 + retry
│   ├── ai-service.ts            # 12 种工作流 prompt (写作技法融合)
│   └── context-builder.ts       # 智能上下文调度器 v4
├── db.ts                        # PrismaClient 单例
├── config.ts                    # 用户配置文件加载 + 缓存
├── queries.ts                   # React Query hooks
├── txt-parser.ts                # TXT 小说解析器 (逐行状态机)
├── token-count.ts               # 中英文 token 估算
├── word-count.ts                # 混合字数统计
└── utils.ts                     # cn()

src/store/useStore.ts            # Zustand (Editor + AI Config 双 store)

electron/
├── main.js                      # Electron 主进程
├── preload.js                   # 预加载脚本
└── node-portable/node.exe       # 便携 Node.js
```

## Database

- Prisma 7 + `prisma-adapter-sqlite` + `node:sqlite`
- 20 张表，`prisma/init-db.js` 创建
- Migrations 为 ALTER TABLE 语句 (安全重复运行)
- `npx prisma generate` 重新生成客户端

### Key Tables

| 表 | 用途 |
|----|------|
| Project | bible(小说圣经), outline, description, worldView, writingReqs |
| Chapter | content, summary, stateJson(结构化状态), notes(连续性检查) |
| ChapterOutline | taskCard(章节任务卡 JSON) |
| Volume | 卷/Arc 管理 |
| Foreshadowing | status: planted/hinted/resolving/resolved |
| Character/WorldBuilding/Location/Organization/Item/Timeline | 7 类资产 |

## Context Builder v4

智能调度器，按章节目标选择性组装上下文：

```
Bible(≤2000字) → Arc Plan → 任务卡 → 上一章原文 →
人物状态(stateJson聚合) → 活跃伏笔 → 近3章摘要 →
历史关键事实(stateJson提取) → 世界资产 → 风格要求
```

核心原则：**不要全量 dump，按章节目标动态选择**。
有 Arc Plan 时大纲自动精简到 500 字。

## AI Provider Layer

- 6 家: OpenAI / Anthropic / Gemini / DeepSeek / OpenRouter / Ollama
- 统一 OpenAI-compatible API
- 全局配置文件: `novelforge.config.json`
- 支持 prompt caching (DeepSeek/Anthropic 缓存命中 1/10 计费)

## 12 Workflows

| 类型 | 工作流 | 特点 |
|------|--------|------|
| 创作 | draft | 任务卡约束 + 10 种开头技法 + 章节结构 + 悬念钩子 |
| 创作 | continue | 章内续写，全章原文保持连贯 |
| 编辑 | polish | 白描 + AI痕迹清除 + 句式变化 |
| 编辑 | expand | 感官细节 + 信息差 + 蒙太奇 |
| 编辑 | shorten | 核心保留 + 伏笔不丢 |
| 编辑 | rewrite | 风格转换 + 预期反转 |
| 编辑 | deai | 8 项清除清单 (高频词/成语堆砌/模板结构) |
| 分析 | review | 8 维度评分 /80 (开头/情节/人物/对话/悬念/节奏/展示/语言) |
| 分析 | consistency | 6 项一致性检查 + 严重程度标记 |
| 分析 | summary | 150-250 字精确摘要 |
| 规划 | outline | 主线 + 三幕 + 8 节点 + 人物弧光 |
| 规划 | nextChapter | 推进线 + 伏笔 + 开头技法推荐 |
| 提取 | assetCard | JSON 结构化提取，分批处理，去重合并 |

## Key Patterns

- **State**: Zustand + TanStack React Query (双层缓存，需注意一致性)
- **Styling**: Tailwind v4 + shadcn/ui + next-themes
- **Editor**: TipTap (StarterKit + Placeholder), `immediatelyRender: false`
- **Auto-save**: 2s debounce → 保存后自动摘要 + stateJson + 连续性检查 (并行)
- **Context**: Context Builder v4 智能调度，按章节目标选择性组装
- **Selection**: 文本处理工作流基于编辑器选区 (`lastSelection` ref 防失焦)
- **Keyboard**: Ctrl+S (保存) / Ctrl+N (新建) / Ctrl+Enter (AI生成) / Ctrl+Shift+A (AI面板)

## Auto-Save Pipeline

章节保存后自动执行 (后台并行)：
1. 摘要生成 (如果还没有)
2. 结构化状态提取 (每次保存)
3. 连续性检查 (字数 > 1000 时)

## User Config

`novelforge.config.example.json` → 复制为 `novelforge.config.json` 自定义:
- AI 默认 provider/model/temperature/maxTokens
- 编辑器 fontSize/lineHeight/autoSaveInterval
- UI defaultTheme/sidebarWidth
