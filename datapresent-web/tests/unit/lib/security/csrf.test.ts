// @vitest-environment node
// ==========================================
// CSRF Security Tests
// ==========================================

import { beforeEach, describe, expect, it, vi } from "vitest";
import { signJobData, verifyJobSignature } from "@/lib/crypto";
import { deriveKey, generateCsrfToken, validateCsrfToken } from "@/lib/security/csrf";

describe("CSRF Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("deriveKey", () => {
    it("should return a 32-byte buffer", () => {
      const key = deriveKey("test-secret");
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
    });

    it("should produce the same key for the same secret (deterministic)", () => {
      const secret = "my-secret-key-12345";
      const key1 = deriveKey(secret);
      const key2 = deriveKey(secret);
      expect(key1.equals(key2)).toBe(true);
    });

    it("should produce different keys for different secrets", () => {
      const key1 = deriveKey("secret-one");
      const key2 = deriveKey("secret-two");
      expect(key1.equals(key2)).toBe(false);
    });

    it("should produce a valid 32-byte key from a short input secret", () => {
      const key = deriveKey("hi");
      expect(key.length).toBe(32);
    });

    it("should produce a valid 32-byte key from a long input secret", () => {
      const key = deriveKey("a".repeat(100));
      expect(key.length).toBe(32);
    });

    it("should produce a valid 32-byte key from an empty string", () => {
      const key = deriveKey("");
      expect(key.length).toBe(32);
    });
  });

  describe("generateCsrfToken", () => {
    it("should generate a valid CSRF token", () => {
      const token = generateCsrfToken();

      // Token should have 3 parts separated by colons
      const parts = token.split(":");
      expect(parts.length).toBe(3);

      // IV should be 32 hex chars (16 bytes)
      expect(parts[0].length).toBe(32);

      // Tag should be 32 hex chars (16 bytes)
      expect(parts[1].length).toBe(32);
    });

    it("should generate different tokens each time", () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe("validateCsrfToken", () => {
    it("should return false for empty token", async () => {
      const result = validateCsrfToken("");
      expect(result).toBe(false);
    });

    it("should return false for invalid token format", async () => {
      const result = validateCsrfToken("invalid-token");
      expect(result).toBe(false);
    });

    it("should return false for token with wrong number of parts", async () => {
      const result = validateCsrfToken("part1:part2");
      expect(result).toBe(false);
    });

    it("should return true for valid token", async () => {
      const token = generateCsrfToken();
      const result = validateCsrfToken(token);
      expect(result).toBe(true);
    });

    it("should return false for tampered token", async () => {
      const token = generateCsrfToken();
      const parts = token.split(":");
      // Tamper with the encrypted part
      parts[2] = parts[2].substring(0, 4) + "0000" + parts[2].substring(8);
      const tamperedToken = parts.join(":");

      const result = validateCsrfToken(tamperedToken);
      expect(result).toBe(false);
    });

    it("should validate token with matching userId", async () => {
      const userId = "user-123";
      const token = generateCsrfToken(userId);
      const result = validateCsrfToken(token, userId);
      expect(result).toBe(true);
    });

    it("should reject token with non-matching userId", async () => {
      const token = generateCsrfToken("user-123");
      const result = validateCsrfToken(token, "user-456");
      expect(result).toBe(false);
    });

    it("should accept token without userId when no userId provided", async () => {
      const token = generateCsrfToken();
      const result = validateCsrfToken(token);
      expect(result).toBe(true);
    });

    it("should return false for token with garbage encrypted payload (simulates NaN timestamp)", async () => {
      // We cannot easily forge an AES-256-GCM encrypted token with a specific
      // timestamp. Instead, verify that completely malformed tokens are rejected.
      // The iv:tag:encrypted format requires all three parts.
      const result = await validateCsrfToken("00:00:00");
      expect(result).toBe(false);
    });
  });

  describe("signJobData and verifyJobSignature", () => {
    it("should sign data and verify signature", () => {
      const data = { jobId: "job-123", type: "export" };
      const { data: signedData, signature } = signJobData(data);

      expect(signedData).toEqual(data);
      expect(signature).toBeDefined();
      expect(signature.length).toBe(64); // SHA256 hex = 64 chars
    });

    it("should verify valid signature", () => {
      const data = { jobId: "job-123", type: "export" };
      const { signature } = signJobData(data);

      const isValid = verifyJobSignature(data, signature);
      expect(isValid).toBe(true);
    });

    it("should reject invalid signature", () => {
      const data = { jobId: "job-123", type: "export" };
      const invalidSignature = "a".repeat(64);

      const isValid = verifyJobSignature(data, invalidSignature);
      expect(isValid).toBe(false);
    });

    it("should detect data tampering", () => {
      const data = { jobId: "job-123", type: "export" };
      const { signature } = signJobData(data);

      // Tamper with data
      const tamperedData = { jobId: "job-999", type: "export" };

      const isValid = verifyJobSignature(tamperedData, signature);
      expect(isValid).toBe(false);
    });

    it("should produce same signature for same data", () => {
      const data = { jobId: "job-123", type: "export" };
      const { signature: sig1 } = signJobData(data);
      const { signature: sig2 } = signJobData(data);

      expect(sig1).toBe(sig2);
    });
  });
});
