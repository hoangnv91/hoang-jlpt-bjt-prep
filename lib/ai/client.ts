import { ApiError } from "@/lib/errors";

const BASE_URL = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
const MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";
const TIMEOUT_MS = 90_000;

export function aiConfigured(): boolean {
  return !!process.env.AI_API_KEY;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  if (!aiConfigured()) {
    throw new ApiError(503, "AI_UNAVAILABLE", "AI provider is not configured (AI_API_KEY missing)");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 3200,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new ApiError(504, aborted ? "AI_TIMEOUT" : "AI_UNAVAILABLE", "AI request failed");
  }
  clearTimeout(timer);

  if (!res.ok) {
    if (res.status === 429) {
      throw new ApiError(429, "AI_BUDGET_EXCEEDED", "AI rate limit or budget exceeded");
    }
    throw new ApiError(502, "AI_UNAVAILABLE", `AI provider returned ${res.status}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new ApiError(502, "AI_UNAVAILABLE", "AI provider returned an unexpected response");
  }
  return content;
}

export { MODEL };