// @vitest-environment node
// ==========================================
// PPTX Exporter Tests
// ==========================================

import { describe, it, expect, vi } from "vitest";

// Mock PptxGenJS since it's a heavy dependency
vi.mock("pptxgenjs", () => {
  function MockPptxGen() {
    this.layout = "LAYOUT_16x9";
    this.defineSlideLayout = vi.fn();
    this.addSlide = vi.fn().mockReturnValue({
      addText: vi.fn(),
      addShape: vi.fn(),
      addImage: vi.fn(),
      background: { color: "FFFFFF" },
    });
    this.writeFile = vi.fn().mockResolvedValue(Buffer.from(""));
    this.write = vi.fn().mockResolvedValue(Buffer.from(""));
  }
  return {
    default: MockPptxGen,
  };
});

// Mock @prisma/client types
vi.mock("@prisma/client", () => ({
  SlideLayout: { TITLE_SLIDE: "TITLE_SLIDE", CONTENT_SLIDE: "CONTENT_SLIDE" },
}));

describe("pptx exporter", () => {
  it("should export generatePptx function", async () => {
    const mod = await import("@/lib/exporters/pptx");
    expect(module.generatePptx).toBeDefined();
  });

  it("should import module", async () => {
    const mod = await import("@/lib/exporters/pptx");
    expect(module).toBeDefined();
  });
});
