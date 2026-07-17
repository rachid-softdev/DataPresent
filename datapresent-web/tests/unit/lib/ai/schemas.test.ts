// ==========================================
// AI Schemas Tests
// ==========================================

import { describe, expect, it } from "vitest";
import {
  AnalysisResponseSchema,
  InsightSchema,
  SlideContentSchema,
  SlideSchema,
} from "@/lib/ai/schemas";

describe("ai/schemas", () => {
  describe("InsightSchema", () => {
    it("should validate valid insight", () => {
      const insight = { type: "trend", text: "Sales are increasing" };
      const result = InsightSchema.safeParse(insight);
      expect(result.success).toBe(true);
    });

    it("should reject invalid insight type", () => {
      const insight = { type: "invalid_type", text: "Test" };
      const result = InsightSchema.safeParse(insight);
      expect(result.success).toBe(false);
    });

    it("should require text field", () => {
      const insight = { type: "trend" };
      const result = InsightSchema.safeParse(insight);
      expect(result.success).toBe(false);
    });
  });

  describe("SlideSchema", () => {
    it("should validate valid slide", () => {
      const slide = {
        position: 1,
        title: "Revenue Chart",
        layout: "BAR_CHART",
        content: { data: [{ value: 100 }] },
      };
      const result = SlideSchema.safeParse(slide);
      expect(result.success).toBe(true);
    });

    it("should validate slide with speaker notes", () => {
      const slide = {
        position: 1,
        title: "Title Slide",
        layout: "TITLE_SLIDE",
        content: { subtitle: "Q1 2024" },
        speakerNotes: "Welcome everyone",
      };
      const result = SlideSchema.safeParse(slide);
      expect(result.success).toBe(true);
    });

    it("should reject invalid layout", () => {
      const slide = {
        position: 1,
        title: "Test",
        layout: "INVALID_LAYOUT",
        content: {},
      };
      const result = SlideSchema.safeParse(slide);
      expect(result.success).toBe(false);
    });

    it("should require required fields", () => {
      const slide = { position: 1 };
      const result = SlideSchema.safeParse(slide);
      expect(result.success).toBe(false);
    });
  });

  describe("AnalysisResponseSchema", () => {
    it("should validate valid analysis response", () => {
      const response = {
        title: "Q1 Sales Report",
        insights: [{ type: "trend", text: "Sales up 20%" }],
        slides: [
          {
            position: 1,
            title: "Overview",
            layout: "TITLE_SLIDE" as const,
            content: {},
          },
        ],
      };
      const result = AnalysisResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should require title field", () => {
      const response = {
        insights: [],
        slides: [],
      };
      const result = AnalysisResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });

    it("should require insights array", () => {
      const response = {
        title: "Test",
        slides: [],
      };
      const result = AnalysisResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });
});
