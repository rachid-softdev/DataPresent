// ==========================================
// Slide DTO Tests (Sprint 6, Item 2)
// ==========================================
//
// Tests for lib/dto/slide.dto.ts:
// - Field mapping accuracy
// - contentJson (Json type) passthrough
// - Null handling for optional fields (speakerNotes)
// - Date serialization

import { describe, it, expect } from "vitest";
import { toSlideDTO } from "@/lib/dto/slide.dto";

describe("SlideDTO (slide.dto.ts)", () => {
  // ======================================================================
  // Basic field mapping
  // ======================================================================

  it("should map all expected fields from Prisma slide model", () => {
    const createdAt = new Date("2025-01-15T10:00:00Z");
    const contentJson = {
      type: "bar_chart",
      data: {
        labels: ["Jan", "Feb", "Mar"],
        values: [100, 200, 150],
      },
    };

    const input = {
      id: "slide-1",
      reportId: "report-1",
      position: 1,
      title: "Revenue Overview",
      layout: "BAR_CHART",
      contentJson,
      speakerNotes: "Highlight the growth trend in Q1",
      createdAt,
    };

    const dto = toSlideDTO(input);

    expect(dto).toEqual({
      id: "slide-1",
      reportId: "report-1",
      position: 1,
      title: "Revenue Overview",
      layout: "BAR_CHART",
      contentJson,
      speakerNotes: "Highlight the growth trend in Q1",
      createdAt: "2025-01-15T10:00:00.000Z",
    });
  });

  // ======================================================================
  // contentJson — complex JSON passthrough
  // ======================================================================

  it("should pass through contentJson as-is for complex nested data", () => {
    const createdAt = new Date();
    const contentJson = {
      kpis: [
        { label: "Revenue", value: 150000, change: 12.5 },
        { label: "Users", value: 12500, change: -3.2 },
      ],
      nested: {
        deep: [1, 2, { active: true }],
      },
    };

    const dto = toSlideDTO({
      id: "slide-2",
      reportId: "report-1",
      position: 2,
      title: "KPI Dashboard",
      layout: "KPI_GRID",
      contentJson,
      speakerNotes: null,
      createdAt,
    });

    expect(dto.contentJson).toEqual(contentJson);
    expect(dto.contentJson).toBe(contentJson); // Same reference — no transformation
  });

  it("should pass through primitive contentJson values", () => {
    const createdAt = new Date();

    const dto = toSlideDTO({
      id: "slide-3",
      reportId: "report-1",
      position: 3,
      title: "String Content",
      layout: "TEXT_SUMMARY",
      contentJson: "simple text content",
      speakerNotes: null,
      createdAt,
    });

    expect(dto.contentJson).toBe("simple text content");
  });

  // ======================================================================
  // Null handling for optional fields
  // ======================================================================

  it("should handle null speakerNotes", () => {
    const createdAt = new Date();

    const dto = toSlideDTO({
      id: "slide-1",
      reportId: "report-1",
      position: 1,
      title: "Slide",
      layout: "TITLE_SLIDE",
      contentJson: {},
      speakerNotes: null,
      createdAt,
    });

    expect(dto.speakerNotes).toBeNull();
  });

  // ======================================================================
  // Edge cases
  // ======================================================================

  it("should handle empty contentJson object", () => {
    const createdAt = new Date();

    const dto = toSlideDTO({
      id: "slide-1",
      reportId: "report-1",
      position: 1,
      title: "Empty",
      layout: "TITLE_SLIDE",
      contentJson: {},
      speakerNotes: null,
      createdAt,
    });

    expect(dto.contentJson).toEqual({});
  });

  it("should handle zero position", () => {
    const createdAt = new Date();

    const dto = toSlideDTO({
      id: "slide-0",
      reportId: "report-1",
      position: 0,
      title: "Intro",
      layout: "TITLE_SLIDE",
      contentJson: { text: "Welcome" },
      speakerNotes: null,
      createdAt,
    });

    expect(dto.position).toBe(0);
  });

  it("should handle empty title", () => {
    const createdAt = new Date();

    const dto = toSlideDTO({
      id: "slide-1",
      reportId: "report-1",
      position: 1,
      title: "",
      layout: "TITLE_SLIDE",
      contentJson: {},
      speakerNotes: null,
      createdAt,
    });

    expect(dto.title).toBe("");
  });

  // ======================================================================
  // Type conformance
  // ======================================================================

  it("should return an object conforming to SlideDTO interface", () => {
    const createdAt = new Date();

    const dto = toSlideDTO({
      id: "s-1",
      reportId: "r-1",
      position: 5,
      title: "Comparison",
      layout: "COMPARISON",
      contentJson: { left: "A", right: "B" },
      speakerNotes: "Note here",
      createdAt,
    });

    expect(typeof dto.id).toBe("string");
    expect(typeof dto.reportId).toBe("string");
    expect(typeof dto.position).toBe("number");
    expect(typeof dto.title).toBe("string");
    expect(typeof dto.layout).toBe("string");
    expect(typeof dto.createdAt).toBe("string");
    expect(dto.speakerNotes === null || typeof dto.speakerNotes === "string").toBe(true);
  });
});
