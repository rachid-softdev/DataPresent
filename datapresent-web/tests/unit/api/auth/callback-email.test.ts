// @vitest-environment node
// ==========================================
// Magic Link — Callback Email POST Tests (Item 12)
// ==========================================
//
// Tests the POST handler at /api/auth/callback/email/route.ts:
// - Valid token calls signIn("credentials", { token })
// - Missing token returns 400 error
// - signIn error returns 401
// - Catch-all error returns 500

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mockSignIn = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  signIn: mockSignIn,
}));

// prisma is not used in the POST route, but mock to avoid import error
vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

// ---------------------------------------------------------------------------
// Import the route handler
// ---------------------------------------------------------------------------
import { POST } from "@/app/[locale]/api/auth/callback/email/route";

describe("Email Callback POST Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ======================================================================
  // Success cases
  // ======================================================================

  it("should call signIn with credentials and token on valid request", async () => {
    // SignIn returns undefined (no error) for a successful auth
    mockSignIn.mockResolvedValueOnce(undefined);

    const req = {
      json: vi.fn().mockResolvedValueOnce({ token: "valid-token-123" }),
    } as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      token: "valid-token-123",
      redirect: false,
    });
  });

  it("should return 200 when signIn returns undefined (no error, no url)", async () => {
    mockSignIn.mockResolvedValueOnce(undefined);

    const req = {
      json: vi.fn().mockResolvedValueOnce({ token: "valid-token" }),
    } as any;

    const response = await POST(req);
    const data = await response.json();

    // signIn returning undefined or without error should still be success
    expect(data).toHaveProperty("success", true);
  });

  it("should return 200 when signIn returns a string (old contract)", async () => {
    mockSignIn.mockResolvedValueOnce("/dashboard");

    const req = {
      json: vi.fn().mockResolvedValueOnce({ token: "valid-token" }),
    } as any;

    const response = await POST(req);
    const data = await response.json();

    expect(data).toHaveProperty("success", true);
  });

  // ======================================================================
  // Error cases
  // ======================================================================

  it("should return 400 when token is missing", async () => {
    const req = {
      json: vi.fn().mockResolvedValueOnce({}),
    } as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty("error", "errors.auth.invalidToken");
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("should return 400 when token is not a string", async () => {
    const req = {
      json: vi.fn().mockResolvedValueOnce({ token: 12345 }),
    } as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty("error", "errors.auth.invalidToken");
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("should return 401 when signIn returns an error", async () => {
    mockSignIn.mockResolvedValueOnce({
      error: "errors.auth.invalidToken",
    });

    const req = {
      json: vi.fn().mockResolvedValueOnce({ token: "expired-token" }),
    } as any;

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty("error", "errors.auth.invalidToken");
  });

  it("should return 500 when an unexpected error occurs", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("Database connection failed"));

    // Spy on console.error to suppress error output in tests
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const req = {
      json: vi.fn().mockResolvedValueOnce({ token: "valid-token" }),
    } as any;

    const response = await POST(req);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error", "errors.auth.failed");

    consoleSpy.mockRestore();
  });

  it("should return 500 when JSON parsing fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const req = {
      json: vi.fn().mockRejectedValueOnce(new Error("Invalid JSON")),
    } as any;

    const response = await POST(req);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty("error", "errors.auth.failed");

    consoleSpy.mockRestore();
  });

  // ======================================================================
  // Request validation
  // ======================================================================

  it("should call req.json() exactly once", async () => {
    const jsonFn = vi.fn().mockResolvedValueOnce({ token: "valid-token" });
    mockSignIn.mockResolvedValueOnce({ url: "/" });

    const req = { json: jsonFn } as any;
    await POST(req);

    expect(jsonFn).toHaveBeenCalledTimes(1);
  });
});
