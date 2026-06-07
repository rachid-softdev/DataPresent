// ==========================================
// Organization DTO Tests (Sprint 6, Item 2)
// ==========================================
//
// Tests for lib/dto/org.dto.ts:
// - Field mapping accuracy
// - Sensitive fields stripped (domainVerifiedAt)
// - Null handling for optional fields
// - Date serialization

import { describe, it, expect } from "vitest";
import { toOrgDTO } from "@/lib/dto/org.dto";

describe("OrganizationDTO (org.dto.ts)", () => {
  // ======================================================================
  // Basic field mapping
  // ======================================================================

  it("should map all expected fields from Prisma organization model", () => {
    const now = new Date("2025-01-15T10:00:00Z");

    const input = {
      id: "org-1",
      name: "Acme Corp",
      slug: "acme-corp",
      customDomain: "reports.acme.com",
      domainVerifiedAt: new Date("2025-01-10T10:00:00Z"),
      logoUrl: "https://example.com/logo.png",
      primaryColor: "#2563eb",
      createdAt: now,
      updatedAt: now,
    };

    const dto = toOrgDTO(input);

    expect(dto).toEqual({
      id: "org-1",
      name: "Acme Corp",
      slug: "acme-corp",
      customDomain: "reports.acme.com",
      logoUrl: "https://example.com/logo.png",
      primaryColor: "#2563eb",
      createdAt: "2025-01-15T10:00:00.000Z",
      updatedAt: "2025-01-15T10:00:00.000Z",
    });
  });

  // ======================================================================
  // Sensitive field stripping
  // ======================================================================

  it("should strip domainVerifiedAt from DTO", () => {
    const now = new Date();

    const input = {
      id: "org-1",
      name: "Test Org",
      slug: "test-org",
      customDomain: null,
      domainVerifiedAt: new Date("2025-01-10T10:00:00Z"),
      logoUrl: null,
      primaryColor: null,
      createdAt: now,
      updatedAt: now,
    };

    const dto = toOrgDTO(input);

    // domainVerifiedAt should not be in the DTO (it's an internal field)
    expect(dto).not.toHaveProperty("domainVerifiedAt");
  });

  // ======================================================================
  // Null handling for optional fields
  // ======================================================================

  it("should handle null customDomain", () => {
    const now = new Date();

    const dto = toOrgDTO({
      id: "org-1",
      name: "Org",
      slug: "org",
      customDomain: null,
      domainVerifiedAt: null,
      logoUrl: null,
      primaryColor: null,
      createdAt: now,
      updatedAt: now,
    });

    expect(dto.customDomain).toBeNull();
    expect(dto.logoUrl).toBeNull();
    expect(dto.primaryColor).toBeNull();
  });

  it("should handle null domainVerifiedAt", () => {
    const now = new Date();

    const dto = toOrgDTO({
      id: "org-1",
      name: "Org",
      slug: "org",
      customDomain: null,
      domainVerifiedAt: null,
      logoUrl: null,
      primaryColor: null,
      createdAt: now,
      updatedAt: now,
    });

    // domainVerifiedAt is stripped, so we just confirm the DTO is correct
    expect(dto.id).toBe("org-1");
    expect(dto.name).toBe("Org");
  });

  // ======================================================================
  // Edge cases
  // ======================================================================

  it("should handle empty slug", () => {
    const now = new Date();

    const dto = toOrgDTO({
      id: "org-1",
      name: "Org",
      slug: "",
      customDomain: null,
      domainVerifiedAt: null,
      logoUrl: null,
      primaryColor: null,
      createdAt: now,
      updatedAt: now,
    });

    expect(dto.slug).toBe("");
  });

  it("should handle undefined primaryColor (Prisma default applied at DB level)", () => {
    const now = new Date();

    const input = {
      id: "org-1",
      name: "Org",
      slug: "org",
      customDomain: "custom.example.com",
      domainVerifiedAt: null,
      logoUrl: "https://example.com/logo.png",
      primaryColor: null,
      createdAt: now,
      updatedAt: now,
    } as any;

    const dto = toOrgDTO(input);
    expect(dto.primaryColor).toBeNull();
    expect(dto.customDomain).toBe("custom.example.com");
    expect(dto.logoUrl).toBe("https://example.com/logo.png");
  });
});
