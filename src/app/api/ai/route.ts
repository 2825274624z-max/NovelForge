import { NextResponse } from "next/server";
import { createProviderWithRetry, type AIProviderConfig } from "@/lib/ai/provider";
import { SYSTEM_PROMPTS } from "@/lib/ai/ai-service";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, model, baseUrl, apiKey, temperature, maxTokens, topP, frequencyPenalty, presencePenalty, reasoningEffort, workflow, message, context } = body;

    const config: AIProviderConfig = {
      provider: provider || "openai", model: model || "gpt-4o",
      baseUrl: baseUrl || "", apiKey: apiKey || "",
      temperature: temperature || 0.7, maxTokens: maxTokens || 8192,
      topP, frequencyPenalty, presencePenalty, reasoningEffort,
    };

    const ai = createProviderWithRetry(config, 1, 90000);
    const systemPrompt = SYSTEM_PROMPTS[workflow as string] || SYSTEM_PROMPTS.draft;
    const fullSystem = context ? `${systemPrompt}\n\n## 项目上下文\n${context}` : systemPrompt;

    const abortController = new AbortController();

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = ai.stream(
            { system: fullSystem, messages: [{ role: "user", content: message }] },
            abortController.signal
          );
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Stream error";
          controller.enqueue(encoder.encode(`\n\n[错误: ${msg}]`));
        } finally {
          controller.close();
        }
      },
      cancel() {
        abortController.abort();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    console.error("POST /api/ai error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI request failed" },
      { status: 500 }
    );
  }
}
