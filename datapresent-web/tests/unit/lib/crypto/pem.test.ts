// ==========================================
// PEM Storage Tests (Sprint 6, Item 3)
// ==========================================
//
// Tests for lib/crypto/pem.ts:
// - getGoogleSheetsPrivateKey() returns decoded Base64 key when available
// - Falls back to raw PEM env var when Base64 is not set
// - Returns null when neither is set
// - Handles Base64 decode errors gracefully

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("PEM Storage (lib/crypto/pem.ts)", () => {
  beforeEach(() => {
    vi.resetModules();
    // Stub env vars required by env.ts validation
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CSRF_SECRET", "test-secret-key-for-testing-12345678");
    vi.stubEnv("NEXTAUTH_SECRET", "test-nextauth-secret-for-testing-123456");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key-for-testing-1234567890abcdef");
    vi.stubEnv("JOB_SIGNING_SECRET", "test-job-signing-secret-for-testing-12345678");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  // ======================================================================
  // Base64-encoded key (preferred)
  // ======================================================================

  it("should return decoded Base64 key when GOOGLE_SHEETS_PRIVATE_KEY_BASE64 is set", async () => {
    vi.stubEnv(
      "GOOGLE_SHEETS_PRIVATE_KEY_BASE64",
      Buffer.from("-----BEGIN PRIVATE KEY-----\nMOCKKEY\n-----END PRIVATE KEY-----").toString(
        "base64",
      ),
    );

    const { getGoogleSheetsPrivateKey } = await import("@/lib/crypto/pem");
    const result = getGoogleSheetsPrivateKey();

    expect(result).toBe("-----BEGIN PRIVATE KEY-----\nMOCKKEY\n-----END PRIVATE KEY-----");
  });

  it("should prefer Base64 key over raw key when both are set", async () => {
    vi.stubEnv(
      "GOOGLE_SHEETS_PRIVATE_KEY_BASE64",
      Buffer.from("base64-decoded-key").toString("base64"),
    );
    vi.stubEnv("GOOGLE_SHEETS_PRIVATE_KEY", "raw-key-should-not-be-used");

    const { getGoogleSheetsPrivateKey } = await import("@/lib/crypto/pem");
    const result = getGoogleSheetsPrivateKey();

    expect(result).toBe("base64-decoded-key");
  });

  // ======================================================================
  // Raw key fallback
  // ======================================================================

  it("should fall back to raw GOOGLE_SHEETS_PRIVATE_KEY when Base64 is not set", async () => {
    vi.stubEnv(
      "GOOGLE_SHEETS_PRIVATE_KEY",
      "-----BEGIN PRIVATE KEY-----\nRAWKEY\n-----END PRIVATE KEY-----",
    );

    const { getGoogleSheetsPrivateKey } = await import("@/lib/crypto/pem");
    const result = getGoogleSheetsPrivateKey();

    expect(result).toBe("-----BEGIN PRIVATE KEY-----\nRAWKEY\n-----END PRIVATE KEY-----");
  });

  // ======================================================================
  // Neither set → null
  // ======================================================================

  it("should return null when neither env var is set", async () => {
    const { getGoogleSheetsPrivateKey } = await import("@/lib/crypto/pem");
    const result = getGoogleSheetsPrivateKey();

    expect(result).toBeNull();
  });

  // ======================================================================
  // Edge cases
  // ======================================================================

  it("should handle empty Base64 string (falls back to raw key)", async () => {
    vi.stubEnv("GOOGLE_SHEETS_PRIVATE_KEY_BASE64", "");
    vi.stubEnv("GOOGLE_SHEETS_PRIVATE_KEY", "raw-fallback");

    const { getGoogleSheetsPrivateKey } = await import("@/lib/crypto/pem");
    const result = getGoogleSheetsPrivateKey();

    // Empty string is falsy, so it should go straight to fallback
    expect(result).toBe("raw-fallback");
  });

  it("should return empty string when raw key is empty", async () => {
    vi.stubEnv("GOOGLE_SHEETS_PRIVATE_KEY", "");

    const { getGoogleSheetsPrivateKey } = await import("@/lib/crypto/pem");
    const result = getGoogleSheetsPrivateKey();

    // "" is not nullish, so ?? returns "" (empty string is "set" even if empty)
    expect(result).toBe("");
  });

  it("should handle PEM with multi-line content correctly", async () => {
    const multiLinePem = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC6kE9
c8X2Fm5Gg3zH9Y7wQ5JpY6F7tH8KjR8vN5p4VnR6s7tIwIDAQAB
AoGBAK0sFmJz7kH5m4n3q8jR9vN5p4VnR6s7tIwIDAQABA
-----END PRIVATE KEY-----`;

    vi.stubEnv("GOOGLE_SHEETS_PRIVATE_KEY_BASE64", Buffer.from(multiLinePem).toString("base64"));

    const { getGoogleSheetsPrivateKey } = await import("@/lib/crypto/pem");
    const result = getGoogleSheetsPrivateKey();

    expect(result).toBe(multiLinePem);
  });
});
