# AI Novel Agent &mdash; 智能小说工作台

AI 驱动的智能小说创作工具。功能完整、UI 精美、可本地运行、易扩展多家 AI API。

## 技术栈

- **框架**: Next.js 16 + TypeScript + Turbopack
- **样式**: Tailwind CSS v4 + shadcn/ui
- **数据库**: Prisma 7 + SQLite（本地优先，无需外部数据库）
- **状态管理**: Zustand 5
- **AI 接口**: OpenAI SDK（兼容所有 OpenAI-compatible Provider）
- **主题**: next-themes（暗色/亮色）

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库（创建表结构）
node prisma/init-db.js

# 3. 填充演示数据（可选）
npm run db:seed

# 4. 启动开发服务器
npm run dev
```

打开浏览器访问 **http://localhost:3000**

## 配置 AI Provider

### 方式一：环境变量（全局）

复制 `.env.example` 为 `.env`，填入你的 API Key：

```env
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
DEEPSEEK_API_KEY=sk-xxx
```

### 方式二：项目设置页（单个作品）

进入作品 → 设置 → AI 模型配置，可针对每个作品独立配置：

| Provider | 说明 |
|----------|------|
| OpenAI | GPT-4o / GPT-4o-mini |
| Anthropic | Claude Sonnet 4.6 / Opus 4.7 |
| Gemini | Gemini 2.0 Flash / Pro |
| DeepSeek | DeepSeek Chat |
| OpenRouter | 聚合多个模型 |
| Ollama | 本地模型，无需 API Key |

支持**测试连接**按钮，配置后一键验证 API 连通性。

所有 API 设置仅存储在本地数据库，**不会提交到 Git**。

## 功能

### 小说项目管理
- 创建/编辑/删除作品
- 作品信息：标题、类型、风格、目标字数、简介、世界观、写作要求

### 编辑器（三栏布局）
- **左侧**：章节导航列表（新建、切换、删除，显示字数）
- **中间**：正文编辑器（自动保存、字数统计）
- **右侧**：AI 助手面板

### AI 写作工作流
| 功能 | 说明 |
|------|------|
| 生成大纲 | 根据项目设定生成故事大纲 |
| 生成草稿 | 根据大纲或设定生成章节正文 |
| 续写 | 从当前位置继续写作 |
| 润色 | 优化表达、修正语病 |
| 扩写 | 丰富细节和描写 |
| 缩写 | 精简冗余表达 |
| 总结章节 | 自动总结章节内容 |

AI 上下文自动包含：项目简介、世界观、写作要求、角色列表、世界观条目。

### 资产库
| 模块 | 功能 |
|------|------|
| 角色管理 | 名称、身份、性格、目标、外貌、背景故事 |
| 世界观 | 类型分类、详细内容描述 |
| 伏笔 | 追踪伏笔、关联章节、回收状态 |

### AI 生成历史
- 自动记录每次 AI 生成的 prompt、模型、输出、时间
- 可在 JSON 项目备份中查看完整历史

### 版本历史
- 每次编辑自动保存历史版本
- 支持查看和恢复旧版本（API 就绪）

### 导出
- Markdown（含章节正文）
- TXT（纯文本）
- JSON 项目备份（完整包含角色、世界观、伏笔、AI 历史）

### AI 测试连接
- 设置页一键测试 API 连通性

### UI 特性
- 暗色/亮色主题切换
- 响应式布局
- 空状态、加载态、错误态完整覆盖
- Toast 通知（sonner）
- 现代 SaaS 风格

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── ai/               # AI streaming endpoint
│   │   │   ├── generations/  # AI 生成历史
│   │   │   ├── settings/     # AI provider settings
│   │   │   └── test/         # 测试连接
│   │   ├── chapters/         # Chapter CRUD + history
│   │   ├── characters/       # 角色 CRUD
│   │   ├── export/           # MD/TXT/JSON export
│   │   ├── foreshadowings/   # 伏笔 CRUD
│   │   ├── projects/         # Project CRUD
│   │   └── world-building/   # 世界观 CRUD
│   ├── projects/             # Dashboard page
│   └── projects/[id]/
│       ├── editor/           # Three-panel editor
│       └── settings/         # Settings + AI config + 资产管理
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── project-card.tsx      # Project card widget
│   └── theme-toggle.tsx      # Dark/light toggle
├── lib/
│   ├── ai/
│   │   ├── provider.ts       # Unified AI provider (OpenAI-compatible)
│   │   └── ai-service.ts     # Workflow prompts + chat/stream
│   ├── db.ts                 # PrismaClient singleton (adapter)
│   ├── word-count.ts         # Chinese + English word counter
│   └── theme-provider.tsx    # next-themes provider
├── store/
│   └── useStore.ts           # Zustand: project, editor, AI stores
└── generated/prisma/         # Generated Prisma client (gitignored)
```

## 开发

```bash
# 数据库管理
node prisma/init-db.js  # 初始化/重置数据库
npm run db:seed          # 填充演示数据

# 构建
npm run build            # 生产构建 + 类型检查
npm run lint             # ESLint

# 桌面化预留
# UI 已为 Tauri/Electron 封装做好准备
```

## 路线图

- [ ] 角色卡管理界面增强
- [ ] 时间线可视化
- [ ] EPUB/DOCX 导出
- [ ] 全屏专注模式
- [ ] 云端同步
- [ ] 多人协作
- [ ] 桌面应用（Tauri）

## 许可

MIT
