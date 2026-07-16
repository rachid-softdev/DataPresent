// @vitest-environment node
// ==========================================
// Client IP Extraction Tests
// ==========================================
//
// Tests for extractClientIP() in lib/client-ip.ts:
// - Priority: cf-connecting-ip → x-real-ip → first IP from x-forwarded-for
// - Uses net.isIP() for validation
// - Rejects empty/newlines

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { extractClientIP } from "@/lib/client-ip";

function createRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost", { headers });
}

describe("extractClientIP", () => {
  it("should return cf-connecting-ip when present and valid", () => {
    const req = createRequest({
      "cf-connecting-ip": "203.0.113.1",
      "x-real-ip": "198.51.100.1",
      "x-forwarded-for": "192.0.2.1",
    });
    expect(extractClientIP(req)).toBe("203.0.113.1");
  });

  it("should fall back to x-real-ip when cf-connecting-ip is missing", () => {
    const req = createRequest({
      "x-real-ip": "198.51.100.1",
      "x-forwarded-for": "192.0.2.1",
    });
    expect(extractClientIP(req)).toBe("198.51.100.1");
  });

  it("should fall back to first IP from x-forwarded-for when others are missing", () => {
    const req = createRequest({
      "x-forwarded-for": "192.0.2.1",
    });
    expect(extractClientIP(req)).toBe("192.0.2.1");
  });

  it("should return null when no headers are present", () => {
    const req = createRequest({});
    expect(extractClientIP(req)).toBeNull();
  });

  it("should reject non-IP strings", () => {
    const req = createRequest({
      "cf-connecting-ip": "not-an-ip",
    });
    expect(extractClientIP(req)).toBeNull();
  });

  it("should return null when header is empty string", () => {
    const req = createRequest({
      "x-forwarded-for": "",
    });
    expect(extractClientIP(req)).toBeNull();
  });

  it("should return null when cf-connecting-ip is empty string", () => {
    const req = createRequest({
      "cf-connecting-ip": "",
    });
    expect(extractClientIP(req)).toBeNull();
  });

  it("should extract first IP from x-forwarded-for chain", () => {
    const req = createRequest({
      "x-forwarded-for": "203.0.113.1, 198.51.100.1, 192.0.2.1",
    });
    expect(extractClientIP(req)).toBe("203.0.113.1");
  });

  it("should handle IPv6 from x-forwarded-for", () => {
    const req = createRequest({
      "x-forwarded-for": "2001:db8::1",
    });
    expect(extractClientIP(req)).toBe("2001:db8::1");
  });

  it("should handle IPv6 from cf-connecting-ip", () => {
    const req = createRequest({
      "cf-connecting-ip": "::1",
    });
    expect(extractClientIP(req)).toBe("::1");
  });

  it("should prefer cf-connecting-ip even when x-forwarded-for has multiple IPs", () => {
    const req = createRequest({
      "cf-connecting-ip": "10.0.0.1",
      "x-forwarded-for": "203.0.113.1, 198.51.100.1",
    });
    expect(extractClientIP(req)).toBe("10.0.0.1");
  });

  it("should handle x-forwarded-for with trailing whitespace", () => {
    const req = createRequest({
      "x-forwarded-for": "  203.0.113.1  ",
    });
    expect(extractClientIP(req)).toBe("203.0.113.1");
  });
});
