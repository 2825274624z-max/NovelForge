# NovelForge — AI 长篇小说写作引擎

AI 驱动的长篇小说创作工具。智能上下文调度、结构化记忆系统、6 家 AI 提供商、可打包为 Windows 桌面应用本地运行。

## 技术栈

- **框架**: Next.js 16 + TypeScript + Turbopack
- **编辑器**: TipTap 富文本 (StarterKit + Placeholder)
- **样式**: Tailwind CSS v4 + shadcn/ui
- **数据库**: Prisma 7 + SQLite (node:sqlite)
- **状态**: Zustand 5 + TanStack React Query
- **AI**: OpenAI SDK 兼容 6 家提供商
- **桌面**: Electron 42 + electron-builder

## 快速开始

```bash
npm install
npm run db:init
npm run dev          # http://localhost:3000
npm run db:seed      # 可选：填充演示项目
```

## Electron 桌面版

```bash
npm run electron:dev           # 开发模式
npm run electron:build:win     # 构建 Windows 版
```

产物: `release/NovelForge-0.6.0-win.zip`

## AI 配置

### 全局设置（推荐）

点击顶栏 **AI 设置**按钮，配置一次全局生效。支持 6 家提供商：

| Provider | 默认模型 |
|----------|---------|
| DeepSeek | deepseek-v4-flash |
| OpenAI | gpt-4o |
| Anthropic | claude-sonnet-4-5 |
| Gemini | gemini-2.5-flash |
| OpenRouter | anthropic/claude-sonnet-4-5 |
| Ollama | llama3.2 |

高级参数: Top P / 频率惩罚 / 存在惩罚 / 推理强度 (DeepSeek V4 reasoning_effort)

### 配置文件

`novelforge.config.example.json` → 复制为 `novelforge.config.json` 自定义默认值。

### 环境变量

```env
DEEPSEEK_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx
```

## 核心功能

### 智能上下文调度 (Context Builder v4)

每次 AI 写作时自动组装上下文，按章节目标选择性注入：

```
小说 Bible（精简设定 ≤2000字）
→ 当前卷/Arc 目标
→ 章节任务卡（结构化约束）
→ 上一章结尾原文（语气连续性）
→ 人物状态（从 stateJson 历史聚合）
→ 活跃伏笔（全部）
→ 近期 3 章摘要
→ 前文关键事实（结构化提取）
→ 世界资产
→ 风格要求
```

### 8 种 AI 工作流

| 类型 | 工作流 | 说明 |
|------|--------|------|
| 创作 | 生成章节 | 智能上下文 + 任务卡约束，自动注入写作技法 |
| 创作 | 续写 | 章内续写，带全章原文保持连贯 |
| 编辑 | 润色 | 白描技法 + AI 痕迹清除 + 句式优化 |
| 编辑 | 扩写 | 感官细节 + 信息差利用 + 蒙太奇 |
| 编辑 | 缩写 | 保留核心 + 伏笔不丢 |
| 编辑 | 重写 | 风格转换 + 预期反转 |
| 编辑 | 去AI味 | 8 项清除清单，消除机械痕迹 |
| 分析 | 质量审查 | 8 维度评分 /80，逐项评语 |

### 结构化记忆系统

每章保存后自动执行（后台并行）：

- **摘要生成** — AI 自动生成章节摘要
- **状态提取** — 结构化 JSON：新事实/人物变化/伏笔推进/物品/地点
- **连续性检查** — 一致性审查，结果存入章节备注

### 章节任务卡

写新章节前可选生成任务卡，约束 AI 输出：

```
核心目标 → 情节点 → 出场人物 → 情绪弧线
→ 伏笔推进/回收 → 禁止揭示 → 场景建议
```

### 小说 Bible

一键生成精简设定参考（≤800字），每次写作自动携带。

### Volumes 卷/Arc 管理

将长篇小说拆分为卷，每卷设定独立目标。有卷时大纲自动精简，AI 聚焦当前阶段。

### TXT 导入

拖入 .txt 文件 → 自动识别书名/作者/章节边界 → 直接进入编辑。
支持格式: `第X章` / `Chapter X` / `序章` / `楔子` / `番外` 等。

### 资产库 (7 类 + 自定义字段)

全屏工作台，三栏布局：搜索列表 + 卡片网格 + 编辑面板。
每张卡片支持添加自定义 key-value 字段。

- 角色卡 / 世界观 / 地点 / 组织 / 物品/能力 / 伏笔 / 时间线
- AI 批量提取（分批处理，全章覆盖，自动去重）

### 全屏大纲编辑器

双模式：结构视图（章节树 + 大纲预览）+ 编辑模式。
点击章节可跳转编辑。

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
| Ctrl+Enter | 触发 AI 生成 |
| Ctrl+Shift+A | 切换 AI 面板 |
| Tab | 采纳续写建议 |
| Esc | 忽略续写建议 / 退出专注模式 |

## 项目结构

```
src/
├── app/api/          # 20+ API 路由
├── app/projects/     # 作品列表 + 工作台
├── components/       # UI 组件 + TipTap 编辑器 + 全局设置
├── hooks/            # useAIGeneration / useAutoSave / useKeyboardShortcuts
├── lib/
│   ├── ai/           # AI provider (6家) + ai-service (12 工作流) + context-builder
│   ├── db.ts         # PrismaClient 单例
│   ├── config.ts     # 用户配置文件加载
│   ├── queries.ts    # React Query hooks
│   ├── txt-parser.ts # TXT 小说导入解析器
│   └── ...
├── store/            # Zustand (editor + AI config)
prisma/               # schema + init-db + seed
electron/             # Electron 桌面壳
```

## 数据库

20 张表: Project / Chapter / ChapterHistory / ChapterOutline / Character / WorldBuilding / Location / Organization / Item / Foreshadowing / Timeline / AISettings / AIGeneration / DailyWritingLog / Volume / StoryArc / PlotThread / CharacterState / TimelineEvent / ChekhovGun

## License

MIT
