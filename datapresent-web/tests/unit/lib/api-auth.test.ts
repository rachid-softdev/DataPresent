// @vitest-environment node
// ==========================================
// API Auth Tests
// ==========================================
//
// Tests for lib/api-auth.ts:
// - extractApiKey reads Bearer / x-api-key headers
// - authenticateApiKey validates the key and checks apiAccess entitlement

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockValidateApiKey = vi.hoisted(() => vi.fn());
const mockHasFeature = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-keys", () => ({
  validateApiKey: mockValidateApiKey,
}));

vi.mock("@/lib/entitlements/feature-gate", () => ({
  hasFeature: mockHasFeature,
}));

import { authenticateApiKey, extractApiKey } from "@/lib/api-auth";

describe("extractApiKey", () => {
  it("should return null when no auth headers are present", () => {
    const request = new Request("http://localhost:3000/api/v1/reports");
    expect(extractApiKey(request)).toBeNull();
  });

  it("should extract a Bearer token (case-insensitive)", () => {
    const request = new Request("http://localhost:3000/api/v1/reports", {
      headers: { authorization: "Bearer dp_test_key" },
    });
    expect(extractApiKey(request)).toBe("dp_test_key");
  });

  it("should extract a lowercase bearer token", () => {
    const request = new Request("http://localhost:3000/api/v1/reports", {
      headers: { authorization: "bearer dp_test_key" },
    });
    expect(extractApiKey(request)).toBe("dp_test_key");
  });

  it("should extract an x-api-key header", () => {
    const request = new Request("http://localhost:3000/api/v1/reports", {
      headers: { "x-api-key": "dp_test_key" },
    });
    expect(extractApiKey(request)).toBe("dp_test_key");
  });

  it("should prefer Authorization Bearer over x-api-key", () => {
    const request = new Request("http://localhost:3000/api/v1/reports", {
      headers: {
        authorization: "Bearer dp_bearer",
        "x-api-key": "dp_header",
      },
    });
    expect(extractApiKey(request)).toBe("dp_bearer");
  });

  it("should return null for a non-Bearer authorization scheme", () => {
    const request = new Request("http://localhost:3000/api/v1/reports", {
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(extractApiKey(request)).toBeNull();
  });
});

describe("authenticateApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when no API key is present", async () => {
    const request = new Request("http://localhost:3000/api/v1/reports");
    const result = await authenticateApiKey(request);

    expect(result).toBeNull();
    expect(mockValidateApiKey).not.toHaveBeenCalled();
  });

  it("should return orgId and keyId for a valid key", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: true, orgId: "org_1", keyId: "key_1" });
    mockHasFeature.mockResolvedValue(true);

    const request = new Request("http://localhost:3000/api/v1/reports", {
      headers: { authorization: "Bearer dp_valid" },
    });
    const result = await authenticateApiKey(request);

    expect(result).toEqual({ orgId: "org_1", keyId: "key_1" });
    expect(mockValidateApiKey).toHaveBeenCalledWith("dp_valid");
    expect(mockHasFeature).toHaveBeenCalledWith("org_1", "apiAccess");
  });

  it("should return null for an invalid key", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: false });

    const request = new Request("http://localhost:3000/api/v1/reports", {
      headers: { "x-api-key": "dp_invalid" },
    });
    const result = await authenticateApiKey(request);

    expect(result).toBeNull();
    expect(mockHasFeature).not.toHaveBeenCalled();
  });

  it("should return null when the org no longer has apiAccess", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: true, orgId: "org_1", keyId: "key_1" });
    mockHasFeature.mockResolvedValue(false);

    const request = new Request("http://localhost:3000/api/v1/reports", {
      headers: { authorization: "Bearer dp_downgraded" },
    });
    const result = await authenticateApiKey(request);

    expect(result).toBeNull();
  });
});
