import { createProvider, type AIProviderConfig, type AIRequest, type AIResponse } from "./provider";

const SYSTEM_PROMPTS: Record<string, string> = {
  outline: `你是一位专业的文学创作顾问。根据用户提供的项目信息，生成一份详细的小说大纲。
大纲应包括：故事主线、主要情节节点、核心冲突、人物弧光、主题立意。
请用中文回复，结构清晰，分点论述。`,

  chapterOutline: `你是一位专业的文学创作顾问。根据已有的大纲和项目设定，将小说拆分为卷和章节。
每个章节应包含：章节标题、预计字数、核心情节、关键场景。
请用中文回复，保持结构清晰。`,

  draft: `你是一位优秀的小说写手。根据大纲和章节设定，撰写完整的章节正文。
要求：文学性强，描写细腻，对话自然，情节推进合理。
请用中文写作，注意节奏感和画面感。`,

  continue: `你是一位优秀的小说写手。请根据已有的章节内容，自然地续写下去。
要求：保持风格一致，衔接自然，情节连贯。
请用中文写作。`,

  polish: `你是一位资深的文学编辑。请对以下文本进行润色。
要求：保持原意和风格，优化表达，修正语病，提升文学性。
请用中文回复，只输出润色后的文本。`,

  expand: `你是一位资深的文学编辑。请对以下文本进行扩写。
要求：丰富细节，增加描写和对话，扩展情节，保持风格一致。
请用中文回复，只输出扩写后的文本。`,

  shorten: `你是一位资深的文学编辑。请对以下文本进行缩写。
要求：保留核心信息和风格，删减冗余，使表达更简洁有力。
请用中文回复，只输出缩写后的文本。`,

  rewrite: `你是一位资深的文学编辑。请根据用户要求的风格，对以下文本进行改写。
请用中文回复，只输出改写后的文本。`,

  consistency: `你是一位严谨的文学审稿人。请检查以下文本中是否存在：
1. 前后矛盾的情节
2. 人物设定不一致
3. 时间线错误
4. 世界观设定冲突
请列出每个问题及其位置，并给出修改建议。
请用中文回复。`,

  summary: `请对以下章节内容进行简洁的总结。
包括：主要事件、关键对话、重要伏笔。
请在100-200字内完成，用中文回复。`,

  nextPrompt: `你是一位资深的文学编辑。请根据已有章节，为下一章的写作生成详细的提示词。
包括：需要推进的情节、需要揭示的信息、需要注意的人物关系、建议的写作角度。
请用中文回复。`,
};

export type WorkflowType = keyof typeof SYSTEM_PROMPTS;

export async function aiChat(
  config: AIProviderConfig,
  workflow: WorkflowType,
  userMessage: string,
  extraContext?: string
): Promise<AIResponse> {
  const provider = createProvider(config);
  const systemPrompt = SYSTEM_PROMPTS[workflow] || SYSTEM_PROMPTS.draft;
  const fullSystem = extraContext
    ? `${systemPrompt}\n\n## 项目上下文\n${extraContext}`
    : systemPrompt;

  return provider.chat({
    system: fullSystem,
    messages: [{ role: "user", content: userMessage }],
  });
}

export async function* aiStream(
  config: AIProviderConfig,
  workflow: WorkflowType,
  userMessage: string,
  extraContext?: string
): AsyncGenerator<string, void, unknown> {
  const provider = createProvider(config);
  const systemPrompt = SYSTEM_PROMPTS[workflow] || SYSTEM_PROMPTS.draft;
  const fullSystem = extraContext
    ? `${systemPrompt}\n\n## 项目上下文\n${extraContext}`
    : systemPrompt;

  yield* provider.stream({
    system: fullSystem,
    messages: [{ role: "user", content: userMessage }],
  });
}

export { SYSTEM_PROMPTS };
export type { AIProviderConfig, AIRequest, AIResponse };
