/**
 * Client Groq minimal (fetch direct, sans SDK) — pattern motivygo-prospecting.
 * Utilise GROQ_API_KEY (env). Retry : 3 tentatives avec backoff exponentiel.
 */

import { env } from "../env.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export interface GroqChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqResult {
  text: string;
  model: string;
}

function getGroqApiKey(): string {
  if (!env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is required for AI stages (analyze/generate)");
  }
  return env.GROQ_API_KEY;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Appelle Groq avec un système + un prompt utilisateur, retourne le texte.
 * Retry : 3 tentatives avec backoff exponentiel (429/5xx et erreurs réseau).
 */
export async function groqChat(
  systemPrompt: string,
  userPrompt: string,
  opts: { model?: string; temperature?: number; maxTokens?: number } = {},
): Promise<GroqResult> {
  const apiKey = getGroqApiKey();
  const { model = DEFAULT_MODEL, temperature = 0.4, maxTokens = 2000 } = opts;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        lastError = new Error(`Groq HTTP ${response.status}: ${body.slice(0, 300)}`);
        if (response.status === 429 || response.status >= 500) {
          await sleep(2000 * attempt);
          continue;
        }
        throw lastError;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (!text) throw new Error("Groq returned empty content");
      return { text, model };
    } catch (err) {
      lastError = err;
      if (attempt < 3) await sleep(1500 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Groq call failed");
}

/**
 * Extrait le JSON d'une réponse LLM : enlève les fences ```json, la prose
 * autour (tronque au premier "{" / dernier "}") et les virgules traînantes.
 */
export function parseLlmJson<T>(raw: string): T {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1"); // virgules traînantes
  return JSON.parse(cleaned) as T;
}

/** Demande un JSON valide à Groq et le parse (température basse). */
export async function groqJson<T>(
  systemPrompt: string,
  userPrompt: string,
  opts: { model?: string; temperature?: number; maxTokens?: number } = {},
): Promise<T> {
  const { text } = await groqChat(systemPrompt, userPrompt, {
    ...opts,
    temperature: opts.temperature ?? 0.1,
  });
  return parseLlmJson<T>(text);
}
