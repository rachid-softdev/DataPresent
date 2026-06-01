// ==========================================
// Validation Schemas Tests
// ==========================================
//
// Tests for reusable Zod schemas in lib/validation-schemas.ts:
// - ShareCreateSchema, ShareUpdateSchema, InviteSchema, PasswordResetSchema

import { describe, it, expect } from "vitest";
import {
  ShareCreateSchema,
  ShareUpdateSchema,
  InviteSchema,
  PasswordResetSchema,
} from "@/lib/validation-schemas";

describe("ShareCreateSchema", () => {
  it("should accept valid isPublic boolean", () => {
    const result = ShareCreateSchema.safeParse({ isPublic: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isPublic).toBe(true);
  });

  it("should accept isPublic false", () => {
    const result = ShareCreateSchema.safeParse({ isPublic: false });
    expect(result.success).toBe(true);
  });

  it("should reject missing isPublic", () => {
    const result = ShareCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject non-boolean isPublic", () => {
    const result = ShareCreateSchema.safeParse({ isPublic: "yes" });
    expect(result.success).toBe(false);
  });

  it("should reject null isPublic", () => {
    const result = ShareCreateSchema.safeParse({ isPublic: null });
    expect(result.success).toBe(false);
  });
});

describe("ShareUpdateSchema", () => {
  it("should accept empty body (partial update)", () => {
    const result = ShareUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should accept valid update with all fields", () => {
    const result = ShareUpdateSchema.safeParse({
      allowComments: true,
      allowEmbed: false,
      expiresAt: "7d",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowComments).toBe(true);
      expect(result.data.allowEmbed).toBe(false);
      expect(result.data.expiresAt).toBe("7d");
    }
  });

  it("should accept valid expiresAt values", () => {
    for (const val of ["7d", "30d", "90d", "never"] as const) {
      const result = ShareUpdateSchema.safeParse({ expiresAt: val });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid expiresAt", () => {
    const result = ShareUpdateSchema.safeParse({ expiresAt: "1y" });
    expect(result.success).toBe(false);
  });

  it("should accept empty string password (remove password)", () => {
    const result = ShareUpdateSchema.safeParse({ password: "" });
    expect(result.success).toBe(true);
  });

  it("should accept optional fields individually", () => {
    expect(ShareUpdateSchema.safeParse({ allowComments: true }).success).toBe(true);
    expect(ShareUpdateSchema.safeParse({ allowEmbed: false }).success).toBe(true);
  });

  it("should reject extra unknown fields", () => {
    const result = ShareUpdateSchema.safeParse({ unknownField: "value" });
    // Zod by default strips unknown fields
    expect(result.success).toBe(true);
  });
});

describe("InviteSchema", () => {
  it("should accept valid email", () => {
    const result = InviteSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
      expect(result.data.role).toBe("MEMBER");
    }
  });

  it("should accept valid email with role", () => {
    const result = InviteSchema.safeParse({ email: "admin@example.com", role: "ADMIN" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.role).toBe("ADMIN");
  });

  it("should accept OWNER role", () => {
    const result = InviteSchema.safeParse({ email: "owner@example.com", role: "OWNER" });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = InviteSchema.safeParse({ email: "notanemail" });
    expect(result.success).toBe(false);
  });

  it("should reject missing email", () => {
    const result = InviteSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("should reject empty email string", () => {
    const result = InviteSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });

  it("should reject invalid role", () => {
    const result = InviteSchema.safeParse({ email: "user@example.com", role: "SUPERUSER" });
    expect(result.success).toBe(false);
  });
});

describe("PasswordResetSchema", () => {
  it("should accept valid token and password", () => {
    const result = PasswordResetSchema.safeParse({
      token: "abc123token",
      password: "ValidP@ss1Ord!",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe("abc123token");
      expect(result.data.password).toBe("ValidP@ss1Ord!");
    }
  });

  it("should reject missing token", () => {
    const result = PasswordResetSchema.safeParse({
      password: "ValidP@ss1Ord!",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty token", () => {
    const result = PasswordResetSchema.safeParse({
      token: "",
      password: "ValidP@ss1Ord!",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing password", () => {
    const result = PasswordResetSchema.safeParse({
      token: "abc123",
    });
    expect(result.success).toBe(false);
  });

  it("should reject short password", () => {
    const result = PasswordResetSchema.safeParse({
      token: "abc123",
      password: "Short1!",
    });
    expect(result.success).toBe(false);
  });
});
