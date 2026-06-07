// ==========================================
// User DTO Tests (Sprint 6, Item 2)
// ==========================================
//
// Tests for lib/dto/user.dto.ts:
// - Field mapping accuracy
// - Sensitive fields stripped (password hash, emailVerified)
// - Null handling for optional fields
// - Date serialization

import { describe, it, expect } from "vitest";
import { toUserDTO } from "@/lib/dto/user.dto";

describe("UserDTO (user.dto.ts)", () => {
  // ======================================================================
  // Basic field mapping
  // ======================================================================

  it("should map all expected fields from Prisma user model", () => {
    const now = new Date("2025-01-15T10:00:00Z");

    const input = {
      id: "user-1",
      name: "John Doe",
      email: "john@example.com",
      emailVerified: new Date("2025-01-10T10:00:00Z"),
      image: "https://example.com/avatar.jpg",
      isVerified: true,
      role: "ADMIN",
      createdAt: now,
      updatedAt: now,
      password: { hash: "$argon2id$v=19$m=65536,t=3,p=4$..." },
    };

    const dto = toUserDTO(input);

    expect(dto).toEqual({
      id: "user-1",
      name: "John Doe",
      email: "john@example.com",
      image: "https://example.com/avatar.jpg",
      role: "ADMIN",
      isVerified: true,
      createdAt: "2025-01-15T10:00:00.000Z",
      updatedAt: "2025-01-15T10:00:00.000Z",
    });
  });

  // ======================================================================
  // Sensitive field stripping
  // ======================================================================

  it("should strip password hash from DTO", () => {
    const now = new Date();

    const input = {
      id: "user-1",
      name: "Jane",
      email: "jane@example.com",
      emailVerified: null,
      image: null,
      isVerified: false,
      role: "MEMBER",
      createdAt: now,
      updatedAt: now,
      password: { hash: "should-not-appear" },
    };

    const dto = toUserDTO(input);

    expect(dto).not.toHaveProperty("password");
    expect(dto).not.toHaveProperty("hash");
    expect(dto.email).toBe("jane@example.com");
  });

  it("should strip emailVerified from DTO", () => {
    const now = new Date();

    const input = {
      id: "user-1",
      name: "Jane",
      email: "jane@example.com",
      emailVerified: new Date("2025-01-10T10:00:00Z"),
      image: null,
      isVerified: false,
      role: "MEMBER",
      createdAt: now,
      updatedAt: now,
      password: { hash: "secret" },
    };

    const dto = toUserDTO(input);

    // emailVerified should not be in the DTO (it's an internal field)
    expect(dto).not.toHaveProperty("emailVerified");
  });

  // ======================================================================
  // Null handling for optional fields
  // ======================================================================

  it("should handle null name", () => {
    const now = new Date();

    const dto = toUserDTO({
      id: "user-1",
      name: null,
      email: null,
      emailVerified: null,
      image: null,
      isVerified: false,
      role: "MEMBER",
      createdAt: now,
      updatedAt: now,
    });

    expect(dto.name).toBeNull();
    expect(dto.email).toBeNull();
    expect(dto.image).toBeNull();
  });

  it("should handle null password (no password auth)", () => {
    const now = new Date();

    const dto = toUserDTO({
      id: "user-1",
      name: "OAuth User",
      email: "oauth@example.com",
      emailVerified: null,
      image: "https://example.com/avatar.png",
      isVerified: true,
      role: "MEMBER",
      createdAt: now,
      updatedAt: now,
      password: null,
    });

    expect(dto).not.toHaveProperty("password");
    expect(dto.id).toBe("user-1");
  });

  // ======================================================================
  // Edge cases
  // ======================================================================

  it("should handle empty string email", () => {
    const now = new Date();

    const dto = toUserDTO({
      id: "user-1",
      name: "No Email",
      email: "",
      emailVerified: null,
      image: null,
      isVerified: false,
      role: "MEMBER",
      createdAt: now,
      updatedAt: now,
    });

    expect(dto.email).toBe("");
  });

  it("should handle all null optionals", () => {
    const now = new Date();

    const dto = toUserDTO({
      id: "user-min",
      name: null,
      email: null,
      emailVerified: null,
      image: null,
      isVerified: false,
      role: "MEMBER",
      createdAt: now,
      updatedAt: now,
    });

    expect(dto.name).toBeNull();
    expect(dto.email).toBeNull();
    expect(dto.image).toBeNull();
  });
});
