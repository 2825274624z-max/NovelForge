import { createProviderWithRetry, type AIProviderConfig, type AIResponse } from "./provider";

export const WORKFLOW_LABELS: Record<string, string> = {
  outline: "生成大纲",
  draft: "生成章节",
  continue: "续写",
  polish: "润色",
  expand: "扩写",
  shorten: "缩写",
  rewrite: "风格改写",
  consistency: "一致性检查",
  summary: "章节总结",
  nextChapter: "下一章建议",
  assetCard: "生成资产卡片",
};

export const WORKFLOW_LIST = Object.entries(WORKFLOW_LABELS).map(([value, label]) => ({ value, label }));

export const SYSTEM_PROMPTS: Record<string, string> = {
  outline: `你是一位资深的文学策划师。请根据提供的项目信息，生成一份完整的小说大纲。
大纲应包含：
1. 故事主线（一句话概括）
2. 三幕结构（开端-发展-高潮-结局）
3. 主要情节节点（至少6个关键转折点）
4. 核心冲突（内在冲突 + 外在冲突）
5. 人物弧光（主角的成长轨迹）
6. 主题立意
请用中文回复，结构清晰，分点论述。`,

  draft: `你是一位出版级的小说作家。请根据大纲和设定，撰写完整的章节正文。
写作要求：
- 文学性强，描写细腻生动
- 对话自然，符合角色性格
- 情节推进合理，节奏把控到位
- 每段至少200字，场景有画面感
- 注意细节的连贯性和伏笔的埋设
请用中文写作。`,

  continue: `你是一位出版级的小说作家。请根据已有内容自然地续写下去。
要求：
- 保持前文的写作风格和叙事语调
- 情节衔接自然，逻辑连贯
- 人物言行一致，符合既定性格
- 合理推进剧情，避免拖沓
请用中文写作。`,

  polish: `你是一位资深的文学编辑。请对以下文本进行润色。
要求：
- 保持原意和写作风格不变
- 优化表达，提升文学性
- 修正语病、重复用词、不通顺句
- 只输出润色后的文本，不要添加说明
请用中文回复。`,

  expand: `你是一位资深的文学编辑。请对以下文本进行扩写。
要求：
- 丰富场景描写和感官细节
- 增加人物心理活动和对话
- 扩展情节，增加戏剧张力
- 保持原有的写作风格
- 只输出扩写后的文本
请用中文回复。`,

  shorten: `你是一位资深的文学编辑。请对以下文本进行缩写。
要求：
- 保留核心情节和关键信息
- 删减冗余描述和重复表达
- 使行文更简洁有力
- 保持原有的风格和语调
- 只输出缩写后的文本
请用中文回复。`,

  rewrite: `你是一位资深的文学编辑。请根据指定的风格要求，对以下文本进行改写。
要求：
- 完全改变为指定的写作风格
- 保留核心情节和人物关系
- 调整叙事视角、语言风格、节奏
- 只输出改写后的文本
请用中文回复。`,

  consistency: `你是一位严谨的文学审稿人。请对以下文本进行全面的一致性检查。
检查项目：
1. 情节矛盾 — 是否存在前后不一致的剧情
2. 人物设定 — 人物性格、能力、关系是否前后统一
3. 时间线 — 时间标注和事件顺序是否正确
4. 世界观 — 设定是否前后冲突
5. 细节错误 — 人名、地名、物品等是否一致
请对每个问题标注具体位置并给出修改建议。
请用中文回复。`,

  summary: `请对以下章节内容进行简洁的总结。
包括：
- 本章主要事件（2-3句）
- 关键对话或转折
- 重要的伏笔或线索
- 人物关系变化
请在150-250字内完成，用中文回复。`,

  nextChapter: `你是一位资深的文学策划师。请根据已有章节内容，为下一章生成详细的写作建议。
包含：
1. 需要推进的情节线
2. 需要揭示的信息或伏笔
3. 需要注意的人物关系和互动
4. 建议的写作角度和切入点
5. 可能的章节结构和节奏安排
请用中文回复。`,

  assetCard: `你是一位专业的文学设定整理师。请根据提供的章节内容，提取并整理成结构化的资产卡片。

你需要分析文本并输出以下内容（使用 JSON 格式）：

【角色】- 提取所有出场或提及的角色：
name(姓名)、identity(身份)、personality(性格)、goals(目标)、relationships(关系)、appearance(外貌)、backstory(背景)

【世界观条目】- 提取世界设定相关：
title(名称)、type(类型：规则/历史/势力/限制)、content(详细描述)

【地点】- 提取场景地点：
name(名称)、type(类型)、description(描述)

【物品/能力】- 提取特殊物品或能力：
name(名称)、type(类型)、effect(效果)、description(描述)

【伏笔】- 提取可能被埋设的伏笔：
title(标题)、description(说明)、chapterHint(所在章节提示)

输出严格 JSON 格式，不包含任何额外说明文字：
{"characters":[{"name":"","identity":"","personality":"","goals":"","relationships":"","appearance":"","backstory":""}],"worldItems":[{"title":"","type":"","content":""}],"locations":[{"name":"","type":"","description":""}],"items":[{"name":"","type":"","effect":"","description":""}],"foreshadowings":[{"title":"","description":"","chapterHint":""}]}

没有提取到的类型返回空数组。只输出 JSON，不要有其他任何文字。`,
};

export type WorkflowType = keyof typeof SYSTEM_PROMPTS;

export async function aiChat(
  config: AIProviderConfig,
  workflow: WorkflowType,
  userMessage: string,
  extraContext?: string,
  signal?: AbortSignal
): Promise<AIResponse> {
  const provider = createProviderWithRetry(config);
  const systemPrompt = SYSTEM_PROMPTS[workflow] || SYSTEM_PROMPTS.draft;
  const fullSystem = extraContext
    ? `${systemPrompt}\n\n## 项目上下文\n${extraContext}`
    : systemPrompt;

  return provider.chat(
    { system: fullSystem, messages: [{ role: "user", content: userMessage }] },
    signal
  );
}

export async function* aiStream(
  config: AIProviderConfig,
  workflow: WorkflowType,
  userMessage: string,
  extraContext?: string,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const provider = createProviderWithRetry(config);
  const systemPrompt = SYSTEM_PROMPTS[workflow] || SYSTEM_PROMPTS.draft;
  const fullSystem = extraContext
    ? `${systemPrompt}\n\n## 项目上下文\n${extraContext}`
    : systemPrompt;

  yield* provider.stream(
    { system: fullSystem, messages: [{ role: "user", content: userMessage }] },
    signal
  );
}
