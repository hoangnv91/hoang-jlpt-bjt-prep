import { ApiError } from "@/lib/errors";

// Normalize the base URL: strip trailing slashes so `${BASE_URL}/chat/completions`
// never produces a doubled slash. AI_BASE_URL must include the provider's API
// prefix, e.g. https://api.openai.com/v1, https://api.groq.com/openai/v1, or
// https://generativelanguage.googleapis.com/v1beta/openai/.
const BASE_URL = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
const MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";
const TIMEOUT_MS = 90_000;
const MAX_RETRIES = Number(process.env.AI_MAX_RETRIES ?? "3");
const RETRY_BASE_DELAY_MS = Number(process.env.AI_RETRY_DELAY_MS ?? "2000");

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

  const url = `${BASE_URL}/chat/completions`;
  const body = JSON.stringify({
    model: MODEL,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 3200,
    response_format: { type: "json_object" },
  });

  let lastError: ApiError | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AI_API_KEY}`,
        },
        body,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const aborted = err instanceof Error && err.name === "AbortError";
      console.error(
        `[ai] request failed url=${url} model=${MODEL}: ${err instanceof Error ? err.message : String(err)}`
      );
      throw new ApiError(504, aborted ? "AI_TIMEOUT" : "AI_UNAVAILABLE", "AI request failed");
    }
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new ApiError(502, "AI_UNAVAILABLE", "AI provider returned an unexpected response");
      }
      return content;
    }

    const detail = await res.text().catch(() => "");
    const retryable = res.status === 429 || res.status === 500 || res.status === 502 || res.status === 503;
    if (!retryable || attempt === MAX_RETRIES) {
      console.error(
        `[ai] provider error url=${url} model=${MODEL} status=${res.status} body=${detail.slice(0, 400)}`
      );
      if (res.status === 429) {
        throw new ApiError(429, "AI_BUDGET_EXCEEDED", "AI rate limit or budget exceeded");
      }
      throw new ApiError(502, "AI_UNAVAILABLE", `AI provider returned ${res.status}`);
    }

    // Respect Retry-After when the provider supplies one; otherwise back off.
    const retryAfter = Number(res.headers.get("retry-after"));
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : RETRY_BASE_DELAY_MS * 2 ** attempt;
    console.warn(
      `[ai] provider ${res.status} (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delayMs}ms: ${detail.slice(0, 200)}`
    );
    await new Promise((r) => setTimeout(r, delayMs));
  }

  throw lastError ?? new ApiError(502, "AI_UNAVAILABLE", "AI provider returned an unexpected response");
}

export { MODEL };