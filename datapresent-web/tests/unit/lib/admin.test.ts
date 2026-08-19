// @vitest-environment node
// ==========================================
// lib/admin.ts — withAdmin unit tests
// ==========================================
//
// Covers the admin guard contract:
// - 401 when unauthenticated
// - 403 when the user role is not ADMIN (re-read from DB, not JWT)
// - 429 when rate limited
// - handler invoked with session + user context on success
// - 500 on handler/internal errors

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------
const mockAuth = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockExtractClientIP = vi.hoisted(() => vi.fn());
const mockPrismaUserFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/client-ip", () => ({
  extractClientIP: mockExtractClientIP,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockPrismaUserFindUnique,
    },
  },
}));

// Mock NextResponse so we can capture status + body
let lastStatus: number | undefined;
let lastBody: unknown;

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      lastBody = body;
      lastStatus = (init as { status?: number })?.status ?? 200;
      return { status: lastStatus, body };
    }),
  },
  NextRequest: vi.fn(),
}));

import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin";

function makeRequest(): Request {
  return new Request("http://localhost:3000/api/admin/plans", { method: "GET" });
}

describe("withAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastStatus = undefined;
    lastBody = undefined;

    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    mockPrismaUserFindUnique.mockResolvedValue({ role: "ADMIN" });
    mockCheckRateLimit.mockResolvedValue(true);
    mockExtractClientIP.mockReturnValue("1.2.3.4");
  });

  // -----------------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------------
  it("returns 401 when unauthenticated and never calls the handler", async () => {
    mockAuth.mockResolvedValue(null);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAdmin(handler);

    await wrapped(makeRequest(), { params: Promise.resolve({}) });

    expect(lastStatus).toBe(401);
    expect(lastBody).toEqual({ error: "Unauthorized" });
    expect(handler).not.toHaveBeenCalled();
    expect(mockPrismaUserFindUnique).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Authorization (role re-read from DB)
  // -----------------------------------------------------------------------
  it("returns 403 for a non-ADMIN role", async () => {
    mockPrismaUserFindUnique.mockResolvedValue({ role: "MEMBER" });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAdmin(handler);

    await wrapped(makeRequest(), { params: Promise.resolve({}) });

    expect(lastStatus).toBe(403);
    expect(lastBody).toEqual({ error: "Forbidden" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 403 when the user row is missing in DB", async () => {
    mockPrismaUserFindUnique.mockResolvedValue(null);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAdmin(handler);

    await wrapped(makeRequest(), { params: Promise.resolve({}) });

    expect(lastStatus).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("re-reads the role from DB (never trusts the session role)", async () => {
    // Session claims ADMIN but DB says MEMBER → must be 403
    mockAuth.mockResolvedValue({ user: { id: "impersonator", email: "x@y.z", role: "ADMIN" } });
    mockPrismaUserFindUnique.mockResolvedValue({ role: "MEMBER" });

    const handler = vi.fn();
    const wrapped = withAdmin(handler);

    await wrapped(makeRequest(), { params: Promise.resolve({}) });

    expect(lastStatus).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Rate limiting
  // -----------------------------------------------------------------------
  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue(false);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAdmin(handler, { rateLimit: { limit: 30, windowMs: 60_000 } });

    await wrapped(makeRequest(), { params: Promise.resolve({}) });

    expect(lastStatus).toBe(429);
    expect(lastBody).toEqual({ error: "Too many requests" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("uses the admin:{userId}:{ip} rate limit key", async () => {
    mockExtractClientIP.mockReturnValue("9.9.9.9");

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAdmin(handler, { rateLimit: { limit: 30, windowMs: 60_000 } });

    await wrapped(makeRequest(), { params: Promise.resolve({}) });

    expect(mockCheckRateLimit).toHaveBeenCalledWith("admin:admin-1:9.9.9.9", {
      limit: 30,
      windowMs: 60_000,
    });
  });

  it("falls back to 'unknown' IP when no client IP is available", async () => {
    mockExtractClientIP.mockReturnValue(null);

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAdmin(handler, { rateLimit: { limit: 30, windowMs: 60_000 } });

    await wrapped(makeRequest(), { params: Promise.resolve({}) });

    expect(mockCheckRateLimit).toHaveBeenCalledWith("admin:admin-1:unknown", expect.any(Object));
  });

  it("does not rate limit when no options are passed", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAdmin(handler);

    await wrapped(makeRequest(), { params: Promise.resolve({}) });

    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // Success path
  // -----------------------------------------------------------------------
  it("invokes the handler with session and DB user context", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAdmin(handler);

    const params = Promise.resolve({ id: "org-1" });
    await wrapped(makeRequest(), { params });

    expect(handler).toHaveBeenCalledTimes(1);
    const [req, context] = handler.mock.calls[0];
    expect(context.params).toBe(params);
    expect(context.session.user.id).toBe("admin-1");
    expect(context.user).toEqual({ role: "ADMIN" });
    expect(req.method).toBe("GET");
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  it("returns 500 when the handler throws", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("boom"));
    const wrapped = withAdmin(handler);

    await wrapped(makeRequest(), { params: Promise.resolve({}) });

    expect(lastStatus).toBe(500);
    expect(lastBody).toEqual({ error: "Internal server error" });
  });

  it("returns 500 when the DB role check throws", async () => {
    mockPrismaUserFindUnique.mockRejectedValue(new Error("db down"));

    const handler = vi.fn();
    const wrapped = withAdmin(handler);

    await wrapped(makeRequest(), { params: Promise.resolve({}) });

    expect(lastStatus).toBe(500);
    expect(handler).not.toHaveBeenCalled();
  });
});
