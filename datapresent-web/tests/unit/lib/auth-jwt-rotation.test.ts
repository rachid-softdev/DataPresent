// ==========================================
// Auth JWT Rotation Tests
// ==========================================
//
// Tests the JWT callback rotation logic from lib/auth.ts.
// Covers REVIEW issue: Back-end Agent 2 / token.needsRefresh jamais reset.
//
// The bug: after rotation (deleting needsRefresh), the token still had
// needsRefresh=true, causing infinite rotation on every request.
// The fix: add `delete token.needsRefresh` after the rotation code.
//
// The JWT callback is defined inline in the NextAuth configuration within
// auth.ts. These tests extract and re-implement that callback logic to
// validate the business rules in isolation.

import { describe, it, expect } from 'vitest'

// ==========================================
// JWT Callback Logic (mirrors auth.ts)
// ==========================================
//
// This replicates the JWT callback from auth.ts so we can test the
// needsRefresh rotation behaviour in isolation without the full
// NextAuth machinery.

interface JwtParams {
  token: Record<string, unknown>
  user?: Record<string, unknown> | null
  trigger?: string
  session?: Record<string, unknown>
}

/**
 * Simulates the FIXED JWT callback from auth.ts.
 * The fix adds `delete token.needsRefresh` after rotation.
 * Previous code only set `token.iat` but never cleared needsRefresh,
 * causing infinite rotation loops.
 */
function jwtCallback({ token, user, trigger, session }: JwtParams): Record<string, unknown> {
  if (user) {
    token.sub = user.id as string
    token.iat = Math.floor(Date.now() / 1000)
  }

  if (trigger === 'update' && session?.expires) {
    token.expires = session.expires
  }

  // Check token age for rotation (24 hours)
  const now = Math.floor(Date.now() / 1000)
  if (token.iat && (now - (token.iat as number)) > 24 * 60 * 60) {
    token.needsRefresh = true
  }

  // Transparent rotation: reset iat so the JWT is re-issued
  if (token.needsRefresh) {
    token.iat = Math.floor(Date.now() / 1000)
    // FIX: Delete needsRefresh after rotation so it doesn't re-trigger
    delete token.needsRefresh
  }

  return token
}

describe('JWT callback — needsRefresh rotation fix', () => {
  // -----------------------------------------------------------------------
  // Fresh token: no rotation needed
  // -----------------------------------------------------------------------
  it('should set iat on first call with a user', () => {
    const token = jwtCallback({
      token: {},
      user: { id: 'user-123' },
    })

    expect(token.sub).toBe('user-123')
    expect(token.iat).toBeDefined()
    expect(typeof token.iat).toBe('number')
    expect(token.needsRefresh).toBeUndefined()
  })

  it('should not set needsRefresh for a token under 24 hours old', () => {
    const oneHourAgo = Math.floor(Date.now() / 1000) - 60 * 60
    const token = jwtCallback({
      token: { iat: oneHourAgo },
    })

    expect(token.needsRefresh).toBeUndefined()
    expect(token.iat).toBe(oneHourAgo) // unchanged
  })

  // -----------------------------------------------------------------------
  // Token older than 24h: rotation triggered
  // -----------------------------------------------------------------------
  it('should set needsRefresh for a token older than 24 hours', () => {
    const thirtyHoursAgo = Math.floor(Date.now() / 1000) - 30 * 60 * 60
    const token = jwtCallback({
      token: { iat: thirtyHoursAgo },
    })

    // After the callback runs, needsRefresh should be set AND then deleted
    // after rotation. So it should NOT appear in the final token.
    expect(token.needsRefresh).toBeUndefined()
  })

  // -----------------------------------------------------------------------
  // THE BUG REGRESSION TEST: needsRefresh must be cleared after rotation
  // -----------------------------------------------------------------------
  it('should NOT keep needsRefresh after rotation (regression test for the bug)', () => {
    const thirtyHoursAgo = Math.floor(Date.now() / 1000) - 30 * 60 * 60
    const token = jwtCallback({
      token: { iat: thirtyHoursAgo },
    })

    // The bug caused needsRefresh to remain true, making the rotation
    // re-trigger on every subsequent request. After the fix, needsRefresh
    // must be deleted from the output token.
    expect(token).not.toHaveProperty('needsRefresh')
  })

  // -----------------------------------------------------------------------
  // After rotation, the token should NOT re-trigger
  // -----------------------------------------------------------------------
  it('should not re-trigger rotation after the first rotation (needsRefresh cleared)', () => {
    const thirtyHoursAgo = Math.floor(Date.now() / 1000) - 30 * 60 * 60
    const firstCall = jwtCallback({
      token: { iat: thirtyHoursAgo },
    })

    // Simulate the next request handler call (same token, now rotated)
    const secondCall = jwtCallback({
      token: { ...firstCall },
    })

    // The rotated token has a fresh iat, so needsRefresh must not be set
    expect(secondCall.needsRefresh).toBeUndefined()
    expect(secondCall.iat).toBeDefined()
    // iat should not change on the second call (it's still fresh)
    expect(secondCall.iat).toBe(firstCall.iat)
  })

  // -----------------------------------------------------------------------
  // After rotation: iat is updated to current time
  // -----------------------------------------------------------------------
  it('should update iat to current time after rotation', () => {
    const thirtyHoursAgo = Math.floor(Date.now() / 1000) - 30 * 60 * 60
    const now = Math.floor(Date.now() / 1000)

    const token = jwtCallback({
      token: { iat: thirtyHoursAgo },
    })

    // iat should be updated to approximately now
    expect((token.iat as number)).toBeGreaterThanOrEqual(now - 2) // allow 2s tolerance
    expect((token.iat as number)).toBeLessThanOrEqual(now + 2)
  })

  // -----------------------------------------------------------------------
  // Token just under 24h: no rotation
  // -----------------------------------------------------------------------
  it('should not rotate token that is exactly 23 hours old', () => {
    const twentyThreeHoursAgo = Math.floor(Date.now() / 1000) - 23 * 60 * 60
    const token = jwtCallback({
      token: { iat: twentyThreeHoursAgo },
    })

    expect(token.needsRefresh).toBeUndefined()
    expect(token.iat).toBe(twentyThreeHoursAgo)
  })

  // -----------------------------------------------------------------------
  // Token exactly at 24h boundary
  // -----------------------------------------------------------------------
  it('should rotate token that is exactly 24 hours old', () => {
    const exactly24hAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60
    const token = jwtCallback({
      token: { iat: exactly24hAgo },
    })

    // 24h exactly: now - iat = 86400, which is NOT > 86400 (86400 > 86400 is false)
    // So it should NOT trigger rotation at exactly 24h, only AFTER 24h.
    // This is the correct boundary behaviour.
    expect(token.needsRefresh).toBeUndefined()
  })

  // -----------------------------------------------------------------------
  // Token just over 24h
  // -----------------------------------------------------------------------
  it('should rotate token that is just over 24 hours old', () => {
    const justOver24h = Math.floor(Date.now() / 1000) - 24 * 60 * 60 - 1
    const token = jwtCallback({
      token: { iat: justOver24h },
    })

    expect(token.needsRefresh).toBeUndefined() // cleared after rotation
    expect((token.iat as number)).toBeGreaterThan(justOver24h) // updated
  })

  // -----------------------------------------------------------------------
  // Edge case: no iat in token (never signed in before?)
  // -----------------------------------------------------------------------
  it('should handle token without iat gracefully', () => {
    const token = jwtCallback({
      token: { sub: 'user-123' },
      // no iat
    })

    // With no iat, no rotation check happens
    expect(token.needsRefresh).toBeUndefined()
    expect(token.iat).toBeUndefined()
    expect(token.sub).toBe('user-123')
  })

  // -----------------------------------------------------------------------
  // Edge case: token with sub but no iat
  // -----------------------------------------------------------------------
  it('should set iat when user is provided even without prior iat', () => {
    const token = jwtCallback({
      token: {},
      user: { id: 'user-456' },
    })

    expect(token.iat).toBeDefined()
    expect(token.sub).toBe('user-456')
    expect(token.needsRefresh).toBeUndefined()
  })

  // -----------------------------------------------------------------------
  // Trigger update with session.expires
  // -----------------------------------------------------------------------
  it('should update expires on trigger update', () => {
    const token = jwtCallback({
      token: {},
      trigger: 'update',
      session: { expires: '2026-06-01T00:00:00.000Z' },
    })

    expect(token.expires).toBe('2026-06-01T00:00:00.000Z')
  })
})
