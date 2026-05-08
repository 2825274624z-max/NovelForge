# CLAUDE.md — AI Novel Agent

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build + type check |
| `npm run lint` | ESLint |
| `npm run db:seed` | Seed database with demo sci-fi project |
| `npx tsx prisma/seed.ts` | Same as above |
| `node prisma/init-db.js` | Initialize/reset SQLite database |

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
│   └── world-building/route.ts
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
│   └── ai-service.ts             # 10 workflow system prompts
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
└── theme-toggle.tsx              # Dark/light toggle button
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
- 12 tables created via `node:sqlite` in `prisma/init-db.js`
- Migrations: ALTER TABLE statements at end of init-db.js (safe to re-run)
- Regenerate client: `npx prisma generate`
- Seed: `prisma/seed.ts` → demo project "星穹之下" with chapters, characters, locations, orgs, items, foreshadowings, timelines

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
```

## AI Provider Layer

- 6 providers: OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, Ollama
- All use OpenAI-compatible API via single `createProvider()` factory
- `createProviderWithRetry()` adds: 60s timeout, 1 retry, AbortSignal support
- 10 workflows with specialized Chinese system prompts in `ai-service.ts`
- `AIError` class with 6 error codes: timeout, cancelled, auth, rate_limit, server, network
- API keys: `.env` or per-project settings; never hardcoded

## Key Patterns

- **State**: Zustand (`useProjectStore`, `useEditorStore`, `useAIStore`)
- **Styling**: Tailwind v4 + shadcn/ui; dark/light via next-themes
- **Fonts**: Geist Sans (UI), `.font-writing` (editor: Georgia / Noto Serif SC)
- **API**: App Router route handlers; all dynamic (ƒ)
- **Auto-save**: 2s debounce on chapter content changes in editor
- **Assets**: Consolidated `/api/assets` endpoint returns all 7 types in one request
- **Token budget**: `buildContext()` truncates to 70% of maxTokens for context
- **Keyboard**: Ctrl+S save, Ctrl+N new chapter, Ctrl+Shift+A toggle AI panel

## Asset Linking

Fields that reference other entities use Select dropdowns (not blind text input):
- Location → faction: selects from organizations
- Foreshadowing → plantChapterId / resolveChapterId: selects from chapters
- Timeline → relatedCharacters / relatedChapters: selects from characters / chapters

## Export

- `/api/export?projectId=xxx&format=md` — All chapters as Markdown
- `/api/export?projectId=xxx&format=txt` — Plain text
- `/api/export?projectId=xxx&format=json` — Full backup (chapters + all assets + AI history + settings)
