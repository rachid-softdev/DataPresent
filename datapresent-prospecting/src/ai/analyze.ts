import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../env.js";
import { packageRoot } from "../store.js";

let anthropic: Anthropic | null = null;

function client(): Anthropic {
  if (!anthropic) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for AI stages (analyze/generate)");
    }
    anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

export const AnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  fitsIcp: z.boolean(),
  language: z.enum(["fr", "en"]),
  sector: z.string(),
  needs: z.array(z.string()).max(3),
  suggestedAngle: z.string(),
  reasoning: z.string(),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

export const EmailSchema = z.object({
  subject: z.string().min(1).max(80),
  body: z.string().min(1),
});

export type GeneratedEmail = z.infer<typeof EmailSchema>;

/** Remplace les placeholders {key} d'un prompt par des valeurs (inconnus conservés). */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}

async function loadPrompt(name: string): Promise<string> {
  return readFile(join(packageRoot(), "config", "prompts", name), "utf-8");
}

/**
 * Extrait le JSON d'une réponse Claude : gère les fences markdown ET la
 * prose autour (tronque au premier "{" / dernier "}").
 */
export function parseClaudeJson<T>(raw: string): T {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error(`No JSON object found in Claude response: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

export async function callClaude(prompt: string, maxTokens = 4096): Promise<string> {
  const response = await client().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const textContent = response.content[0];
  if (!textContent || textContent.type !== "text") {
    throw new Error("Invalid response from Claude");
  }
  return textContent.text;
}

/**
 * Qualifie un prospect : score 0-100, adéquation ICP, langue détectée,
 * besoins probables, angle de pitch. Validation zod stricte.
 */
export async function analyzeProspect(params: {
  company: string;
  website?: string;
  country?: string;
  sectorGuess?: string;
  email?: string;
  websiteContent: string;
}): Promise<Analysis> {
  const template = await loadPrompt("prospect-analysis.md");
  const prompt = fillTemplate(template, {
    company: "DataPresent",
    offer: "SaaS transformant les fichiers de données en présentations IA",
    website: params.website ?? "",
    country: params.country ?? "",
    sectorGuess: params.sectorGuess ?? "",
    email: params.email ?? "",
    websiteContent: params.websiteContent,
  });
  const raw = await callClaude(prompt);
  return AnalysisSchema.parse(parseClaudeJson(raw));
}

/** Rédige un email personnalisé pour un prospect qualifié. */
export async function writeEmail(params: {
  language: "fr" | "en";
  prospectCompany: string;
  sector: string;
  country?: string;
  decisionMaker?: string;
  email: string;
  score: number;
  needs: string[];
  suggestedAngle: string;
}): Promise<GeneratedEmail> {
  const template = await loadPrompt("email-writer.md");
  const prompt = fillTemplate(template, {
    company: "DataPresent",
    language: params.language,
    prospectCompany: params.prospectCompany,
    sector: params.sector,
    country: params.country ?? "",
    decisionMaker: params.decisionMaker ?? "there",
    email: params.email,
    score: String(params.score),
    needs: params.needs.join(", "),
    suggestedAngle: params.suggestedAngle,
  });
  const raw = await callClaude(prompt, 2048);
  return EmailSchema.parse(parseClaudeJson(raw));
}
