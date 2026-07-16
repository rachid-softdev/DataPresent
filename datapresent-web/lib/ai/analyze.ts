import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";
import { buildAnalysisPrompt } from "./prompts";
import { AnalysisResponse, AnalysisResponseSchema } from "./schemas";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function analyzeWithClaude(params: {
  dataJson: string;
  sector: string;
  slideCount: number;
  language: "fr" | "en";
}): Promise<AnalysisResponse> {
  const prompt = buildAnalysisPrompt(params);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content[0];
  if (!textContent || textContent.type !== "text") {
    throw new Error("Invalid response from Claude");
  }

  const jsonStr = textContent.text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return AnalysisResponseSchema.parse(parsed);
  } catch (error) {
    logger.error("Failed to parse Claude response", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("Invalid JSON response from Claude");
  }
}
