// ==========================================
// Organization Name Validation Tests
// ==========================================
//
// Tests the name validation logic from:
// - app/[locale]/api/organizations/[id]/route.ts (PATCH handler)
//
// The validation rules:
// 1. name must be truthy
// 2. name must be of type 'string'
// 3. name.trim().length must be > 0
// 4. name.trim().length must be <= 100

import { describe, expect, it } from "vitest";

/**
 * Pure function representing the org name validation logic extracted
 * from the PATCH handler in organizations/[id]/route.ts
 */
function validateOrgName(name: unknown): {
  valid: boolean;
  error?: string;
  trimmedName?: string;
} {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Name is required and must be a string" };
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return { valid: false, error: "Name cannot be empty" };
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: "Name must be at most 100 characters" };
  }

  return { valid: true, trimmedName };
}

describe("Organization Name Validation", () => {
  // -----------------------------------------------------------------------
  // Rejection: Empty and missing values
  // -----------------------------------------------------------------------
  describe("rejects empty / missing values", () => {
    it("should reject empty string", () => {
      const result = validateOrgName("");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject string with only whitespace", () => {
      const result = validateOrgName("   ");
      expect(result.valid).toBe(false);
    });

    it("should reject undefined", () => {
      const result = validateOrgName(undefined);
      expect(result.valid).toBe(false);
    });

    it("should reject null", () => {
      const result = validateOrgName(null);
      expect(result.valid).toBe(false);
    });

    it("should reject empty after trim when name has leading/trailing spaces only", () => {
      const result = validateOrgName("  \t  \n  ");
      expect(result.valid).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Rejection: Non-string types
  // -----------------------------------------------------------------------
  describe("rejects non-string types", () => {
    it("should reject number", () => {
      expect(validateOrgName(123).valid).toBe(false);
    });

    it("should reject boolean", () => {
      expect(validateOrgName(true).valid).toBe(false);
    });

    it("should reject array", () => {
      expect(validateOrgName(["My Org"]).valid).toBe(false);
    });

    it("should reject object", () => {
      expect(validateOrgName({ name: "My Org" }).valid).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Rejection: Exceeds max length
  // -----------------------------------------------------------------------
  describe("rejects names exceeding 100 characters", () => {
    it("should reject name of 101 characters", () => {
      const longName = "A".repeat(101);
      const result = validateOrgName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("100");
    });

    it("should reject name of 200 characters", () => {
      const longName = "B".repeat(200);
      expect(validateOrgName(longName).valid).toBe(false);
    });

    it("should reject name of exactly 101 chars after trim", () => {
      const longNameWithSpaces = "  " + "C".repeat(101) + "  ";
      const result = validateOrgName(longNameWithSpaces);
      expect(result.valid).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Acceptance: Valid names
  // -----------------------------------------------------------------------
  describe("accepts valid names", () => {
    it("should accept a single character name", () => {
      const result = validateOrgName("X");
      expect(result.valid).toBe(true);
      expect(result.trimmedName).toBe("X");
    });

    it("should accept a normal organization name", () => {
      const result = validateOrgName("Acme Corporation");
      expect(result.valid).toBe(true);
      expect(result.trimmedName).toBe("Acme Corporation");
    });

    it("should accept name with exactly 100 characters", () => {
      const name = "A".repeat(100);
      const result = validateOrgName(name);
      expect(result.valid).toBe(true);
      expect(result.trimmedName?.length).toBe(100);
    });

    it("should trim leading and trailing whitespace", () => {
      const result = validateOrgName("  My Organization  ");
      expect(result.valid).toBe(true);
      expect(result.trimmedName).toBe("My Organization");
    });

    it("should accept names with special characters", () => {
      expect(validateOrgName("O'Brien & Sons, LLC").valid).toBe(true);
      expect(validateOrgName("Startup-123 (Tech)").valid).toBe(true);
    });
  });
});
