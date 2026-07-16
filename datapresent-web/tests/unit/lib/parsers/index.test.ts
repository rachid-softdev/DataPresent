// ==========================================
// Parsers Tests
// ==========================================

import { describe, expect, it, vi } from "vitest";

// Mock the individual parsers
vi.mock("@/lib/parsers/xlsx", () => ({
  parseXlsx: vi.fn().mockResolvedValue({
    sheets: { Sheet1: [{ col1: "val1" }] },
    metadata: { fileName: "test.xlsx", rowCount: 1, columnCount: 1 },
  }),
}));

vi.mock("@/lib/parsers/csv", () => ({
  parseCsv: vi.fn().mockResolvedValue({
    sheets: { Sheet1: [{ col1: "val1" }] },
    metadata: { fileName: "test.csv", rowCount: 1, columnCount: 1 },
  }),
}));

vi.mock("@/lib/parsers/pdf", () => ({
  parsePdf: vi.fn().mockResolvedValue({
    sheets: { Sheet1: [{ text: "extracted" }] },
    metadata: { fileName: "test.pdf", rowCount: 1, columnCount: 1 },
  }),
}));

vi.mock("@/lib/parsers/gsheets", () => ({
  parseGoogleSheet: vi.fn().mockResolvedValue({
    sheets: { Sheet1: [{ data: "fromSheet" }] },
    metadata: { fileName: "spreadsheet", rowCount: 1, columnCount: 1 },
  }),
}));

import { ParsedData, parseFile } from "@/lib/parsers/index";

describe("parsers", () => {
  describe("parseFile", () => {
    it("should parse XLSX files", async () => {
      const buffer = Buffer.from("test");
      const result = await parseFile(buffer, "test.xlsx", "XLSX");
      expect(result).toBeDefined();
      expect(result.metadata.fileName).toBe("test.xlsx");
    });

    it("should parse CSV files", async () => {
      const buffer = Buffer.from("test");
      const result = await parseFile(buffer, "test.csv", "CSV");
      expect(result).toBeDefined();
      expect(result.metadata.fileName).toBe("test.csv");
    });

    it("should parse PDF files", async () => {
      const buffer = Buffer.from("test");
      const result = await parseFile(buffer, "test.pdf", "PDF");
      expect(result).toBeDefined();
    });

    it("should parse Google Sheet files", async () => {
      const buffer = Buffer.from("spreadsheet-id-123");
      const result = await parseFile(buffer, "sheet", "GSHEET");
      expect(result).toBeDefined();
    });

    it("should throw error for unsupported file types", async () => {
      const buffer = Buffer.from("test");
      await expect(parseFile(buffer, "test.xyz", "UNKNOWN" as any)).rejects.toThrow(
        "Unsupported file type",
      );
    });
  });
});
