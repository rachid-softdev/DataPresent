// ==========================================
// Tests for API versioning utilities
// ==========================================

import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_VERSION, buildV1Url, V1_ENDPOINTS } from "@/lib/api-versioning";

describe("api-versioning", () => {
  describe("API_VERSION", () => {
    it("should be a semantic version string", () => {
      expect(API_VERSION).toMatch(/^\d+\.\d+$/);
    });
  });

  describe("V1_ENDPOINTS", () => {
    it("should list all v1 endpoints with methods and descriptions", () => {
      expect(V1_ENDPOINTS.length).toBeGreaterThanOrEqual(4);

      const health = V1_ENDPOINTS.find((e) => e.path === "/api/v1/health");
      expect(health).toBeDefined();
      expect(health!.methods).toContain("GET");
    });

    it("each endpoint should have path, methods array, and description", () => {
      for (const ep of V1_ENDPOINTS) {
        expect(ep.path).toBeTruthy();
        expect(Array.isArray(ep.methods)).toBe(true);
        expect(ep.methods.length).toBeGreaterThan(0);
        expect(ep.description).toBeTruthy();
      }
    });
  });

  describe("buildV1Url", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should build a URL with leading slash normalized", () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.datapresent.com");
      const url = buildV1Url("/api/v1/health");
      expect(url).toBe("https://app.datapresent.com/api/v1/health");
    });

    it("should add leading slash if missing", () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.datapresent.com");
      const url = buildV1Url("api/v1/health");
      expect(url).toBe("https://app.datapresent.com/api/v1/health");
    });

    it("should fall back to NEXTAUTH_URL if NEXT_PUBLIC_APP_URL is not set", () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
      vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
      const url = buildV1Url("/api/v1/me");
      expect(url).toBe("http://localhost:3000/api/v1/me");
    });

    it("should fall back to localhost if no URL env vars are set", () => {
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
      vi.stubEnv("NEXTAUTH_URL", "");
      const url = buildV1Url("/api/v1/reports");
      expect(url).toBe("http://localhost:3000/api/v1/reports");
    });
  });
});
