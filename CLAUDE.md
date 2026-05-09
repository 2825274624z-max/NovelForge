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
│   ├── ai/settings/route.ts     # 项目级 AI provider 配置
│   ├── ai/test/route.ts         # 测试 AI 连接
│   ├── ai/generations/route.ts  # AI 生成历史
│   ├── assets/route.ts          # 7 类资产统一端点
│   ├── chapters/route.ts        # 章节 CRUD
│   ├── config/route.ts          # 客户端配置读取
│   ├── export/route.ts          # MD/TXT/JSON 导出
│   ├── projects/route.ts        # 项目 CRUD
│   ├── stats/route.ts           # 写作统计
│   └── [其他资产路由...]
├── projects/
│   ├── page.tsx                 # 作品列表
│   └── [id]/
│       ├── page.tsx             # 主工作台
│       ├── editor-panel.tsx     # TipTap 编辑器面板
│       ├── ai-panel.tsx         # AI 助手面板 (6 工作流)
│       ├── asset-sheet.tsx      # 资产库 Sheet
│       ├── outline-sheet.tsx    # 大纲 Sheet
│       └── settings-sheet.tsx   # 设置 Sheet
├── layout.tsx                   # 根布局
├── page.tsx                     # 首页
└── globals.css                  # Tailwind v4 + 编辑器样式

src/components/
├── ui/                          # shadcn/ui 组件 (@base-ui/react)
├── tiptap-editor.tsx            # TipTap 富文本编辑器
├── stats-panel.tsx              # 写作统计面板
├── project-card.tsx             # 项目卡片
└── theme-toggle.tsx             # 暗色/亮色切换

src/hooks/
├── useAIGeneration.ts           # AI 生成编排 + 分层上下文构建
├── useAutoSave.ts               # 2s 防抖自动保存
└── useKeyboardShortcuts.ts      # 快捷键

src/lib/
├── ai/provider.ts               # 6 家 AI 统一接口 + retry
├── ai/ai-service.ts             # 10 种工作流 prompt
├── db.ts                        # PrismaClient 单例
├── config.ts                    # 用户配置文件加载
├── queries.ts                   # React Query hooks
├── token-count.ts               # 中英文 token 估算
├── word-count.ts                # 混合字数统计
└── utils.ts                     # cn()

src/store/useStore.ts            # Zustand 状态管理

electron/
├── main.js                      # Electron 主进程
├── preload.js                   # 预加载脚本
└── node-portable/node.exe       # 便携 Node.js
```

## Database

- Prisma 7 + `prisma-adapter-sqlite` + `node:sqlite`
- 16 张表，`prisma/init-db.js` 创建
- Migrations 为 ALTER TABLE 语句 (安全重复运行)
- `npx prisma generate` 重新生成客户端

## AI Provider Layer

- 6 家: OpenAI / Anthropic / Gemini / DeepSeek / OpenRouter / Ollama
- 统一 OpenAI-compatible API
- 高级参数: topP / frequencyPenalty / presencePenalty / reasoningEffort
- 配置文件: `novelforge.config.json` (复制自 `novelforge.config.example.json`)

## Key Patterns

- **State**: Zustand + TanStack React Query
- **Styling**: Tailwind v4 + shadcn/ui + next-themes
- **Editor**: TipTap (StarterKit + Placeholder), `immediatelyRender: false`
- **Auto-save**: 2s debounce
- **Auto-summary**: 保存后自动调用 AI 生成章节摘要
- **Context**: 分层上下文 (近章全文 + 历史摘要 + 弧线概括 + 伏笔)
- **Selection**: 文本处理工作流基于编辑器选区

## Workflows

| 创作型 | 编辑型 (需选中文字) |
|--------|---------------------|
| draft 生成章节 | polish 润色 |
| continue 续写 | expand 扩写 |
| | shorten 缩写 |
| | rewrite 重写 |

大纲 → 独立 Sheet / 章节摘要 → 侧边栏 / 一致性检查 → 顶部栏

## User Config

`novelforge.config.example.json` → 复制为 `novelforge.config.json` 自定义:
- AI 默认 provider/model/temperature/maxTokens
- 编辑器字体大小/行高/自动保存间隔
- UI 默认主题/侧边栏宽度
