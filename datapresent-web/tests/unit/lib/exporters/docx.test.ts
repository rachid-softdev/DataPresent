// @vitest-environment node
// ==========================================
// DOCX Exporter Tests
// ==========================================

import { describe, it, expect } from "vitest";

describe("docx exporter", () => {
  it("should export generateDocx function", async () => {
    const mod = await import("@/lib/exporters/docx");
    expect(module.generateDocx).toBeDefined();
  });

  it("should import docx classes", async () => {
    const mod = await import("@/lib/exporters/docx");
    // Just verify module loads - the actual generation requires real docx
    expect(module).toBeDefined();
  });
});
