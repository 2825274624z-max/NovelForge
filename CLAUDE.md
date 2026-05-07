# CLAUDE.md — AI Novel Agent

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build + type check |
| `npm run lint` | ESLint |
| `npm run db:seed` | Seed database with demo data |
| `npx tsx prisma/seed.ts` | Same as above |

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── ai/                 # AI streaming endpoint
│   │   │   ├── generations/    # AI generation history CRUD
│   │   │   ├── settings/       # AI provider settings CRUD
│   │   │   └── test/           # Test AI connection
│   │   ├── chapters/           # Chapter CRUD + history
│   │   ├── characters/         # Character CRUD
│   │   ├── export/             # MD/TXT/JSON export
│   │   ├── foreshadowings/     # Foreshadowing CRUD
│   │   ├── projects/           # Project CRUD
│   │   └── world-building/     # WorldBuilding CRUD
│   ├── projects/               # Dashboard page
│   └── projects/[id]/
│       ├── editor/             # Three-panel editor + AI panel
│       └── settings/           # Settings + AI config + asset management
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── project-card.tsx        # Project card widget
│   └── theme-toggle.tsx        # Dark/light toggle
├── lib/
│   ├── ai/
│   │   ├── provider.ts         # Unified AI provider (OpenAI-compatible)
│   │   └── ai-service.ts       # Workflow prompts + chat/stream
│   ├── db.ts                   # PrismaClient singleton (adapter)
│   ├── word-count.ts           # Chinese + English word counter
│   └── theme-provider.tsx      # next-themes provider
├── store/
│   └── useStore.ts             # Zustand: project, editor, AI stores
└── generated/prisma/           # Generated Prisma client (gitignored)
```

## Database

- **Prisma 7** with `prisma-client` generator + `prisma-adapter-sqlite`
- Tables created via raw SQL (`node:sqlite`), not Prisma migrate CLI
- 12 tables: Project, Chapter, ChapterHistory, Character, WorldBuilding, Location, Organization, Item, Foreshadowing, Timeline, AISettings, AIGeneration
- Seed script at `prisma/seed.ts` creates demo project "星穹之下"
- To reset: delete `prisma/dev.db`, run `node prisma/init-db.js`, then `npm run db:seed`

## Key Conventions

- **API keys**: Stored in `.env` or per-project in Settings page. Never hardcoded.
- **AI provider**: Unified OpenAI-compatible interface (`createProvider()`)
- **State**: Zustand stores in `src/store/`
- **Styling**: Tailwind CSS v4 + shadcn/ui (dark/light via next-themes)
- **API Routes**: App Router, all in `src/app/api/`
- **AI Context**: Editor auto-includes project description, worldView, writingReqs, character list, and world-building entries in AI prompts

## Asset Management

- Characters: name, identity, personality, goals, appearance, backstory — managed in settings page
- World Building: title, type, content — managed in settings page
- Foreshadowing: title, description, chapterHint, resolved status — managed in settings page
- All asset types are auto-included in AI context from the editor

## AI Generation History

- Every AI call from editor is saved to `AIGeneration` table
- Records: workflow type, model, provider, prompt, systemPrompt, output, temperature, maxTokens, timestamp
- History can be queried via `/api/ai/generations?projectId=xxx`
- Included in JSON project export

## Export

- `/api/export?projectId=xxx&format=md` — Markdown with all chapters
- `/api/export?projectId=xxx&format=txt` — Plain text
- `/api/export?projectId=xxx&format=json` — Full project backup including all relations

## Future Development Notes

- **Desktop**: All UI is layout-ready for Tauri/Electron wrap
- **EPUB/DOCX**: Export API has stub - implement with `epub-gen` / `docx` npm packages
- **Auth**: Not implemented (local-first)
- **Tests**: Not yet written
- **Timeline visualization**: Timeline table ready, UI pending

## Data Model

```
Project → Chapters → ChapterHistories
Project → Characters
Project → WorldBuildings
Project → Locations / Organizations / Items / Foreshadowings / Timelines
Project → AISettings (1:1)
Project → AIGenerations
```

## Tech Stack

- Next.js 16 + TypeScript + Turbopack
- Prisma 7 + SQLite (prisma-adapter-sqlite)
- Zustand 5
- shadcn/ui + Tailwind CSS v4
- OpenAI SDK (unified provider interface)
- next-themes (dark/light)
