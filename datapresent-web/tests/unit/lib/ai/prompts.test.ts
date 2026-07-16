// @vitest-environment node
// ==========================================
// AI Prompts Tests
// ==========================================

import { describe, expect, it } from "vitest";

describe("ai prompts", () => {
  it("should export buildAnalysisPrompt function", async () => {
    const mod = await import("@/lib/ai/prompts");
    expect(mod.buildAnalysisPrompt).toBeDefined();
  });

  it("should build prompt with all required parameters", async () => {
    const { buildAnalysisPrompt } = await import("@/lib/ai/prompts");

    const prompt = buildAnalysisPrompt({
      dataJson: JSON.stringify([{ value: 100 }]),
      sector: "FINANCE",
      slideCount: 5,
      language: "fr",
    });

    expect(prompt).toContain("FINANCE");
    expect(prompt).toContain("5 slides");
    expect(prompt).toContain("French");
    expect(prompt).toContain("STRICT JSON");
    expect(prompt).toContain("revenue, margins, cash flow");
  });

  it("should include MARKETING sector context", async () => {
    const { buildAnalysisPrompt } = await import("@/lib/ai/prompts");

    const prompt = buildAnalysisPrompt({
      dataJson: "[]",
      sector: "MARKETING",
      slideCount: 3,
      language: "en",
    });

    expect(prompt).toContain("CAC, conversion rates");
  });
});
