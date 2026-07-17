// @vitest-environment node
// ==========================================
// AI Analyze Tests
// ==========================================

import { describe, expect, it, vi } from "vitest";

// We need to mock before importing the module
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    constructor() {}
  },
}));

vi.mock("@/lib/ai/prompts", () => ({
  buildAnalysisPrompt: vi.fn().mockReturnValue("mock prompt"),
}));

describe("ai analyze", () => {
  it("should export analyzeWithClaude function", async () => {
    const mod = await import("@/lib/ai/analyze");
    expect(mod.analyzeWithClaude).toBeDefined();
  });
});
