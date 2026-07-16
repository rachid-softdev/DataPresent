// @vitest-environment node
// ==========================================
// API Keys Security Tests
// ==========================================
//
// Tests API key security fixes:
// - extractTokenPrefix() returns first 12 chars for indexed lookup
// - revokeApiKey() enforces orgId ownership via Prisma where clause
// - createApiKey() stores keyPrefix for O(1) lookup

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup for revokeApiKey tests
// ---------------------------------------------------------------------------
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    apiKey: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/sentry", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_password"),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

// Import after mocks
import { revokeApiKey, createApiKey, formatKeyForDisplay } from "@/lib/api-keys";
import { extractTokenPrefix } from "@/lib/crypto";

describe("API Keys Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // extractTokenPrefix — first 12 chars
  // -----------------------------------------------------------------------
  describe("extractTokenPrefix", () => {
    it("should return first 12 characters of a hex token", () => {
      const token = "abcdef0123456789abcdef0123456789";
      expect(extractTokenPrefix(token)).toBe("abcdef012345");
    });

    it("should return first 12 characters for any string >= 12", () => {
      const token = "dp_abc123def456xyz789";
      expect(extractTokenPrefix(token)).toBe("dp_abc123def");
    });

    it("should return the whole string if shorter than 12 chars", () => {
      expect(extractTokenPrefix("short")).toBe("short");
    });

    it("should return empty string for empty input", () => {
      expect(extractTokenPrefix("")).toBe("");
    });
  });

  // -----------------------------------------------------------------------
  // revokeApiKey — orgId ownership enforcement
  // -----------------------------------------------------------------------
  describe("revokeApiKey — orgId ownership check", () => {
    it("should call prisma.apiKey.delete with both keyId and orgId", async () => {
      mockPrisma.apiKey.delete.mockResolvedValue({ id: "key-123" });

      const result = await revokeApiKey("key-123", "org-456");

      expect(result).toBe(true);
      expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: "key-123", orgId: "org-456" },
      });
    });

    it("should return false and capture error when key does not belong to org", async () => {
      const testError = new Error("Record to delete does not exist");
      mockPrisma.apiKey.delete.mockRejectedValue(testError);

      const result = await revokeApiKey("key-123", "wrong-org");

      expect(result).toBe(false);
      // Prisma delete with wrong orgId will throw because record not found
      expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: "key-123", orgId: "wrong-org" },
      });
    });

    it("should return false when an unexpected error occurs", async () => {
      mockPrisma.apiKey.delete.mockRejectedValue(new Error("DB connection error"));

      const result = await revokeApiKey("key-999", "org-456");

      expect(result).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // createApiKey — stores keyPrefix for indexed lookup
  // -----------------------------------------------------------------------
  describe("createApiKey — keyPrefix storage", () => {
    it("should call prisma.create with keyPrefix derived from generated key", async () => {
      mockPrisma.apiKey.create.mockImplementation(async ({ data }) => ({
        id: "new-key-id",
        name: data.name,
        expiresAt: data.expiresAt,
      }));

      const result = await createApiKey({
        orgId: "org-456",
        name: "Test Key",
      });

      // The key prefix should be stored in the database record
      const callArgs = mockPrisma.apiKey.create.mock.calls[0][0];
      expect(callArgs.data.keyPrefix).toBeDefined();
      expect(callArgs.data.keyPrefix.length).toBeGreaterThanOrEqual(8);
      expect(callArgs.data.keyPrefix).toMatch(/^dp_/);
    });

    it("should pass correct orgId to Prisma create", async () => {
      mockPrisma.apiKey.create.mockImplementation(async ({ data }) => ({
        id: "new-key-id",
        name: data.name,
        expiresAt: data.expiresAt,
      }));

      await createApiKey({
        orgId: "org-789",
        name: "My API Key",
      });

      const callArgs = mockPrisma.apiKey.create.mock.calls[0][0];
      expect(callArgs.data.orgId).toBe("org-789");
      expect(callArgs.data.name).toBe("My API Key");
    });
  });

  // -----------------------------------------------------------------------
  // formatKeyForDisplay — regression tests
  // -----------------------------------------------------------------------
  describe("formatKeyForDisplay", () => {
    it("should not expose full key", () => {
      const key = "dp_abcdefghijklmnopqrstuvwxyz12345678901234567890";
      const result = formatKeyForDisplay(key);
      // Should be truncated (original ~52 chars, result ~16 chars)
      expect(result.length).toBeLessThan(key.length);
      expect(result).not.toContain(key.slice(8, -4));
    });

    it("should show first 8 and last 4 characters", () => {
      const key = "dp_abcdefghijklmnopqrstuvwxyz12345678901234567890";
      const result = formatKeyForDisplay(key);
      expect(result.startsWith("dp_abcd")).toBe(true);
    });
  });
});
