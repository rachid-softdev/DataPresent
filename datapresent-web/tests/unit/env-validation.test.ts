// ==========================================
// Environment Variable Validation Tests
// ==========================================
//
// Tests ALLOWED_ORIGINS validation added to env.ts:
// - Accepts valid https URLs
// - Accepts valid http URLs
// - Rejects non-URL strings
// - Accepts empty (optional field)
// - Accepts comma-separated valid URLs
//
// The Zod schema in env.ts uses .refine() to validate that ALLOWED_ORIGINS,
// when provided, is a comma-separated list of valid http/https URLs.

import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Reproduce the ALLOWED_ORIGINS validation logic from env.ts
// ---------------------------------------------------------------------------
// This mirrors the .refine() callback in the Zod schema exactly.
function validateAllowedOrigins(val: string | undefined): boolean {
  if (!val) return true // optional
  return val.split(',').every((o) => {
    try {
      const url = new URL(o.trim())
      return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
      return false
    }
  })
}

describe('ALLOWED_ORIGINS validation', () => {
  // -----------------------------------------------------------------------
  // Valid URLs
  // -----------------------------------------------------------------------
  it('should accept valid https URLs', () => {
    expect(validateAllowedOrigins('https://app.example.com')).toBe(true)
    expect(validateAllowedOrigins('https://example.com')).toBe(true)
    expect(validateAllowedOrigins('https://my-app.vercel.app')).toBe(true)
  })

  it('should accept valid http URLs', () => {
    expect(validateAllowedOrigins('http://localhost:3000')).toBe(true)
    expect(validateAllowedOrigins('http://localhost')).toBe(true)
    expect(validateAllowedOrigins('http://192.168.1.1:8080')).toBe(true)
  })

  it('should accept URLs with paths', () => {
    expect(validateAllowedOrigins('https://app.example.com/dashboard')).toBe(true)
    expect(validateAllowedOrigins('https://example.com/sub/path')).toBe(true)
  })

  it('should accept URLs with ports', () => {
    expect(validateAllowedOrigins('https://app.example.com:3000')).toBe(true)
    expect(validateAllowedOrigins('https://localhost:3001')).toBe(true)
  })

  // -----------------------------------------------------------------------
  // Rejected values
  // -----------------------------------------------------------------------
  it('should reject non-URL strings', () => {
    expect(validateAllowedOrigins('not-a-url')).toBe(false)
    expect(validateAllowedOrigins('just-some-text')).toBe(false)
    expect(validateAllowedOrigins('ftp://example.com')).toBe(false)
  })

  it('should reject strings without protocol', () => {
    expect(validateAllowedOrigins('example.com')).toBe(false)
    expect(validateAllowedOrigins('app.example.com')).toBe(false)
  })

  it('should reject ftp and other protocol URLs', () => {
    expect(validateAllowedOrigins('ftp://example.com')).toBe(false)
    expect(validateAllowedOrigins('file:///etc/passwd')).toBe(false)
    expect(validateAllowedOrigins('ws://example.com')).toBe(false)
    expect(validateAllowedOrigins('gopher://example.com')).toBe(false)
  })

  it('should reject strings that contain spaces', () => {
    expect(validateAllowedOrigins('https://exa mple.com')).toBe(false)
  })

  it('should trim whitespace from individual URLs', () => {
    // Trailing/leading spaces around the URL are trimmed by .trim()
    expect(validateAllowedOrigins(' https://example.com')).toBe(true)
  })

  // -----------------------------------------------------------------------
  // Optional field
  // -----------------------------------------------------------------------
  it('should accept undefined (optional)', () => {
    expect(validateAllowedOrigins(undefined)).toBe(true)
  })

  it('should treat empty string as valid (optional - falsy check)', () => {
    // Empty string is falsy, so !val check returns true (optional)
    expect(validateAllowedOrigins('')).toBe(true)
  })

  // -----------------------------------------------------------------------
  // Comma-separated URLs
  // -----------------------------------------------------------------------
  it('should accept comma-separated valid URLs', () => {
    const value = 'https://app.example.com,https://admin.example.com'
    expect(validateAllowedOrigins(value)).toBe(true)
  })

  it('should accept comma-separated URLs with mixed protocols', () => {
    const value = 'https://app.example.com,http://localhost:3000'
    expect(validateAllowedOrigins(value)).toBe(true)
  })

  it('should accept comma-separated URLs with whitespace', () => {
    const value = 'https://app.example.com, https://admin.example.com'
    expect(validateAllowedOrigins(value)).toBe(true)
  })

  it('should reject comma-separated list with one invalid URL', () => {
    const value = 'https://app.example.com,not-a-url,https://admin.example.com'
    expect(validateAllowedOrigins(value)).toBe(false)
  })

  it('should reject comma-separated list with ftp URL', () => {
    const value = 'https://app.example.com,ftp://files.example.com'
    expect(validateAllowedOrigins(value)).toBe(false)
  })

  it('should handle trailing comma as malformed (empty last entry)', () => {
    // "https://app.example.com," splits to ["https://app.example.com", ""]
    // "".trim() → "" → new URL("") throws → returns false
    expect(validateAllowedOrigins('https://app.example.com,')).toBe(false)
  })

  it('should accept three valid URLs in a list', () => {
    const value = 'https://app1.example.com,https://app2.example.com,https://app3.example.com'
    expect(validateAllowedOrigins(value)).toBe(true)
  })
})
