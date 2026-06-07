// ==========================================
// Report DTO Tests (Sprint 6, Item 2)
// ==========================================
//
// Tests for lib/dto/report.dto.ts:
// - Field mapping accuracy
// - Sensitive fields stripped (sharePassword)
// - Null/undefined edge cases for optional fields
// - Date serialization

import { describe, it, expect } from "vitest";
import { toReportDTO } from "@/lib/dto/report.dto";

describe("ReportDTO (report.dto.ts)", () => {
  // ======================================================================
  // Basic field mapping
  // ======================================================================

  it("should map all expected fields from Prisma report model", () => {
    const now = new Date("2025-01-15T10:00:00Z");

    const input = {
      id: "report-1",
      title: "Q1 Financial Analysis",
      sector: "FINANCE",
      status: "DONE",
      orgId: "org-1",
      slideCount: 12,
      language: "fr",
      isPublic: true,
      allowComments: true,
      allowEmbed: false,
      shareToken: "tok_abc123",
      shareExpiresAt: new Date("2025-02-15T10:00:00Z"),
      sharePassword: "supersecret",
      createdAt: now,
      updatedAt: now,
    };

    const dto = toReportDTO(input);

    expect(dto).toEqual({
      id: "report-1",
      title: "Q1 Financial Analysis",
      sector: "FINANCE",
      status: "DONE",
      orgId: "org-1",
      slideCount: 12,
      language: "fr",
      isPublic: true,
      allowComments: true,
      allowEmbed: false,
      shareToken: "tok_abc123",
      shareExpiresAt: "2025-02-15T10:00:00.000Z",
      createdAt: "2025-01-15T10:00:00.000Z",
      updatedAt: "2025-01-15T10:00:00.000Z",
    });
  });

  // ======================================================================
  // Sensitive field stripping
  // ======================================================================

  it("should strip sharePassword from DTO", () => {
    const now = new Date();

    const input = {
      id: "report-1",
      title: "Test Report",
      sector: "GENERIC",
      status: "PENDING",
      orgId: "org-1",
      slideCount: 5,
      language: "en",
      isPublic: false,
      allowComments: true,
      allowEmbed: false,
      shareToken: null,
      shareExpiresAt: null,
      sharePassword: "should-not-appear",
      createdAt: now,
      updatedAt: now,
    };

    const dto = toReportDTO(input);

    // sharePassword should not be in the DTO
    expect(dto).not.toHaveProperty("sharePassword");
    // All expected fields should be present
    expect(dto).toHaveProperty("id");
    expect(dto).toHaveProperty("title");
    expect(dto).toHaveProperty("shareExpiresAt");
  });

  // ======================================================================
  // Null handling for optional fields
  // ======================================================================

  it("should handle null shareToken", () => {
    const now = new Date();

    const dto = toReportDTO({
      id: "r-1",
      title: "Test",
      sector: "GENERIC",
      status: "PENDING",
      orgId: "org-1",
      slideCount: 1,
      language: "en",
      isPublic: false,
      allowComments: true,
      allowEmbed: false,
      shareToken: null,
      shareExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    });

    expect(dto.shareToken).toBeNull();
    expect(dto.shareExpiresAt).toBeNull();
  });

  it("should handle null shareExpiresAt", () => {
    const now = new Date();

    const dto = toReportDTO({
      id: "r-1",
      title: "Test",
      sector: "GENERIC",
      status: "PENDING",
      orgId: "org-1",
      slideCount: 1,
      language: "en",
      isPublic: false,
      allowComments: true,
      allowEmbed: false,
      shareToken: "tok",
      shareExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    });

    expect(dto.shareExpiresAt).toBeNull();
  });

  it("should handle undefined sharePassword gracefully", () => {
    const now = new Date();

    const input = {
      id: "r-1",
      title: "Test",
      sector: "GENERIC",
      status: "PENDING",
      orgId: "org-1",
      slideCount: 1,
      language: "en",
      isPublic: false,
      allowComments: true,
      allowEmbed: false,
      shareToken: null,
      shareExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    };

    // TypeScript allows omission of optional sharePassword
    const dto = toReportDTO(input);
    expect(dto.id).toBe("r-1");
    expect(dto).not.toHaveProperty("sharePassword");
  });

  // ======================================================================
  // Edge cases
  // ======================================================================

  it("should handle empty string fields", () => {
    const now = new Date();

    const dto = toReportDTO({
      id: "",
      title: "",
      sector: "GENERIC",
      status: "",
      orgId: "",
      slideCount: 0,
      language: "",
      isPublic: false,
      allowComments: false,
      allowEmbed: false,
      shareToken: null,
      shareExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    });

    expect(dto.id).toBe("");
    expect(dto.title).toBe("");
    expect(dto.slideCount).toBe(0);
  });

  it("should handle zero slideCount", () => {
    const now = new Date();

    const dto = toReportDTO({
      id: "r-1",
      title: "Test",
      sector: "GENERIC",
      status: "PENDING",
      orgId: "org-1",
      slideCount: 0,
      language: "en",
      isPublic: false,
      allowComments: true,
      allowEmbed: false,
      shareToken: null,
      shareExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    });

    expect(dto.slideCount).toBe(0);
  });

  // ======================================================================
  // Type conformance
  // ======================================================================

  it("should return an object conforming to ReportDTO interface", () => {
    const now = new Date();

    const dto = toReportDTO({
      id: "r-1",
      title: "Test",
      sector: "MARKETING",
      status: "PROCESSING",
      orgId: "org-1",
      slideCount: 8,
      language: "en",
      isPublic: true,
      allowComments: false,
      allowEmbed: true,
      shareToken: "tok_xyz",
      shareExpiresAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Verify types
    expect(typeof dto.id).toBe("string");
    expect(typeof dto.title).toBe("string");
    expect(typeof dto.sector).toBe("string");
    expect(typeof dto.status).toBe("string");
    expect(typeof dto.orgId).toBe("string");
    expect(typeof dto.slideCount).toBe("number");
    expect(typeof dto.language).toBe("string");
    expect(typeof dto.isPublic).toBe("boolean");
    expect(typeof dto.allowComments).toBe("boolean");
    expect(typeof dto.allowEmbed).toBe("boolean");
    expect(dto.shareToken === null || typeof dto.shareToken === "string").toBe(true);
    expect(dto.shareExpiresAt === null || typeof dto.shareExpiresAt === "string").toBe(true);
    expect(typeof dto.createdAt).toBe("string");
    expect(typeof dto.updatedAt).toBe("string");
  });
});
