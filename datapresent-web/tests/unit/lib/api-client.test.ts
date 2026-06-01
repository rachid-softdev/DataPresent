// ==========================================
// Client-Side CSRF Helper (apiFetch) Tests
// ==========================================
//
// Tests the api-client.ts module:
// - invalidateCsrfToken resets the promise
// - apiFetch adds x-csrf-token for mutations
// - apiFetch skips CSRF header for GET requests
// - Fallback behavior when CSRF fetch fails

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();

// Valid CSRF token shape
const VALID_CSRF_TOKEN = "aa:bb:cc";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset fetch mock
  vi.stubGlobal("fetch", mockFetch);
  // By default, CSRF token endpoint returns a valid token
  mockFetch.mockImplementation((url: string) => {
    if (url === "/api/csrf-token") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: VALID_CSRF_TOKEN }),
      });
    }
    // Default response for other URLs
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
  });

  // Reset internal CSRF token cache
  // Use dynamic import to access the module and invalidate the cached promise
  import("@/lib/api-client").then((mod) => mod.invalidateCsrfToken()).catch(() => {});
});

// Import after mocks are set up — we need fresh module for each test
async function getApiClient() {
  return import("@/lib/api-client");
}

describe("api-client", () => {
  describe("invalidateCsrfToken", () => {
    it("should reset the csrf token promise", async () => {
      const { invalidateCsrfToken, apiFetch } = await getApiClient();

      // First call should fetch a token
      mockFetch.mockClear();
      await apiFetch("/api/test", { method: "POST" });
      expect(mockFetch).toHaveBeenCalledWith("/api/csrf-token");

      // Invalidate
      invalidateCsrfToken();
      mockFetch.mockClear();

      // Second call should fetch token again
      await apiFetch("/api/test", { method: "POST" });
      expect(mockFetch).toHaveBeenCalledWith("/api/csrf-token");
    });
  });

  describe("apiFetch - CSRF token attachment", () => {
    it("should add x-csrf-token header for POST requests", async () => {
      const { apiFetch } = await getApiClient();

      mockFetch.mockClear();
      await apiFetch("/api/reports", { method: "POST" });

      // Expect two fetch calls: one for CSRF token, one for actual request
      const actualRequestCall = mockFetch.mock.calls.find(
        (call: [string, unknown]) => call[0] === "/api/reports",
      );
      expect(actualRequestCall).toBeDefined();

      const headers = (actualRequestCall as [string, RequestInit])[1].headers as Record<
        string,
        string
      >;
      expect(headers["x-csrf-token"]).toBe(VALID_CSRF_TOKEN);
    });

    it("should add x-csrf-token header for PUT requests", async () => {
      const { apiFetch } = await getApiClient();

      mockFetch.mockClear();
      await apiFetch("/api/reports/123", { method: "PUT" });

      const actualRequestCall = mockFetch.mock.calls.find(
        (call: [string, unknown]) => call[0] === "/api/reports/123",
      );
      expect(actualRequestCall).toBeDefined();
      const headers = (actualRequestCall as [string, RequestInit])[1].headers as Record<
        string,
        string
      >;
      expect(headers["x-csrf-token"]).toBe(VALID_CSRF_TOKEN);
    });

    it("should add x-csrf-token header for PATCH requests", async () => {
      const { apiFetch } = await getApiClient();

      mockFetch.mockClear();
      await apiFetch("/api/reports/123", { method: "PATCH" });

      const actualRequestCall = mockFetch.mock.calls.find(
        (call: [string, unknown]) => call[0] === "/api/reports/123",
      );
      expect(actualRequestCall).toBeDefined();
      const headers = (actualRequestCall as [string, RequestInit])[1].headers as Record<
        string,
        string
      >;
      expect(headers["x-csrf-token"]).toBe(VALID_CSRF_TOKEN);
    });

    it("should add x-csrf-token header for DELETE requests", async () => {
      const { apiFetch } = await getApiClient();

      mockFetch.mockClear();
      await apiFetch("/api/reports/123", { method: "DELETE" });

      const actualRequestCall = mockFetch.mock.calls.find(
        (call: [string, unknown]) => call[0] === "/api/reports/123",
      );
      expect(actualRequestCall).toBeDefined();
      const headers = (actualRequestCall as [string, RequestInit])[1].headers as Record<
        string,
        string
      >;
      expect(headers["x-csrf-token"]).toBe(VALID_CSRF_TOKEN);
    });

    it("should NOT add x-csrf-token header for GET requests", async () => {
      const { apiFetch } = await getApiClient();

      mockFetch.mockClear();
      await apiFetch("/api/reports", { method: "GET" });

      // GET should NOT call CSRF token endpoint
      const csrfCall = mockFetch.mock.calls.find(
        (call: [string, unknown]) => call[0] === "/api/csrf-token",
      );
      expect(csrfCall).toBeUndefined();
    });

    it("should NOT add x-csrf-token header for default (no method = GET)", async () => {
      const { apiFetch } = await getApiClient();

      mockFetch.mockClear();
      await apiFetch("/api/reports");

      const csrfCall = mockFetch.mock.calls.find(
        (call: [string, unknown]) => call[0] === "/api/csrf-token",
      );
      expect(csrfCall).toBeUndefined();
    });

    it("should set Content-Type: application/json by default", async () => {
      const { apiFetch } = await getApiClient();

      mockFetch.mockClear();
      await apiFetch("/api/reports", { method: "POST" });

      const actualRequestCall = mockFetch.mock.calls.find(
        (call: [string, unknown]) => call[0] === "/api/reports",
      );
      expect(actualRequestCall).toBeDefined();
      const headers = (actualRequestCall as [string, RequestInit])[1].headers as Record<
        string,
        string
      >;
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should preserve custom headers when adding CSRF token", async () => {
      const { apiFetch } = await getApiClient();

      mockFetch.mockClear();
      await apiFetch("/api/reports", {
        method: "POST",
        headers: { "X-Custom": "my-value" },
      });

      const actualRequestCall = mockFetch.mock.calls.find(
        (call: [string, unknown]) => call[0] === "/api/reports",
      );
      expect(actualRequestCall).toBeDefined();
      const headers = (actualRequestCall as [string, RequestInit])[1].headers as Record<
        string,
        string
      >;
      expect(headers["X-Custom"]).toBe("my-value");
      expect(headers["x-csrf-token"]).toBe(VALID_CSRF_TOKEN);
    });
  });

  describe("apiFetch - CSRF fetch failure", () => {
    it("should proceed without CSRF token when CSRF endpoint fails", async () => {
      const { apiFetch } = await getApiClient();

      // Make CSRF endpoint fail
      const failingCsrfFetch = vi.fn((url: string) => {
        if (url === "/api/csrf-token") {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      });
      vi.stubGlobal("fetch", failingCsrfFetch);

      // Reset the cached promise
      const { invalidateCsrfToken: invalidate } = await getApiClient();
      invalidate();

      const response = await apiFetch("/api/reports", { method: "POST" });
      // Request should still go through (server will reject if CSRF is required)
      expect(response).toBeDefined();
    });
  });

  describe("apiFetch - CSRF token caching", () => {
    it("should reuse the same token for multiple mutations", async () => {
      const { apiFetch } = await getApiClient();

      mockFetch.mockClear();

      // Make two mutations
      await apiFetch("/api/reports", { method: "POST" });
      await apiFetch("/api/reports/123", { method: "DELETE" });

      // CSRF token endpoint should only be called once
      const csrfCalls = mockFetch.mock.calls.filter(
        (call: [string, unknown]) => call[0] === "/api/csrf-token",
      );
      expect(csrfCalls.length).toBe(1);
    });
  });
});
