# NovelForge — AI 长篇小说写作引擎

AI 驱动的长篇小说创作工具。分层上下文记忆、6 家 AI 提供商、可打包为 Windows 桌面应用本地运行。

## 技术栈

- **框架**: Next.js 16 + TypeScript + Turbopack
- **编辑器**: TipTap 富文本 (StarterKit + Placeholder)
- **样式**: Tailwind CSS v4 + shadcn/ui
- **数据库**: Prisma 7 + SQLite (node:sqlite，零依赖)
- **状态**: Zustand 5 + TanStack React Query
- **AI**: OpenAI SDK 兼容 6 家提供商
- **桌面**: Electron 42 + electron-builder

## 快速开始

```bash
npm install
npm run db:init
npm run dev          # http://localhost:3000
```

可选:
```bash
npm run db:seed      # 填充演示项目
```

## Electron 桌面版

```bash
npm run electron:dev           # 开发模式
npm run electron:build:win     # 构建 Windows 版
```

产物: `release/NovelForge-0.5.0-win.zip` (约 211 MB)

## AI 配置

### 项目级 (推荐)

进入作品 → 设置 → AI 模型，可配置:

| Provider | 默认模型 |
|----------|---------|
| DeepSeek | deepseek-v4-flash |
| OpenAI | gpt-4o |
| Anthropic | claude-sonnet-4-5 |
| Gemini | gemini-2.5-flash |
| OpenRouter | anthropic/claude-sonnet-4-5 |
| Ollama | llama3.2 |

支持高级参数: Top P / 频率惩罚 / 存在惩罚 / 推理强度 (DeepSeek V4 reasoning_effort)

### 全局配置文件

`novelforge.config.example.json` → 复制为 `novelforge.config.json`:

```json
{
  "ai": { "defaultProvider": "deepseek", "providers": { ... } },
  "editor": { "fontSize": 16, "lineHeight": 1.9 },
  "ui": { "defaultTheme": "dark" }
}
```

### 环境变量

```env
DEEPSEEK_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx
```

## 核心功能

### 三栏写作工作台

```
┌ 顶栏: ← | 书名 | 字数/目标 | 统计 | 一致性检查 | 导出 | 设置 | 主题 ┐
├──────────┬──────────────────────────┬────────────────────────────┤
│ 侧边栏   │  编辑器                   │  AI 面板                   │
│ 章节列表 │  TipTap 富文本            │  6 种创作工作流            │
│ 📝 摘要  │  Georgia 衬线字体         │  提示词输入                │
│ 资产库   │  1.9 行高                │  高级选项 (上下文预览)     │
│ 大纲入口 │  自动保存 + 智能续写      │  [生成] [取消]             │
│          │  Ctrl+S/N/A 快捷键       │  流式输出 [插入/替换/重试] │
└──────────┴──────────────────────────┴────────────────────────────┘
```

### 6 种 AI 工作流

| 类型 | 工作流 | 使用方式 |
|------|--------|---------|
| 创作 | 生成章节 | 输入大纲 → AI 生成 |
| 创作 | 续写 | 光标定位 → 续写 |
| 编辑 | 润色 | **选中文字** → 优化 |
| 编辑 | 扩写 | **选中文字** → 丰富 |
| 编辑 | 缩写 | **选中文字** → 精简 |
| 编辑 | 重写 | **选中/全文** → 重写 |

- 创作类: 结果插入光标处
- 编辑类: 结果替换选中区域

### 分层上下文记忆

写新章节时自动注入:

```
近 3 章全文 → 历史摘要 (最多 30 条) → 弧线概括 (每 10 章) → 活跃伏笔 → 资产库
```

- 章节保存后**自动生成摘要**供 AI 后续使用
- 高级选项中可预览上下文内容和 token 估算

### 大纲 Sheet

侧边栏入口 → 独立大纲面板，支持 AI 生成 + 手动编辑 + 保存

### 资产库 (7 类)

角色卡 / 世界观 / 地点 / 组织 / 物品/能力 / 伏笔 / 时间线

### 智能续写

编辑器输入暂停 1.5s → AI 生成续写建议浮层 → Tab 采纳 / Esc 忽略

### 写作统计

热力图 + KPI (连续写作/最佳纪录/日均字数/写作天数)

### 导出

```
/api/export?projectId=xxx&format=md   → Markdown
/api/export?projectId=xxx&format=txt  → 纯文本
/api/export?projectId=xxx&format=json → 完整备份
```

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+S | 保存 |
| Ctrl+N | 新建章节 |
| Ctrl+Shift+A | 切换 AI 面板 |
| Tab | 采纳续写建议 |
| Esc | 忽略续写建议 / 退出专注模式 |

## 项目结构

```
src/
├── app/api/          # 16 个 API 路由
├── app/projects/     # 作品列表 + 工作台
├── components/       # UI 组件 + TipTap 编辑器
├── hooks/            # useAIGeneration / useAutoSave / useKeyboardShortcuts
├── lib/              # AI provider / db / queries / config / token-count
├── store/            # Zustand
prisma/               # schema + init-db + seed
electron/             # Electron 桌面壳
yuagent.config.example.json  # 用户配置模板
```

## 数据库

16 张表: Project / Chapter / ChapterHistory / Character / WorldBuilding / Location / Organization / Item / Foreshadowing / Timeline / AISettings / AIGeneration / DailyWritingLog

## License

MIT
