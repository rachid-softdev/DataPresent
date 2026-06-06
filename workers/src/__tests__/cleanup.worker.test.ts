// ==========================================
// Workers Cleanup Tests (Fix 4)
// ==========================================
//
// Tests the cleanupExpiredTokens function in workers/src/workers/cleanup.worker.ts:
// - Deletes tokens older than 30 days that are used or expired
// - Preserves tokens within 30 days even if used/expired
// - Preserves tokens older than 30 days that are NOT used AND NOT expired
//
// The new indexes (Fix 4) are:
//   @@index([tokenPrefix, used, expires]) on MagicLinkToken, PasswordResetToken, InviteToken
//   @@index([used]) on MagicLinkToken, PasswordResetToken, InviteToken
// These are schema-level changes (tested via migrations/integration).
// We test the query logic that leverages them.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock variables
// ---------------------------------------------------------------------------
const mockMagicLinkDeleteMany = vi.hoisted(() => vi.fn());
const mockPasswordResetDeleteMany = vi.hoisted(() => vi.fn());
const mockInviteDeleteMany = vi.hoisted(() => vi.fn());

vi.mock("../prisma.js", () => ({
  prisma: {
    magicLinkToken: { deleteMany: mockMagicLinkDeleteMany },
    passwordResetToken: { deleteMany: mockPasswordResetDeleteMany },
    inviteToken: { deleteMany: mockInviteDeleteMany },
  },
}));

// Import after mocks
import { cleanupExpiredTokens } from "../workers/cleanup.worker.js";

describe("cleanupExpiredTokens (Fix 4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Happy path — expired tokens found
  // -----------------------------------------------------------------------
  it("should delete tokens from all three tables and return total count", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 10 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 5 });
    mockInviteDeleteMany.mockResolvedValue({ count: 3 });

    // Act
    const result = await cleanupExpiredTokens();

    // Assert
    expect(result).toEqual({ deleted: 18 });
    expect(mockMagicLinkDeleteMany).toHaveBeenCalledOnce();
    expect(mockPasswordResetDeleteMany).toHaveBeenCalledOnce();
    expect(mockInviteDeleteMany).toHaveBeenCalledOnce();
  });

  // -----------------------------------------------------------------------
  // No expired tokens
  // -----------------------------------------------------------------------
  it("should return zero when there are no expired tokens", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 0 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 0 });
    mockInviteDeleteMany.mockResolvedValue({ count: 0 });

    // Act
    const result = await cleanupExpiredTokens();

    // Assert
    expect(result).toEqual({ deleted: 0 });
  });

  // -----------------------------------------------------------------------
  // WHERE clause verification — cutoff is 30 days
  // -----------------------------------------------------------------------
  it("should use createdAt cutoff of 30 days ago", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 1 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 0 });
    mockInviteDeleteMany.mockResolvedValue({ count: 0 });

    const beforeTest = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    // Act
    await cleanupExpiredTokens();

    // Assert
    // MagicLinkToken
    const magicCall = mockMagicLinkDeleteMany.mock.calls[0][0];
    expect(magicCall).toHaveProperty("where");
    expect(magicCall.where).toHaveProperty("OR");
    expect(Array.isArray(magicCall.where.OR)).toBe(true);
    expect(magicCall.where.OR).toHaveLength(2);

    // First OR condition: used: true
    expect(magicCall.where.OR[0]).toHaveProperty("used");
    expect(magicCall.where.OR[0].used).toBe(true);

    // Second OR condition: expires < now
    expect(magicCall.where.OR[1]).toHaveProperty("expires");
    expect(magicCall.where.OR[1].expires).toHaveProperty("lt");
    const expiresLt = magicCall.where.OR[1].expires.lt.getTime();
    expect(expiresLt).toBeGreaterThanOrEqual(beforeTest - 1000);
    expect(expiresLt).toBeLessThanOrEqual(beforeTest + 1000);

    // createdAt < cutoff (30 days ago) — global filter
    expect(magicCall.where).toHaveProperty("createdAt");
    expect(magicCall.where.createdAt).toHaveProperty("lt");
    const createdAtLt = magicCall.where.createdAt.lt.getTime();
    const expectedCutoffMin = beforeTest - thirtyDaysMs - 1000;
    const expectedCutoffMax = beforeTest - thirtyDaysMs + 1000;
    expect(createdAtLt).toBeGreaterThanOrEqual(expectedCutoffMin);
    expect(createdAtLt).toBeLessThanOrEqual(expectedCutoffMax);

    // Same WHERE structure for PasswordResetToken
    const pwdCall = mockPasswordResetDeleteMany.mock.calls[0][0];
    expect(pwdCall.where).toHaveProperty("OR");
    expect(pwdCall.where).toHaveProperty("createdAt");
    expect(pwdCall.where.createdAt).toHaveProperty("lt");

    // Same for InviteToken
    const inviteCall = mockInviteDeleteMany.mock.calls[0][0];
    expect(inviteCall.where).toHaveProperty("OR");
    expect(inviteCall.where).toHaveProperty("createdAt");
    expect(inviteCall.where.createdAt).toHaveProperty("lt");
  });

  // -----------------------------------------------------------------------
  // Tokens NOT deleted: used=false + expires in future + recent creation
  // -----------------------------------------------------------------------
  it("should NOT target tokens with used=false AND expires>now AND createdAt<30days (valid tokens)", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 0 }); // Simulate no matches

    // Act
    const result = await cleanupExpiredTokens();

    // Assert
    expect(result.deleted).toBe(0);

    // Verify the WHERE clause would exclude valid tokens:
    // A token that is: used=false AND expires>now is NOT matched by either OR condition
    // AND the createdAt cutoff is a filter, not a delete condition.
    // The OR only matches:
    //   OR[0]: used: true (doesn't match used: false)
    //   OR[1]: expires: { lt: now } (doesn't match expires > now)
    // So valid tokens are inherently excluded by the OR conditions.

    const magicCall = mockMagicLinkDeleteMany.mock.calls[0][0];
    const orConditions = magicCall.where.OR;

    // Verify OR conditions exclude valid (unused, non-expired) tokens
    const unusedNonExpiredToken = { used: false, expires: new Date(Date.now() + 86400000) };

    const matchesOr1 = orConditions[0].used === true && unusedNonExpiredToken.used === true;
    const matchesOr2 =
      orConditions[1].expires.lt.getTime() > unusedNonExpiredToken.expires.getTime();

    // Neither condition should match
    expect(matchesOr1).toBe(false);
    expect(matchesOr2).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Tokens older than 30 days AND used ARE deleted
  // -----------------------------------------------------------------------
  it("should delete tokens older than 30 days that are used", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 3 });

    // Act
    await cleanupExpiredTokens();

    // Assert
    const magicCall = mockMagicLinkDeleteMany.mock.calls[0][0];

    // The OR[0] condition: used: true catches old used tokens
    // Combined with createdAt < cutoff (30 days)
    expect(magicCall.where.OR[0].used).toBe(true);
    expect(magicCall.where.createdAt.lt).toBeInstanceOf(Date);

    // createdAt cutoff should be ~30 days ago
    const cutoff = magicCall.where.createdAt.lt.getTime();
    const expected = Date.now() - 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoff - expected)).toBeLessThan(2000);
  });

  // -----------------------------------------------------------------------
  // Tokens older than 30 days AND expired (but unused) ARE deleted
  // -----------------------------------------------------------------------
  it("should delete tokens older than 30 days that are expired even if unused", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 7 });

    // Act
    await cleanupExpiredTokens();

    // Assert
    const magicCall = mockMagicLinkDeleteMany.mock.calls[0][0];

    // OR[1]: expires < now (catches expired tokens, regardless of used flag)
    expect(magicCall.where.OR[1].expires.lt).toBeInstanceOf(Date);

    // Combined with createdAt cutoff
    expect(magicCall.where.createdAt.lt).toBeInstanceOf(Date);
  });

  // -----------------------------------------------------------------------
  // All three tables use the same pattern
  // -----------------------------------------------------------------------
  it("should use identical WHERE structure for all three token tables", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockResolvedValue({ count: 1 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 1 });
    mockInviteDeleteMany.mockResolvedValue({ count: 1 });

    // Act
    await cleanupExpiredTokens();

    // Assert — all three use OR + createdAt pattern
    for (const mock of [
      mockMagicLinkDeleteMany,
      mockPasswordResetDeleteMany,
      mockInviteDeleteMany,
    ]) {
      const where = mock.mock.calls[0][0].where;
      expect(where).toHaveProperty("OR");
      expect(where.OR).toHaveLength(2);
      expect(where).toHaveProperty("createdAt");
      expect(where.createdAt).toHaveProperty("lt");
    }
  });

  // -----------------------------------------------------------------------
  // Parallel execution — all three run concurrently
  // -----------------------------------------------------------------------
  it("should call deleteMany on all three tables (parallel)", async () => {
    // Arrange — use promises that resolve in order
    let resolve1: Function, resolve2: Function, resolve3: Function;
    const p1 = new Promise((r) => {
      resolve1 = r;
    });
    const p2 = new Promise((r) => {
      resolve2 = r;
    });
    const p3 = new Promise((r) => {
      resolve3 = r;
    });

    mockMagicLinkDeleteMany.mockReturnValue(p1);
    mockPasswordResetDeleteMany.mockReturnValue(p2);
    mockInviteDeleteMany.mockReturnValue(p3);

    // Start the function
    const resultPromise = cleanupExpiredTokens();

    // All three should have been called (they started in parallel)
    expect(mockMagicLinkDeleteMany).toHaveBeenCalled();
    expect(mockPasswordResetDeleteMany).toHaveBeenCalled();
    expect(mockInviteDeleteMany).toHaveBeenCalled();

    // Resolve all
    resolve1!({ count: 2 });
    resolve2!({ count: 3 });
    resolve3!({ count: 4 });

    const result = await resultPromise;
    expect(result).toEqual({ deleted: 9 });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  it("should propagate errors from prisma", async () => {
    // Arrange
    mockMagicLinkDeleteMany.mockRejectedValue(new Error("Connection failed"));

    // Act & Assert
    await expect(cleanupExpiredTokens()).rejects.toThrow("Connection failed");
  });
});
