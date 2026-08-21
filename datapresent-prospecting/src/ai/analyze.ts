import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { packageRoot } from "../store.js";
import { groqChat, parseLlmJson } from "./groq.js";

export { parseLlmJson } from "./groq.js";

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

/** Appelle Groq (LLaMA) pour un prompt, retourne le texte. */
export async function callGroq(prompt: string, maxTokens = 4096): Promise<string> {
  const { text } = await groqChat("", prompt, { maxTokens });
  return text;
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
  const raw = await callGroq(prompt);
  return AnalysisSchema.parse(parseLlmJson(raw));
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
  const raw = await callGroq(prompt, 2048);
  return EmailSchema.parse(parseLlmJson(raw));
}
