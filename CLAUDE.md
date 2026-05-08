# CLAUDE.md — NovelForge

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build + type check |
| `npm run lint` | ESLint |
| `npm run db:seed` | Seed database with demo sci-fi project |
| `npx tsx prisma/seed.ts` | Same as above |
| `node prisma/init-db.js` | Initialize/reset SQLite database |
| `node prisma/migrate-v0.5.js` | Apply v0.5 memory system migrations (safe to re-run) |

## Architecture

```
src/app/
├── api/
│   ├── ai/
│   │   ├── route.ts              # AI streaming (10 workflows, abortable)
│   │   ├── generations/route.ts  # AI generation history CRUD
│   │   ├── settings/route.ts     # Per-project AI provider config
│   │   └── test/route.ts         # Test AI connection
│   ├── assets/route.ts           # Single endpoint → all 7 asset types
│   ├── chapters/route.ts         # Chapter CRUD + auto-versioning
│   ├── characters/route.ts       # Character CRUD
│   ├── export/route.ts           # MD / TXT / JSON export
│   ├── foreshadowings/route.ts
│   ├── items/route.ts
│   ├── locations/route.ts
│   ├── organizations/route.ts
│   ├── projects/route.ts         # Project CRUD
│   ├── timelines/route.ts
│   ├── memory/
│   │   ├── extract/route.ts        # POST: 章节记忆提取
│   │   ├── context/route.ts        # GET:  获取组装后的记忆上下文
│   │   ├── check/route.ts          # POST: 一致性校验
│   │   └── status/route.ts         # GET:  记忆系统概览
│   ├── outline/
│   │   ├── route.ts                # GET:  获取完整分级大纲
│   │   ├── volumes/route.ts        # POST/PUT/DELETE: 卷管理
│   │   ├── arcs/route.ts           # POST/PUT/DELETE: 故事弧管理
│   │   ├── chapter-outline/route.ts # POST: 保存章节大纲
│   │   ├── generate/route.ts       # POST: AI 生成分级大纲
│   │   └── adjust/route.ts         # POST: AI 调整后续大纲
├── projects/
│   ├── page.tsx                  # Dashboard: project cards + create dialog
│   └── [id]/
│       ├── page.tsx              # Main workspace (state orchestrator ~300 lines)
│       ├── editor-panel.tsx      # Writing area (textarea with writing font)
│       ├── ai-panel.tsx          # AI assistant (workflow chips + stream output)
│       ├── asset-sheet.tsx       # All 7 asset types in a right Sheet
│       └── settings-sheet.tsx    # Project info + AI config + export + delete
├── layout.tsx                    # Root: Geist fonts, ThemeProvider, Toaster
├── page.tsx                      # Landing redirect
└── globals.css                   # Tailwind v4 + font-writing utility class

src/lib/
├── ai/
│   ├── provider.ts               # Unified AI provider + createProviderWithRetry
│   └── ai-service.ts             # 11 workflow system prompts
├── memory/                       # v0.5: 记忆系统 + 分级大纲
│   ├── prompts.ts                # AI prompt 模板（提取/校验/简报）
│   ├── memory-extractor.ts       # 写完一章后自动提取结构化记忆
│   ├── context-assembler.ts      # 写新章前组装记忆上下文
│   └── outline-manager.ts        # 分级大纲管理（卷/弧/章大纲）
├── db.ts                         # PrismaClient singleton with SQLite adapter
├── token-count.ts                # Chinese/English token estimation + truncation
├── word-count.ts                 # Mixed Chinese/English word counter
├── theme-provider.tsx            # next-themes wrapper
└── utils.ts                      # cn() helper

src/store/
└── useStore.ts                   # Zustand: useProjectStore, useEditorStore, useAIStore

src/components/
├── ui/                           # shadcn/ui components (Tooltip via @base-ui/react)
├── project-card.tsx              # Project card with type/chapter/character counts
├── theme-toggle.tsx              # Dark/light toggle button
└── memory-status.tsx             # Sidebar memory system status indicator
```

## Page Design (Three-Panel Writing Workspace)

```
┌ TopBar: ← | ProjectName | Words | Progress | Export | Settings | Theme ┐
├────────────┬───────────────────────────────┬─────────────────────────────┤
│ Sidebar    │  EditorPanel                  │  AIPanel (collapsible)     │
│ 200px      │                               │  360px                     │
│            │  ┌ Chapter Title ──────────┐  │  Workflow chips grid       │
│ Chapters   │  │                         │  │  Prompt textarea           │
│  ▸ Ch.1   │  │  Writing area            │  │  Advanced (collapsed)      │
│  ▸ Ch.2   │  │  Georgia serif font      │  │  [Generate] [Cancel]      │
│  ■ Ch.3   │  │  1.9 line-height         │  │  ─────────────────────    │
│  + New    │  │  min-height fill         │  │  Stream output             │
│            │  │  auto-save 2s debounce  │  │  [Copy] [Insert] [Retry]  │
│ ───────── │  └──────────────────────────┘  │                             │
│ Assets    │  Status: 1,234 字 | saving...  │  Token estimate: ~2.5k      │
│  👤 角色   │                               │                             │
│  🌍 世界观│  Asset Sheet (right slide)     │  Settings Sheet (right)    │
│  ...      │  ← 7 type tabs + CRUD         │  ← project + AI config     │
└────────────┴───────────────────────────────┴─────────────────────────────┘
```

## Database

- **Prisma 7** `prisma-client` generator + `prisma-adapter-sqlite`
- 19 tables created via `node:sqlite` in `prisma/init-db.js` + `prisma/migrate-v0.5.js`
- Migrations: ALTER TABLE / CREATE TABLE IF NOT EXISTS statements (safe to re-run)
- Regenerate client: `npx prisma generate`
- Seed: `prisma/seed.ts` → demo project "星穹之下"

## Data Model

```
Project → Chapters → ChapterHistories
Project → Characters (name, identity, personality, goals, relationships, quirks, appearance, characterArc, backstory)
Project → WorldBuildings (title, type, rules, history, factions, limitations, content)
Project → Locations (name, type, faction, description, importantEvents)
Project → Organizations (name, type, goals, members, resources, rivalries, description)
Project → Items (name, type, effect, limitations, sideEffects, source, description)
Project → Foreshadowings (title, description, plantChapterId, resolveChapterId, status)
Project → Timelines (title, content, timePos, relatedCharacters, relatedChapters)
Project → AISettings (1:1, per-project provider/model/apiKey/temperature/maxTokens)
Project → AIGenerations (workflow, model, prompt, output, timestamp)

v0.5 Memory System:
Project → Volumes (title, order, summary, wordTarget, wordCount, status)
Project → StoryArcs (name, description, arcType, status)
Project → PlotThreads (name, description, priority, status, openedChapter, resolvedChapter)
Project → CharacterStates (projectId, characterId, chapterNum, location, goal, emotion, relationships)
Project → TimelineEvents (projectId, chapterNum, eventDesc, storyTime, characters)
Project → ChekhovGuns (description, plantedChapter, payedChapter, status)
Chapter → ChapterOutline (summary, keyEvents, characterArcs, plotThreads, wordTarget)
```

## AI Provider Layer

- 6 providers: OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, Ollama
- All use OpenAI-compatible API via single `createProvider()` factory
- `createProviderWithRetry()` adds: 60s timeout, 1 retry, AbortSignal support
- 11 workflows with specialized Chinese system prompts in `ai-service.ts` (新增 assetCard 从章节提取资产)
- `AIError` class with 6 error codes: timeout, cancelled, auth, rate_limit, server, network
- API keys: `.env` or per-project settings; never hardcoded

## Key Patterns

- **State**: Zustand (`useProjectStore`, `useEditorStore`, `useAIStore`)
- **Styling**: Tailwind v4 + shadcn/ui; dark/light via next-themes
- **Fonts**: Geist Sans (UI), `.font-writing` (editor: Georgia / Noto Serif SC)
- **API**: App Router route handlers; all dynamic (ƒ)
- **Auto-save**: 2s debounce on chapter content changes in editor
- **Assets**: Consolidated `/api/assets` endpoint returns all 7 types in one request
- **Token budget**: `buildContext()` truncates to 60% of maxTokens for context
- **Keyboard**: Ctrl+S save, Ctrl+N new chapter, Ctrl+Shift+A toggle AI panel
- **Mutation guards**: All React Query mutations now check `res.ok` and throw on failure
- **Settings guard**: `settingsOpenRef` prevents remote data from overwriting user edits while the settings panel is open

## Asset Linking

Fields that reference other entities use Select dropdowns (not blind text input):
- Location → faction: selects from organizations
- Foreshadowing → plantChapterId / resolveChapterId: selects from chapters
- Timeline → relatedCharacters / relatedChapters: selects from characters / chapters

## AI Asset Card Generation

- Asset Sheet 中新增 "从章节生成资产卡片" 功能
- 用户选择多个章节 → AI 分析内容 → 自动提取角色/世界观/地点/物品/伏笔 → 批量创建资产
- 通过 `assetCard` workflow 实现，输出严格 JSON 格式

## Export

- `/api/export?projectId=xxx&format=md` — All chapters as Markdown
- `/api/export?projectId=xxx&format=txt` — Plain text
- `/api/export?projectId=xxx&format=json` — Full backup (chapters + all assets + AI history + settings)
- Content-Disposition supports RFC 5987 `filename*=UTF-8''` encoding for Chinese filenames
- Frontend sanitizes filenames by stripping illegal characters `[\\/:*?"<>|]`

## Workflow Smart Insert/Replace

- draft/continue: "插入正文" → 追加到光标位置
- polish/expand/shorten/rewrite: "替换选中" → 有选中则替换选区，无选中则替换全文
- 生成完成时自动执行相应操作，手动按钮支持重新应用

## Memory System (v0.5)

### 架构
三层记忆体系支撑长篇写作：

| 层级 | 作用 | 实现 |
|------|------|------|
| **大纲层** | 卷→章→场景，动态调整 | Volume/StoryArc/ChapterOutline 表 |
| **记忆层** | 角色状态/剧情线/伏笔/时间线 | CharacterState/PlotThread/ChekhovGun/TimelineEvent 表 |
| **校验层** | 写完自动检查逻辑矛盾 | consistency-checker → `/api/memory/check` |

### 自动化流程
1. **写前**：`useAIGeneration` 调用 `/api/memory/context` 获取记忆上下文，注入 AI prompt
2. **写后**：保存章节后自动调用 `/api/memory/extract` 提取结构化记忆
3. **上下文组装**：`context-assembler.ts` 查询活跃剧情线、角色状态、伏笔、时间线，拼接为结构化文本
4. **记忆提取**：`memory-extractor.ts` 调 AI 分析章节，输出 JSON → 写入各记忆表

### 关键修复
- `buildContext` 排序从 `wordCount` 修复为 `order`（之前取"字数最多的3章"而非"最新的3章"）
- `buildContext` 缓存为 `useMemo` 避免每帧双重构建
- 记忆上下文仅在 `draft/continue/outline` 工作流中注入
