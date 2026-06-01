// ==========================================
// AI Analyze Tests
// ==========================================

import { describe, it, expect, vi } from "vitest";

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
    const module = await import("@/lib/ai/analyze");
    expect(module.analyzeWithClaude).toBeDefined();
  });
});
