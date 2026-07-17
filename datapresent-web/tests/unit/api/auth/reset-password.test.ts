// ==========================================
// Reset Password Endpoint Tests
// ==========================================
//
// Tests POST /api/auth/reset-password:
// - Token and password validation
// - Weak password rejection
// - Invalid/expired token handling
// - Successful password creation and update
// - Token marked as used after reset
// - Transactional atomicity

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock setup — all mock variables must use vi.hoisted
// ---------------------------------------------------------------------------
const mockWithCsrfProtection = vi.hoisted(() => vi.fn());
const mockLogApiError = vi.hoisted(() => vi.fn());

vi.mock("@/lib/security", () => ({
  withCsrfProtection: mockWithCsrfProtection,
  logApiError: mockLogApiError,
}));

const mockVerifyToken = vi.hoisted(() => vi.fn());
const mockExtractTokenPrefix = vi.hoisted(() => vi.fn());

vi.mock("@/lib/crypto", () => ({
  verifyToken: mockVerifyToken,
  extractTokenPrefix: mockExtractTokenPrefix,
}));

const mockHashPassword = vi.hoisted(() => vi.fn());
const mockIsPasswordValid = vi.hoisted(() => vi.fn());

vi.mock("@/lib/password", () => ({
  hashPassword: mockHashPassword,
  isPasswordValid: mockIsPasswordValid,
}));

const mockPrisma = vi.hoisted(() => ({
  passwordResetToken: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  password: {
    upsert: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// State holders for NextResponse.json
let mockResponseStatus: number | undefined;
let mockResponseBody: unknown;

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: ResponseInit) => {
      mockResponseBody = body;
      mockResponseStatus = (init as { status?: number })?.status ?? 200;
      return {
        status: mockResponseStatus,
        body,
        json: async () => body,
      };
    }),
  },
  NextRequest: vi.fn(),
}));

import { POST } from "@/app/[locale]/api/auth/reset-password/route";

function createRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Reset Password Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponseStatus = undefined;
    mockResponseBody = undefined;

    // Default: CSRF passes through
    mockWithCsrfProtection.mockResolvedValue(null);

    // Default: password is valid
    mockIsPasswordValid.mockReturnValue(true);

    // Default: prefix extraction
    mockExtractTokenPrefix.mockReturnValue("prefix-1234");

    // Default: token verification succeeds
    mockVerifyToken.mockResolvedValue(true);

    // Default: found reset token
    mockPrisma.passwordResetToken.findMany.mockResolvedValue([
      { id: "token-1", email: "test@example.com", token: "full-token-value" },
    ]);

    // Default: found user
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
    });

    // Default: password upsert succeeds
    mockPrisma.password.upsert.mockResolvedValue({ id: "pw-1" });
    mockPrisma.passwordResetToken.update.mockResolvedValue({ id: "token-1", used: true });

    // Default: hash password
    mockHashPassword.mockResolvedValue("hashed-password-value");

    // Default: transaction resolves — passes through each item's resolved value
    mockPrisma.$transaction.mockImplementation(async (queries: unknown[]) => {
      return Promise.all(queries as Promise<unknown>[]);
    });
  });

  // -----------------------------------------------------------------------
  // Validation: missing fields
  // -----------------------------------------------------------------------
  it("should reject request with missing token", async () => {
    await POST(createRequest({ password: "ValidP@ss1234" }));

    expect(mockResponseStatus).toBe(400);
    expect((mockResponseBody as any)?.error).toHaveProperty("token");
    expect(mockPrisma.password.upsert).not.toHaveBeenCalled();
  });

  it("should reject request with missing password", async () => {
    await POST(createRequest({ token: "some-token" }));

    expect(mockResponseStatus).toBe(400);
    expect((mockResponseBody as any)?.error).toHaveProperty("password");
  });

  it("should reject missing both token and password", async () => {
    await POST(createRequest({}));

    expect(mockResponseStatus).toBe(400);
  });

  // -----------------------------------------------------------------------
  // Validation: weak password
  // -----------------------------------------------------------------------
  it("should reject weak password", async () => {
    mockIsPasswordValid.mockReturnValue(false);

    await POST(createRequest({ token: "valid-token", password: "weak" }));

    expect(mockResponseStatus).toBe(400);
    // Zod schema refinement returns complexity error
    expect((mockResponseBody as any)?.error).toHaveProperty("password");
    expect(mockPrisma.password.upsert).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Validation: invalid / expired token
  // -----------------------------------------------------------------------
  it("should reject invalid token", async () => {
    mockPrisma.passwordResetToken.findMany.mockResolvedValue([]);

    await POST(createRequest({ token: "invalid-token", password: "ValidP@ss1234" }));

    expect(mockResponseStatus).toBe(400);
    expect((mockResponseBody as any)?.error).toBe("Invalid reset token");
    expect(mockPrisma.password.upsert).not.toHaveBeenCalled();
  });

  it("should reject expired token", async () => {
    // Token exists but verification fails (expired token's hash won't match)
    mockVerifyToken.mockResolvedValue(false);
    mockPrisma.passwordResetToken.findMany.mockResolvedValue([
      { id: "token-1", email: "test@example.com", token: "full-token-value" },
    ]);

    await POST(createRequest({ token: "expired-token", password: "ValidP@ss1234" }));

    expect(mockResponseStatus).toBe(400);
    expect((mockResponseBody as any)?.error).toBe("Invalid reset token");
    expect(mockPrisma.password.upsert).not.toHaveBeenCalled();
  });

  it("should reject token for non-existent user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await POST(createRequest({ token: "valid-token", password: "ValidP@ss1234" }));

    expect(mockResponseStatus).toBe(404);
    expect((mockResponseBody as any)?.error).toBe("User not found");
  });

  // -----------------------------------------------------------------------
  // Successful password set / reset
  // -----------------------------------------------------------------------
  it("should create password for first-time set", async () => {
    await POST(createRequest({ token: "valid-token", password: "NewStr0ng!Pass" }));

    expect(mockHashPassword).toHaveBeenCalledWith("NewStr0ng!Pass");
    expect(mockResponseStatus).toBe(200);
    expect((mockResponseBody as any)?.success).toBe(true);
    expect((mockResponseBody as any)?.message).toContain("reset successfully");
  });

  it("should update password on re-reset", async () => {
    // Simulate re-reset — same flow; upsert handles both create and update
    await POST(createRequest({ token: "another-token", password: "UpdatedStr0ng!1" }));

    expect(mockHashPassword).toHaveBeenCalledWith("UpdatedStr0ng!1");
    expect(mockResponseStatus).toBe(200);
    expect((mockResponseBody as any)?.success).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Token usage tracking
  // -----------------------------------------------------------------------
  it("should mark token as used after reset", async () => {
    await POST(createRequest({ token: "valid-token", password: "ValidP@ss1234" }));

    // The transaction should include the token update
    expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "token-1" },
        data: { used: true },
      }),
    );
  });

  // -----------------------------------------------------------------------
  // Transactional atomicity
  // -----------------------------------------------------------------------
  it("should wrap upsert and token update in a transaction", async () => {
    await POST(createRequest({ token: "valid-token", password: "ValidP@ss1234" }));

    expect(mockPrisma.$transaction).toHaveBeenCalled();

    // Verify password.upsert was called with correct args
    expect(mockPrisma.password.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1", hash: "hashed-password-value" },
      update: { hash: "hashed-password-value" },
    });

    // Verify token update was called with correct args
    expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith({
      where: { id: "token-1" },
      data: { used: true },
    });
  });

  // -----------------------------------------------------------------------
  // CSRF protection
  // -----------------------------------------------------------------------
  it("should return CSRF response when CSRF check fails", async () => {
    const csrfResponse = new Response("CSRF failed", { status: 403 });
    mockWithCsrfProtection.mockResolvedValue(csrfResponse);

    const result = await POST(createRequest({ token: "t", password: "ValidP@ss1234" }));

    expect(result).toBe(csrfResponse);
    expect(mockPrisma.password.upsert).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  it("should handle internal errors gracefully", async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error("DB error"));

    await POST(createRequest({ token: "valid-token", password: "ValidP@ss1234" }));

    expect(mockLogApiError).toHaveBeenCalled();
    expect(mockResponseStatus).toBe(500);
    expect((mockResponseBody as any)?.error).toBe("An error occurred");
  });
});
