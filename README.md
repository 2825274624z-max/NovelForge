# NovelForge — AI 长篇小说写作引擎

AI 驱动的长篇小说创作工具。支持 50 万字级长篇写作，三层记忆体系确保逻辑一致，6 家 AI 提供商随意切换，可打包为桌面应用本地运行。

## 技术栈

- **框架**: Next.js 16 (App Router) + TypeScript + Turbopack
- **编辑器**: TipTap 富文本编辑器
- **样式**: Tailwind CSS v4 + shadcn/ui + @base-ui/react
- **数据库**: Prisma 7 + SQLite（`node:sqlite`，零外部依赖）
- **状态管理**: Zustand 5 + TanStack React Query
- **AI 接口**: OpenAI SDK（兼容 6 家提供商，11 种写作工作流）
- **桌面封装**: Electron 42 + electron-builder
- **主题**: next-themes（暗色/亮色）

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
node prisma/init-db.js

# 3. 应用 v0.5 记忆系统迁移
node prisma/migrate-v0.5.js

# 4. 填充演示数据（可选）
npm run db:seed

# 5. 启动开发服务器
npm run dev
```

打开 **http://localhost:3000**

## Electron 桌面版

```bash
# 开发模式（Electron + Next.js dev server）
npm run electron:dev

# 构建生产版
npm run electron:build

# 仅构建 Windows 版
npm run electron:build:win
```

构建产物：
- `release/win-unpacked/NovelForge.exe` — 可直接运行
- `release/NovelForge-0.5.0-win.zip` — 分发包

## AI 提供商配置

### 项目级配置（推荐）

进入作品 → 齿轮图标 → AI 模型配置，可针对每个作品独立配置：

| Provider | 默认模型 | 说明 |
|----------|---------|------|
| DeepSeek | deepseek-v4-flash | 默认提供商 |
| OpenAI | gpt-4o | GPT 系列 |
| Anthropic | claude-sonnet-4-6 | Claude 系列 |
| Gemini | gemini-2.0-flash | Google AI |
| OpenRouter | — | 聚合多模型 |
| Ollama | — | 本地模型，无需 API Key |

支持**测试连接**按钮，一键验证连通性。API Key 存储在本地 SQLite 数据库，不会提交到 Git。

### 环境变量（全局）

```env
DEEPSEEK_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

## 核心功能

### 三栏写作工作台

```
┌ 顶栏: ←返回 | 书名 | 字数/目标 | 进度条 | 统计 | 一致性 | 导出 | 设置 | 主题 ┐
├──────────┬────────────────────────┬──────────────────────────┤
│ 侧边栏   │  编辑器                 │  AI 助手面板             │
│          │                        │                          │
│ 章节列表 │  TipTap 富文本编辑器    │  工作流标签页            │
│ · 切换   │  · Georgia 衬线字体    │  提示词输入              │
│ · 新建   │  · 1.9 行高            │  高级选项（上下文/资产）  │
│ · 删除   │  · 自动保存            │  [生成] [取消]           │
│          │  · 智能续写建议         │  流式输出预览            │
│ ──────── │                        │  [复制] [插入] [重试]   │
│ 资产库   │                        │                          │
│ · 角色   │                        │  记忆状态栏              │
│ · 世界观 │                        │  上下文 token 估算       │
│ · 地点   │                        │                          │
│ · 组织   │                        │                          │
│ · 物品   │                        │                          │
│ · 伏笔   │                        │                          │
│ · 时间线 │                        │                          │
│ ──────── │                        │                          │
│ 故事大纲 │                        │                          │
│ 记忆系统 │                        │                          │
└──────────┴────────────────────────┴──────────────────────────┘
```

### 11 种 AI 写作工作流

| 分类 | 工作流 | 说明 |
|------|--------|------|
| **创作** | `draft` | 根据大纲和设定生成完整章节 |
| | `continue` | 从前文自然续写 |
| | `outline` | 生成完整故事大纲（三幕式 + 情节点） |
| | `nextChapter` | 为下一章生成详细写作建议 |
| | `assetCard` | 从章节内容提取角色/世界观/地点等资产卡片 |
| **编辑** | `polish` | 润色选中文本，优化表达 |
| | `expand` | 扩写选中文本，丰富细节 |
| | `shorten` | 精简选中文本 |
| | `rewrite` | 以不同风格改写 |
| **诊断** | `consistency` | 检查全篇情节/角色/时间线一致性 |
| | `summary` | 生成章节摘要（150-250 字） |

### 智能插入 / 替换

- **创作类**（draft/continue）：结果追加到光标位置
- **编辑类**（polish/expand/shorten/rewrite）：有选中则替换选区，无选中则替换全文

### 智能续写（Pause）

在编辑器中输入 `///` 自动触发：取上文 3-5 句发送给 AI，生成续写建议浮层，一键采纳或忽略。

---

## v0.5 记忆系统（新增）

### 三层记忆架构

| 层级 | 作用 | 数据模型 |
|------|------|---------|
| **大纲层** | 卷→章→故事弧，动态调整 | Volume / StoryArc / ChapterOutline |
| **记忆层** | 角色状态 / 剧情线 / 伏笔 / 时间线 | PlotThread / CharacterState / ChekhovGun / TimelineEvent |
| **校验层** | 写完自动检查逻辑矛盾 | 调用 AI 对比记忆库 |

### 自动化流程

1. **写前**：草稿/续写/大纲工作流自动调用 `/api/memory/context`，注入上下文：
   - 活跃剧情线（按优先级排序）
   - 角色最新状态（位置/目标/情绪/关系变化）
   - 待回收伏笔
   - 近期时间线事件
   - 前情摘要

2. **写后**：保存章节后后台自动调用 `/api/memory/extract`，AI 分析并提取：
   - 角色状态变化（位置/目标/情绪/关系）
   - 剧情线变化（新增/推进/解决/废弃）
   - 时间线事件
   - 契诃夫之枪（埋下/回收）
   - 潜在矛盾

### 分级大纲

- **卷**（Volume）：管理长篇小说的宏观结构
- **故事弧**（StoryArc）：角色弧、情节弧、主题弧
- **章大纲**（ChapterOutline）：每章的关键事件、角色弧进度、剧情线

支持 AI 一键生成完整分级大纲，以及根据已写内容动态调整后续章节。

### 一致性检查

- 写完保存后自动触发（后台静默）
- 手动触发：顶栏「文件搜索」图标
- 检查项：角色状态连续性、时间线一致性、剧情线合理性、设定冲突

---

## 导出

```
/api/export?projectId=xxx&format=md   → Markdown（所有章节）
/api/export?projectId=xxx&format=txt  → 纯文本
/api/export?projectId=xxx&format=json → 完整备份（章节 + 资产 + AI 历史 + 设定）
```

支持 RFC 5987 中文文件名编码。

---

## API 路由

```
src/app/api/
├── ai/
│   ├── route.ts              # AI 流式生成（11 种工作流，支持取消）
│   ├── generations/route.ts  # AI 生成历史 CRUD
│   ├── settings/route.ts     # 项目级 AI 配置
│   └── test/route.ts         # 连接测试
├── chapters/route.ts         # 章节 CRUD + 自动版本控制
├── assets/route.ts           # 7 种资产类型统一端点
├── characters/route.ts
├── world-building/route.ts
├── locations/route.ts
├── organizations/route.ts
├── items/route.ts
├── foreshadowings/route.ts
├── timelines/route.ts
├── export/route.ts           # MD / TXT / JSON 导出
├── projects/route.ts         # 项目 CRUD
├── stats/route.ts            # 写作统计 + 每日字数
├── memory/                   # v0.5 记忆系统
│   ├── extract/route.ts      # POST 记忆提取
│   ├── context/route.ts      # GET  上下文组装
│   ├── check/route.ts        # POST 一致性校验
│   └── status/route.ts       # GET  记忆概览
└── outline/                  # v0.5 分级大纲
    ├── route.ts              # GET  完整大纲
    ├── volumes/route.ts      # POST/PUT/DELETE 卷
    ├── arcs/route.ts         # POST/PUT/DELETE 故事弧
    ├── chapter-outline/route.ts  # POST 章大纲
    ├── generate/route.ts     # POST AI 生成大纲
    └── adjust/route.ts       # POST AI 调整大纲
```

---

## 数据模型（19 张表）

```
核心业务：
  Project → Chapters → ChapterHistories (版本控制)
  Project → Characters / WorldBuildings / Locations / Organizations / Items
  Project → Foreshadowings / Timelines
  Project → AISettings (1:1) / AIGenerations / DailyWritingLog

v0.5 记忆系统：
  Project → Volumes / StoryArcs / PlotThreads
  Project → CharacterStates / TimelineEvents / ChekhovGuns
  Chapter → ChapterOutline (1:1)
```

---

## 项目结构

```
src/
├── app/
│   ├── api/                  # API 路由（见上方路由表）
│   ├── projects/
│   │   ├── page.tsx          # 作品列表页
│   │   └── [id]/
│   │       ├── page.tsx      # 主工作台（三栏布局编排器）
│   │       ├── editor-panel.tsx   # TipTap 编辑器
│   │       ├── ai-panel.tsx       # AI 助手面板
│   │       ├── asset-sheet.tsx    # 资产库 Sheet（7 类）
│   │       ├── outline-sheet.tsx  # 大纲 Sheet
│   │       └── settings-sheet.tsx # 设置 Sheet
│   ├── layout.tsx            # 根布局（字体/主题/Toast）
│   └── globals.css           # Tailwind v4 + 写作字体
├── components/
│   ├── ui/                   # shadcn/ui 组件
│   ├── tiptap-editor.tsx     # TipTap 编辑器封装
│   ├── stats-panel.tsx       # 写作统计面板
│   ├── memory-status.tsx     # 记忆状态指示器
│   ├── project-card.tsx
│   └── theme-toggle.tsx
├── hooks/
│   ├── useAIGeneration.ts    # AI 生成编排 + 上下文构建
│   ├── useAutoSave.ts        # 自动保存（2s 防抖）
│   └── useKeyboardShortcuts.ts
├── lib/
│   ├── ai/
│   │   ├── provider.ts       # 6 家 AI 提供商统一接口
│   │   └── ai-service.ts     # 11 种工作流系统提示词
│   ├── memory/               # 记忆系统服务
│   │   ├── prompts.ts        # AI 提取/校验 prompt 模板
│   │   ├── memory-extractor.ts    # 章节记忆提取
│   │   ├── context-assembler.ts   # 上下文组装
│   │   └── outline-manager.ts     # 分级大纲管理
│   ├── db.ts                 # PrismaClient 单例
│   ├── queries.ts            # TanStack React Query hooks
│   ├── token-count.ts        # 中英文 token 估算
│   ├── word-count.ts         # 中英文混合字数统计
│   └── utils.ts
├── store/
│   └── useStore.ts           # Zustand 状态管理
└── generated/prisma/         # Prisma 客户端（gitignored）

electron/                     # Electron 桌面壳
├── main.js                   # 主进程（启动 Next.js + 窗口管理）
└── preload.js                # 预加载脚本

prisma/
├── schema.prisma             # 数据模型（19 张表）
├── init-db.js                # 数据库初始化
├── migrate-v0.5.js           # v0.5 记忆系统迁移
├── clear-keys.js             # API Key 清理工具
└── seed.ts                   # 演示数据填充
```

## 开发命令

```bash
npm run dev              # 启动开发服务器（Turbopack）
npm run build            # 生产构建 + 类型检查
npm run lint             # ESLint
npm run db:seed          # 填充演示数据
node prisma/init-db.js   # 初始化/重置数据库
node prisma/migrate-v0.5.js  # 记忆系统迁移
npx prisma generate      # 重新生成 Prisma 客户端
```

## 路线图

- [x] 11 种 AI 写作工作流
- [x] 7 类资产库 + AI 资产卡片生成
- [x] 三层记忆体系（大纲 + 记忆 + 校验）
- [x] 分级大纲（卷 → 章 → 故事弧）
- [x] 自动记忆提取 + 上下文注入
- [x] AI 一致性检查
- [x] 智能续写（Pause）
- [x] 写作统计面板
- [x] Electron 桌面封装
- [ ] 写作前简报（Chapter Brief）
- [ ] 修订管道（初稿 → 润色 → 终检）
- [ ] 角色弧光可视化
- [ ] 时间线可视化
- [ ] EPUB / DOCX 导出
- [ ] 全文搜索
- [ ] 云端同步
- [ ] macOS / Linux 桌面版

## 许可

MIT
