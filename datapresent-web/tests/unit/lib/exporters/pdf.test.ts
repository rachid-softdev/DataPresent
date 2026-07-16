// @vitest-environment node
// ==========================================
// PDF Exporter Tests
// ==========================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SlideLayout } from "@prisma/client";

describe("pdf exporter", () => {
  it("should export generatePdf and generateHtmlFromSlides functions", async () => {
    const mod = await import("@/lib/exporters/pdf");
    expect(mod.generatePdf).toBeDefined();
    expect(mod.generateHtmlFromSlides).toBeDefined();
  });

  it("should generate HTML from slides", async () => {
    const { generateHtmlFromSlides } = await import("@/lib/exporters/pdf");

    const html = generateHtmlFromSlides({
      title: "Test Report",
      slides: [
        {
          title: "Slide 1",
          layout: "TITLE_SLIDE" as SlideLayout,
          content: { subtitle: "Welcome" },
        },
        {
          title: "Slide 2",
          layout: "TEXT_SUMMARY" as SlideLayout,
          content: { points: ["Point 1", "Point 2"] },
        },
      ],
    });

    expect(html).toContain("Test Report");
    expect(html).toContain("Slide 1");
    expect(html).toContain("Slide 2");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("should handle empty slides array", async () => {
    const { generateHtmlFromSlides } = await import("@/lib/exporters/pdf");

    const html = generateHtmlFromSlides({
      title: "Empty Report",
      slides: [],
    });

    expect(html).toContain("Empty Report");
  });

  it("should include JSON content in slides", async () => {
    const { generateHtmlFromSlides } = await import("@/lib/exporters/pdf");

    const html = generateHtmlFromSlides({
      title: "Test",
      slides: [
        {
          title: "Data Slide",
          layout: "KPI_GRID" as SlideLayout,
          content: { kpis: [{ label: "A", value: "1" }] },
        },
      ],
    });

    expect(html).toContain("kpis");
  });
});
