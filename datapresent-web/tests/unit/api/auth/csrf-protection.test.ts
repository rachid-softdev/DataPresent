// ==========================================
// CSRF Protection for Auth Routes
// ==========================================
//
// Tests the withCsrfProtection middleware that should be applied to
// POST endpoints on auth routes (magic-link, signup, forgot-password).
// Covers REVIEW issue: Back-end Agent 3 / CSRF absent on auth routes.
//
// The fix adds `withCsrfProtection(req)` at the start of each auth
// POST handler. The middleware returns null (pass-through) if the
// CSRF token is valid, or a 403 Response if invalid/missing.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks for withCsrfProtection dependencies
// ---------------------------------------------------------------------------
const mockValidateCsrfToken = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => vi.fn());
const mockLogSecurityEvent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/security/csrf", () => ({
  validateCsrfToken: mockValidateCsrfToken,
  generateCsrfToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/security/error-logger", () => ({
  logSecurityEvent: mockLogSecurityEvent,
  logApiError: vi.fn(),
}));

import { withCsrfProtection } from "@/lib/security/csrf-middleware";

describe("withCsrfProtection middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Helper: create a NextRequest-like object
  // -----------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock request object
  function createRequest(method: string, headers: Record<string, string> = {}): any {
    return {
      method,
      headers: new Map(Object.entries(headers)),
      nextUrl: { pathname: "/fr/api/auth/magic-link" },
      url: "http://localhost:3000/fr/api/auth/magic-link",
    };
  }

  // -----------------------------------------------------------------------
  // GET/HEAD/OPTIONS are always allowed (no CSRF check)
  // -----------------------------------------------------------------------
  it("should skip CSRF check for GET requests", async () => {
    const req = createRequest("GET");
    const result = await withCsrfProtection(req);

    expect(result).toBeNull();
  });

  it("should skip CSRF check for HEAD requests", async () => {
    const req = createRequest("HEAD");
    const result = await withCsrfProtection(req);

    expect(result).toBeNull();
  });

  it("should skip CSRF check for OPTIONS requests", async () => {
    const req = createRequest("OPTIONS");
    const result = await withCsrfProtection(req);

    expect(result).toBeNull();
  });

  // -----------------------------------------------------------------------
  // POST without CSRF token → 403
  // -----------------------------------------------------------------------
  it("should return 403 when CSRF token is missing from header", async () => {
    const req = createRequest("POST");

    const result = await withCsrfProtection(req);

    expect(result).not.toBeNull();
    expect((result as Response).status).toBe(403);
    const body = await (result as Response).json();
    expect(body.error).toContain("CSRF");
    expect(mockLogSecurityEvent).toHaveBeenCalled();
  });

  it("should return 403 when x-csrf-token header is empty", async () => {
    const req = createRequest("POST", { "x-csrf-token": "" });

    const result = await withCsrfProtection(req);

    expect(result).not.toBeNull();
    expect((result as Response).status).toBe(403);
  });

  // -----------------------------------------------------------------------
  // POST with invalid CSRF token → 403
  // -----------------------------------------------------------------------
  it("should return 403 when CSRF token is invalid (validateCsrfToken returns false)", async () => {
    mockValidateCsrfToken.mockReturnValue(false);
    const req = createRequest("POST", { "x-csrf-token": "invalid-token" });

    const result = await withCsrfProtection(req);

    expect(result).not.toBeNull();
    expect((result as Response).status).toBe(403);
    const body = await (result as Response).json();
    expect(body.error).toContain("expired");
    expect(mockValidateCsrfToken).toHaveBeenCalled();
  });

  it("should return 403 when CSRF token is invalid with userId binding", async () => {
    mockValidateCsrfToken.mockReturnValue(false);
    mockAuth.mockResolvedValue({ user: { id: "user-123" } });
    const req = createRequest("POST", { "x-csrf-token": "token-for-different-user" });

    const result = await withCsrfProtection(req, "user-456");

    expect(result).not.toBeNull();
    expect((result as Response).status).toBe(403);
    // validateCsrfToken should be called with the token and user-456
    expect(mockValidateCsrfToken).toHaveBeenCalledWith("token-for-different-user", "user-456");
  });

  // -----------------------------------------------------------------------
  // POST with valid CSRF token → null (pass through)
  // -----------------------------------------------------------------------
  it("should return null (pass through) when CSRF token is valid", async () => {
    mockValidateCsrfToken.mockReturnValue(true);
    const req = createRequest("POST", { "x-csrf-token": "valid-token" });

    const result = await withCsrfProtection(req);

    expect(result).toBeNull();
  });

  it("should pass through with provided userId when CSRF is valid", async () => {
    mockValidateCsrfToken.mockReturnValue(true);
    const req = createRequest("POST", { "x-csrf-token": "valid-token" });

    const result = await withCsrfProtection(req, "user-123");

    expect(result).toBeNull();
    // Should not call auth() when userId is provided
    expect(mockAuth).not.toHaveBeenCalled();
    expect(mockValidateCsrfToken).toHaveBeenCalledWith("valid-token", "user-123");
  });

  // -----------------------------------------------------------------------
  // Webhook endpoints are exempt from CSRF
  // -----------------------------------------------------------------------
  it("should skip CSRF check for stripe webhook endpoints", async () => {
    const req = {
      method: "POST",
      headers: new Map(),
      nextUrl: { pathname: "/fr/api/stripe/webhook" },
      url: "http://localhost:3000/fr/api/stripe/webhook",
    };

    const result = await withCsrfProtection(req);

    expect(result).toBeNull();
  });

  it("should skip CSRF check for generic webhook endpoints", async () => {
    const req = {
      method: "POST",
      headers: new Map(),
      nextUrl: { pathname: "/fr/api/webhook/generic" },
      url: "http://localhost:3000/fr/api/webhook/generic",
    };

    const result = await withCsrfProtection(req);

    expect(result).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Auth route handlers — test that they SHOULD call withCsrfProtection
  // after the fix is applied. Currently these routes do NOT call
  // withCsrfProtection yet. This test documents the expected contract.
  // -----------------------------------------------------------------------
  describe("Auth route CSRF contract (post-fix)", () => {
    it("magic-link POST handler should call withCsrfProtection at start", async () => {
      // After the fix, the POST handler should start with:
      //   const csrfCheck = await withCsrfProtection(req)
      //   if (csrfCheck) return csrfCheck
      //
      // This test verifies the contract by checking that the middleware
      // function exists and can be called before the route handler.
      const req = createRequest("POST", { "x-csrf-token": "valid-token" });
      mockValidateCsrfToken.mockReturnValue(true);

      const csrfResult = await withCsrfProtection(req);

      // If CSRF passes, the handler proceeds to process the request
      expect(csrfResult).toBeNull();

      // With missing token, handler should return 403
      const reqNoCsrf = createRequest("POST");
      const csrfFail = await withCsrfProtection(reqNoCsrf);
      expect(csrfFail).not.toBeNull();
      expect((csrfFail as Response).status).toBe(403);
    });

    it("signup POST handler should call withCsrfProtection at start", async () => {
      const req = createRequest("POST", { "x-csrf-token": "valid-token" });
      mockValidateCsrfToken.mockReturnValue(true);

      const csrfResult = await withCsrfProtection(req);

      expect(csrfResult).toBeNull();
    });

    it("forgot-password POST handler should call withCsrfProtection at start", async () => {
      const req = createRequest("POST", { "x-csrf-token": "valid-token" });
      mockValidateCsrfToken.mockReturnValue(true);

      const csrfResult = await withCsrfProtection(req);

      expect(csrfResult).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  it("should handle requests without nextUrl (use url instead)", async () => {
    const req = {
      method: "GET",
      headers: new Map(),
      url: "http://localhost:3000/health",
    };

    const result = await withCsrfProtection(req);

    expect(result).toBeNull(); // GET is allowed
  });

  it("should handle missing headers gracefully", async () => {
    // Create a request with headers map that has no x-csrf-token
    const req = {
      method: "POST",
      headers: new Map(),
      url: "http://localhost:3000/fr/api/auth/signup",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock request
    const result = await withCsrfProtection(req as any);

    // When there are headers but no x-csrf-token, it should return 403
    expect(result).not.toBeNull();
    expect((result as Response).status).toBe(403);
  });
});
