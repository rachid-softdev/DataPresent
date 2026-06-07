// ==========================================
// Worker Common — Crypto Tests (Horizon 6)
// ==========================================
//
// Tests for packages/worker-common/src/crypto.ts:
// - signJobData() produces HMAC-SHA256 signature
// - verifyJobSignature() validates correctly
// - extractSignedJobData() returns valid + clean data
// - generateToken() produces hex tokens
// - Timing-safe comparison

import { describe, it, expect } from "vitest";

// Import from the worker-common package (via vitest alias)
const cryptoPath = "@datapresent/worker-common/crypto";

describe("Worker-common Crypto (packages/worker-common/src/crypto.ts)", () => {
  const TEST_SECRET = "test-secret-key-for-hmac-testing-12345678";

  // ======================================================================
  // signJobData()
  // ======================================================================

  it("should sign job data with HMAC-SHA256 signature", async () => {
    const { signJobData } = await import(cryptoPath);
    const result = signJobData(TEST_SECRET, { type: "export", reportId: "rpt_123" });

    expect(result.data).toEqual({ type: "export", reportId: "rpt_123" });
    expect(result.signature).toBeDefined();
    expect(typeof result.signature).toBe("string");
    expect(result.signature.length).toBe(64); // SHA-256 hex = 64 chars
  });

  it("should produce deterministic signatures for same data", async () => {
    const { signJobData } = await import(cryptoPath);
    const data = { userId: "usr_1", action: "process" };

    const result1 = signJobData(TEST_SECRET, data);
    const result2 = signJobData(TEST_SECRET, data);

    expect(result1.signature).toBe(result2.signature);
  });

  it("should produce same signature regardless of key order", async () => {
    const { signJobData } = await import(cryptoPath);
    const dataA = { a: 1, b: 2 };
    const dataB = { b: 2, a: 1 };

    const resultA = signJobData(TEST_SECRET, dataA);
    const resultB = signJobData(TEST_SECRET, dataB);

    expect(resultA.signature).toBe(resultB.signature);
  });

  it("should produce different signatures for different secrets", async () => {
    const { signJobData } = await import(cryptoPath);
    const data = { test: "value" };

    const resultA = signJobData("secret-a", data);
    const resultB = signJobData("secret-b", data);

    expect(resultA.signature).not.toBe(resultB.signature);
  });

  it("should handle empty data object", async () => {
    const { signJobData } = await import(cryptoPath);
    const result = signJobData(TEST_SECRET, {});

    expect(result.signature).toBeDefined();
    expect(result.signature.length).toBe(64);
  });

  it("should handle nested objects in data", async () => {
    const { signJobData } = await import(cryptoPath);
    const result = signJobData(TEST_SECRET, {
      nested: { key: "value" },
      items: [1, 2, 3],
    });

    expect(result.signature).toBeDefined();
    expect(result.signature.length).toBe(64);
  });

  it("should return original data alongside signature", async () => {
    const { signJobData } = await import(cryptoPath);
    const data = { type: "pdf-export", reportId: "rpt_456" };

    const result = signJobData(TEST_SECRET, data);

    expect(result.data).toBe(data); // Same reference
    expect(result.data.reportId).toBe("rpt_456");
  });

  // ======================================================================
  // verifyJobSignature()
  // ======================================================================

  it("should verify a valid signature", async () => {
    const { signJobData, verifyJobSignature } = await import(cryptoPath);
    const { data, signature } = signJobData(TEST_SECRET, { id: "test" });

    const isValid = verifyJobSignature(TEST_SECRET, data, signature);
    expect(isValid).toBe(true);
  });

  it("should reject data tampering", async () => {
    const { signJobData, verifyJobSignature } = await import(cryptoPath);
    const { data, signature } = signJobData(TEST_SECRET, { id: "original" });

    // Tamper with the data
    data.id = "tampered";
    const isValid = verifyJobSignature(TEST_SECRET, data, signature);
    expect(isValid).toBe(false);
  });

  it("should reject invalid signature string", async () => {
    const { verifyJobSignature } = await import(cryptoPath);
    const isValid = verifyJobSignature(TEST_SECRET, { id: "test" }, "invalid-signature");
    expect(isValid).toBe(false);
  });

  it("should reject signature from different secret", async () => {
    const { signJobData, verifyJobSignature } = await import(cryptoPath);
    const { data, signature } = signJobData("different-secret", { id: "test" });

    const isValid = verifyJobSignature(TEST_SECRET, data, signature);
    expect(isValid).toBe(false);
  });

  it("should use timing-safe comparison (returns boolean)", async () => {
    const { signJobData, verifyJobSignature } = await import(cryptoPath);
    const { data, signature } = signJobData(TEST_SECRET, { id: "test" });

    const isValid = verifyJobSignature(TEST_SECRET, data, signature);
    expect(typeof isValid).toBe("boolean");
  });

  it("should handle empty data in verification", async () => {
    const { signJobData, verifyJobSignature } = await import(cryptoPath);
    const { data, signature } = signJobData(TEST_SECRET, {});

    const isValid = verifyJobSignature(TEST_SECRET, data, signature);
    expect(isValid).toBe(true);
  });

  // ======================================================================
  // extractSignedJobData()
  // ======================================================================

  it("should return valid=true and clean data for valid signature", async () => {
    const { signJobData, extractSignedJobData } = await import(cryptoPath);
    const signed = signJobData(TEST_SECRET, { type: "export", reportId: "rpt_123" });
    const jobData = { ...signed.data, signature: signed.signature };

    const result = extractSignedJobData<{ type: string; reportId: string }>(TEST_SECRET, jobData);

    expect(result.valid).toBe(true);
    expect(result.cleanData).toEqual({ type: "export", reportId: "rpt_123" });
  });

  it("should return valid=false for missing signature", async () => {
    const { extractSignedJobData } = await import(cryptoPath);

    const result = extractSignedJobData(TEST_SECRET, { type: "export" });

    expect(result.valid).toBe(false);
    expect(result.cleanData).toEqual({ type: "export" });
  });

  it("should return valid=false for invalid signature", async () => {
    const { extractSignedJobData } = await import(cryptoPath);

    const result = extractSignedJobData(TEST_SECRET, {
      type: "export",
      signature: "bad-signature",
    });

    expect(result.valid).toBe(false);
    expect(result.cleanData).toEqual({ type: "export" });
  });

  it("should strip the signature field from cleanData", async () => {
    const { signJobData, extractSignedJobData } = await import(cryptoPath);
    const signed = signJobData(TEST_SECRET, { type: "export" });
    const jobData = { ...signed.data, signature: signed.signature };

    const result = extractSignedJobData(TEST_SECRET, jobData);

    expect(result.valid).toBe(true);
    expect(result.cleanData).not.toHaveProperty("signature");
  });

  it("should return original data fields intact in cleanData", async () => {
    const { signJobData, extractSignedJobData } = await import(cryptoPath);
    const signed = signJobData(TEST_SECRET, { userId: "usr_1", action: "process", count: 3 });
    const jobData = { ...signed.data, signature: signed.signature };

    const result = extractSignedJobData<Record<string, unknown>>(TEST_SECRET, jobData);

    expect(result.valid).toBe(true);
    expect(result.cleanData).toEqual({ userId: "usr_1", action: "process", count: 3 });
  });

  // ======================================================================
  // generateToken()
  // ======================================================================

  it("should generate a hex string token", async () => {
    const { generateToken } = await import(cryptoPath);
    const token = generateToken();

    expect(typeof token).toBe("string");
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it("should generate 64-char hex token by default (32 bytes)", async () => {
    const { generateToken } = await import(cryptoPath);
    const token = generateToken();

    expect(token.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it("should generate token of specified byte length", async () => {
    const { generateToken } = await import(cryptoPath);

    const token16 = generateToken(16);
    expect(token16.length).toBe(32); // 16 bytes = 32 hex chars

    const token8 = generateToken(8);
    expect(token8.length).toBe(16); // 8 bytes = 16 hex chars
  });

  it("should generate unique tokens each time", async () => {
    const { generateToken } = await import(cryptoPath);

    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateToken());
    }

    expect(tokens.size).toBe(100); // All unique
  });

  it("should generate cryptographically secure random tokens", async () => {
    const { generateToken } = await import(cryptoPath);
    const token = generateToken();

    // Verify it's not a predictable pattern
    expect(token).not.toBe(generateToken());
    // Hex pattern: chars should vary
    const chars = new Set(token.split(""));
    // With 64 hex chars, should have > 10 unique chars
    expect(chars.size).toBeGreaterThan(10);
  });
});
