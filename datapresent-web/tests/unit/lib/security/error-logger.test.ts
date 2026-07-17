// ==========================================
// Error Logger Tests
// ==========================================

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch globally
global.fetch = vi.fn().mockResolvedValue({ ok: true });

describe("error-logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logApiError", () => {
    it("should log error to console", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { logApiError } = await import("@/lib/security/error-logger");
      const error = new Error("Test error");

      await logApiError(error, { path: "/api/test", method: "POST" });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should include context in error data", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { logApiError } = await import("@/lib/security/error-logger");
      const error = new Error("Test error");

      await logApiError(error, {
        path: "/api/reports",
        method: "POST",
        userId: "user-123",
      });

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = consoleSpy.mock.calls[0][1];
      expect(loggedData).toContain("Test error");
      expect(loggedData).toContain("/api/reports");
      consoleSpy.mockRestore();
    });

    it("should send to external endpoint if configured", async () => {
      const originalEnv = process.env.ERROR_LOG_ENDPOINT;
      process.env.ERROR_LOG_ENDPOINT = "https://logs.example.com/api";

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { logApiError } = await import("@/lib/security/error-logger");
      const error = new Error("Test error");

      await logApiError(error, { path: "/api/test", method: "GET" });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://logs.example.com/api",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );

      consoleSpy.mockRestore();
      process.env.ERROR_LOG_ENDPOINT = originalEnv;
    });
  });

  describe("logSecurityEvent", () => {
    it("should log security event to console.warn", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      import("@/lib/security/error-logger").then(({ logSecurityEvent }) => {
        logSecurityEvent({
          type: "csrf_failure",
          path: "/api/submit",
          userId: "user-1",
        });

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    it("should include event type in log", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      import("@/lib/security/error-logger").then(({ logSecurityEvent }) => {
        logSecurityEvent({
          type: "auth_failure",
          path: "/api/login",
          details: "Invalid credentials",
        });

        expect(consoleSpy).toHaveBeenCalled();
        const loggedData = consoleSpy.mock.calls[0][1];
        expect(loggedData).toContain("auth_failure");
        consoleSpy.mockRestore();
      });
    });
  });
});
