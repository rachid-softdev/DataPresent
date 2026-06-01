// ==========================================
// Cleanup Expired Tokens Tests
// ==========================================
//
// Tests the cleanupExpiredTokens function in scripts/cleanup-tokens.ts:
// - Deletes expired magic link tokens
// - Deletes expired password reset tokens
// - Deletes expired invite tokens
// - Deletes expired rate limit records
// - Returns correct counts
// - Handles empty results (no expired tokens)

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock process.exit to prevent the module-level main() call from exiting.
// vi.hoisted runs before vi.mock factories, which run before imports,
// so overriding process.exit here ensures the module-level main() in
// cleanup-tokens.ts uses the mocked version.
// ---------------------------------------------------------------------------
vi.hoisted(() => {
  process.exit = vi.fn() as unknown as (code?: number) => never;
});

// ---------------------------------------------------------------------------
// Mock variables
// ---------------------------------------------------------------------------
const mockMagicLinkDeleteMany = vi.hoisted(() => vi.fn());
const mockPasswordResetDeleteMany = vi.hoisted(() => vi.fn());
const mockInviteDeleteMany = vi.hoisted(() => vi.fn());
const mockRateLimitDeleteMany = vi.hoisted(() => vi.fn());
const mockPrismaDisconnect = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    magicLinkToken: {
      deleteMany: mockMagicLinkDeleteMany,
    },
    passwordResetToken: {
      deleteMany: mockPasswordResetDeleteMany,
    },
    inviteToken: {
      deleteMany: mockInviteDeleteMany,
    },
    rateLimit: {
      deleteMany: mockRateLimitDeleteMany,
    },
    $disconnect: mockPrismaDisconnect,
  },
}));

// ---------------------------------------------------------------------------
// Import the module under test
// ---------------------------------------------------------------------------
import { cleanupExpiredTokens } from "@/scripts/cleanup-tokens";

describe("cleanupExpiredTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Happy path — all token types have expired records
  // -----------------------------------------------------------------------
  it("should delete expired tokens from all four tables and return counts", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 5 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 3 });
    mockInviteDeleteMany.mockResolvedValue({ count: 2 });
    mockRateLimitDeleteMany.mockResolvedValue({ count: 1 });

    // Act
    const result = await cleanupExpiredTokens();

    // Assert
    expect(result).toEqual({
      magicLinkTokens: 5,
      passwordResetTokens: 3,
      inviteTokens: 2,
      rateLimits: 1,
      total: 11,
    });
  });

  // -----------------------------------------------------------------------
  // No expired tokens
  // -----------------------------------------------------------------------
  it("should return zero counts when there are no expired tokens", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 0 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 0 });
    mockInviteDeleteMany.mockResolvedValue({ count: 0 });
    mockRateLimitDeleteMany.mockResolvedValue({ count: 0 });

    // Act
    const result = await cleanupExpiredTokens();

    // Assert
    expect(result).toEqual({
      magicLinkTokens: 0,
      passwordResetTokens: 0,
      inviteTokens: 0,
      rateLimits: 0,
      total: 0,
    });
  });

  // -----------------------------------------------------------------------
  // Only magic link tokens
  // -----------------------------------------------------------------------
  it("should handle only magic link tokens being expired", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 7 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 0 });
    mockInviteDeleteMany.mockResolvedValue({ count: 0 });
    mockRateLimitDeleteMany.mockResolvedValue({ count: 0 });

    // Act
    const result = await cleanupExpiredTokens();

    // Assert
    expect(result).toEqual({
      magicLinkTokens: 7,
      passwordResetTokens: 0,
      inviteTokens: 0,
      rateLimits: 0,
      total: 7,
    });
  });

  // -----------------------------------------------------------------------
  // Only password reset tokens
  // -----------------------------------------------------------------------
  it("should handle only password reset tokens being expired", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 0 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 4 });
    mockInviteDeleteMany.mockResolvedValue({ count: 0 });
    mockRateLimitDeleteMany.mockResolvedValue({ count: 0 });

    // Act
    const result = await cleanupExpiredTokens();

    // Assert
    expect(result).toEqual({
      magicLinkTokens: 0,
      passwordResetTokens: 4,
      inviteTokens: 0,
      rateLimits: 0,
      total: 4,
    });
  });

  // -----------------------------------------------------------------------
  // Only invite tokens
  // -----------------------------------------------------------------------
  it("should handle only invite tokens being expired", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 0 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 0 });
    mockInviteDeleteMany.mockResolvedValue({ count: 6 });
    mockRateLimitDeleteMany.mockResolvedValue({ count: 0 });

    // Act
    const result = await cleanupExpiredTokens();

    // Assert
    expect(result).toEqual({
      magicLinkTokens: 0,
      passwordResetTokens: 0,
      inviteTokens: 6,
      rateLimits: 0,
      total: 6,
    });
  });

  // -----------------------------------------------------------------------
  // Only rate limits
  // -----------------------------------------------------------------------
  it("should handle only rate limit records being expired", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 0 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 0 });
    mockInviteDeleteMany.mockResolvedValue({ count: 0 });
    mockRateLimitDeleteMany.mockResolvedValue({ count: 10 });

    // Act
    const result = await cleanupExpiredTokens();

    // Assert
    expect(result).toEqual({
      magicLinkTokens: 0,
      passwordResetTokens: 0,
      inviteTokens: 0,
      rateLimits: 10,
      total: 10,
    });
  });

  // -----------------------------------------------------------------------
  // Large numbers
  // -----------------------------------------------------------------------
  it("should handle large numbers of expired tokens", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 1000 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 500 });
    mockInviteDeleteMany.mockResolvedValue({ count: 250 });
    mockRateLimitDeleteMany.mockResolvedValue({ count: 100 });

    // Act
    const result = await cleanupExpiredTokens();

    // Assert
    expect(result).toEqual({
      magicLinkTokens: 1000,
      passwordResetTokens: 500,
      inviteTokens: 250,
      rateLimits: 100,
      total: 1850,
    });
  });

  // -----------------------------------------------------------------------
  // Verifies the WHERE clause uses used + createdAt for magic links, expires for others
  // -----------------------------------------------------------------------
  it("should query with used/createdAt for magic links and expires for others", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 1 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 1 });
    mockInviteDeleteMany.mockResolvedValue({ count: 1 });
    mockRateLimitDeleteMany.mockResolvedValue({ count: 1 });

    const beforeTest = Date.now();

    // Act
    await cleanupExpiredTokens();

    // Assert
    expect(mockMagicLinkDeleteMany).toHaveBeenCalledTimes(1);
    expect(mockPasswordResetDeleteMany).toHaveBeenCalledTimes(1);
    expect(mockInviteDeleteMany).toHaveBeenCalledTimes(1);
    expect(mockRateLimitDeleteMany).toHaveBeenCalledTimes(1);

    // MagicLinkToken: OR [used: true, createdAt < 7 days ago] OR [used: false, expires < now]
    const magicCall = mockMagicLinkDeleteMany.mock.calls[0][0];
    expect(magicCall).toHaveProperty("where");
    expect(magicCall.where).toHaveProperty("OR");
    expect(Array.isArray(magicCall.where.OR)).toBe(true);
    expect(magicCall.where.OR).toHaveLength(2);

    // First condition: used: true, createdAt < 7 days ago
    const condUsed = magicCall.where.OR[0];
    expect(condUsed).toHaveProperty("used");
    expect(condUsed.used).toBe(true);
    expect(condUsed).toHaveProperty("createdAt");
    expect(condUsed.createdAt).toHaveProperty("lt");
    expect(condUsed.createdAt.lt).toBeInstanceOf(Date);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const expectedMin = beforeTest - sevenDaysMs - 100;
    const expectedMax = beforeTest - sevenDaysMs + 100;
    expect(condUsed.createdAt.lt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(condUsed.createdAt.lt.getTime()).toBeLessThanOrEqual(expectedMax);

    // Second condition: used: false, expires < now
    const condExpired = magicCall.where.OR[1];
    expect(condExpired).toHaveProperty("used");
    expect(condExpired.used).toBe(false);
    expect(condExpired).toHaveProperty("expires");
    expect(condExpired.expires).toHaveProperty("lt");
    expect(condExpired.expires.lt).toBeInstanceOf(Date);

    // PasswordResetToken: expires < now
    const pwdCall = mockPasswordResetDeleteMany.mock.calls[0][0];
    expect(pwdCall.where).toHaveProperty("expires");
    expect(pwdCall.where.expires).toHaveProperty("lt");
    expect(pwdCall.where.expires.lt).toBeInstanceOf(Date);

    // InviteToken: expires < now
    const inviteCall = mockInviteDeleteMany.mock.calls[0][0];
    expect(inviteCall.where).toHaveProperty("expires");
    expect(inviteCall.where.expires).toHaveProperty("lt");
    expect(inviteCall.where.expires.lt).toBeInstanceOf(Date);

    // RateLimit: expires < now
    const rateCall = mockRateLimitDeleteMany.mock.calls[0][0];
    expect(rateCall.where).toHaveProperty("expires");
    expect(rateCall.where.expires).toHaveProperty("lt");
    expect(rateCall.where.expires.lt).toBeInstanceOf(Date);
  });

  // -----------------------------------------------------------------------
  // Error handling — prisma throws
  // -----------------------------------------------------------------------
  it("should propagate prisma errors", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockRejectedValue(new Error("Database connection lost"));

    // Act & Assert
    await expect(cleanupExpiredTokens()).rejects.toThrow("Database connection lost");
  });

  // -----------------------------------------------------------------------
  // Verify all deleteMany run in parallel
  // -----------------------------------------------------------------------
  it("should call deleteMany on all four token models", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 1 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 1 });
    mockInviteDeleteMany.mockResolvedValue({ count: 1 });
    mockRateLimitDeleteMany.mockResolvedValue({ count: 1 });

    // Act
    await cleanupExpiredTokens();

    // Assert — all four must be called
    expect(mockMagicLinkDeleteMany).toHaveBeenCalledOnce();
    expect(mockPasswordResetDeleteMany).toHaveBeenCalledOnce();
    expect(mockInviteDeleteMany).toHaveBeenCalledOnce();
    expect(mockRateLimitDeleteMany).toHaveBeenCalledOnce();
  });
});
