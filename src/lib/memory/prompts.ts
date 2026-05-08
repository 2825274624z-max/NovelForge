// ─── 记忆提取 / 一致性校验 统一 Prompt 模板 ───

/** 写完一章后提取结构化记忆 */
export const EXTRACT_PROMPT = `你是一位专业的文学分析助手。请分析以下小说章节内容，提取结构化信息。

请严格返回 JSON 格式（不要 markdown 代码块，只输出纯 JSON）：

{
  "characterStates": [
    {"characterId": "角色在资产库中的名字", "location": "本章结束时所在地点", "goal": "当前目标", "emotion": "情绪状态", "relationships": "本章关系变化（如'与张三决裂'）"}
  ],
  "plotThreads": [
    {"name": "剧情线名称", "description": "简短描述", "status": "open|ongoing|resolved", "type": "new|continue|resolve|drop", "priority": 1-5}
  ],
  "timelineEvents": [
    {"eventDesc": "事件描述", "storyTime": "故事内时间标记（如'第三天傍晚'）", "characterIds": ["角色名1","角色名2"]}
  ],
  "chekhovGuns": [
    {"description": "伏笔/契诃夫之枪描述", "type": "planted|paid_off"}
  ],
  "contradictions": [
    {"type": "角色|设定|时间线|剧情", "description": "本章内部的矛盾或不一致之处"}
  ]
}

注意：
- 没有的字段返回空数组 []
- characterId/characterIds 使用角色资产库中的名字
- storyTime 尽量从文中推断明确的时间标记
- contradictions 只列出本章内部可确认的矛盾，不与其他章节比对

章节内容：`;

/** 写完一章后检查与已有记忆的一致性 */
export const CONSISTENCY_PROMPT = `你是一位严谨的文学审稿人。请检查以下新写章节是否与已有记忆库存在矛盾。

已有记忆：
{memoryContext}

新章节内容：
{chapterContent}

逐项检查：
1. 角色状态 — 角色的位置、目标、情绪是否与之前的状态连续
2. 时间线 — 故事时间是否与之前的事件顺序一致
3. 剧情线 — 剧情线状态变化是否合理
4. 设定一致性 — 世界观设定是否前后冲突
5. 伏笔 — 新埋的伏笔是否与已揭示的信息矛盾

返回 JSON：
{
  "pass": true/false,
  "issues": [
    {"type": "角色|时间线|剧情|设定|伏笔", "severity": "high|medium|low", "detail": "具体描述", "suggestion": "修改建议"}
  ]
}

只输出 JSON，不要有其他文字。`;

/** 根据已写内容调整大纲 */
export const ADJUST_OUTLINE_PROMPT = `你是一位资深的文学策划师。请根据当前写作进度，评估并调整后续大纲。

当前大纲：
{currentOutline}

已写章节摘要：
{chapterSummaries}

剧情线状态：
{plotThreadStatus}

请分析：
1. 节奏 — 当前进度是快了还是慢了
2. 剧情线 — 哪些线推进不足，哪些过于密集
3. 字数 — 是否需要调整后续章节目标字数
4. 调整建议 — 后续大纲需要修改的地方

返回 JSON：
{
  "pace": "on_track|too_fast|too_slow",
  "paceNote": "节奏分析说明",
  "plotBalance": [{"name": "剧情线名", "status": "adequate|neglected|overdone", "suggestion": "建议"}],
  "outlineAdjustments": [{"volumeOrder": 卷序号, "chapterTitle": "章节标题", "change": "修改建议"}],
  "nextChapterTarget": {"wordTarget": 建议字数, "focus": "写作重点"}
}

只输出 JSON。`;

/** 生成下一章写作简报 */
export const CHAPTER_BRIEF_PROMPT = `你是一位资深的文学策划师。请为下一章生成详细的写作指引。

故事大纲：
{outline}

当前进度：
{currentProgress}

角色最新状态：
{characterStates}

活跃剧情线：
{plotThreads}

待回收伏笔：
{chekhovGuns}

请生成：
1. 本章目标（基于大纲的预期进展）
2. 需要推进的剧情线（1-3条）
3. 需要揭示/回收的伏笔
4. 建议出场角色
5. 情绪/氛围基调
6. 建议的章节结构（开头-中段-结尾）
7. 注意事项（避免与已有内容矛盾）

请用中文回复，结构清晰，500字以内。`;
