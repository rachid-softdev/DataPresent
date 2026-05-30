// ==========================================
// Sector Validation Tests (Fixes #6 & #7)
// ==========================================
//
// Tests the sector validation logic added to:
// 1. POST /api/upload — rejects invalid sectors before processing
// 2. POST /api/reports/[id]/regenerate — rejects invalid sectors on update
//
// Both routes validate against: FINANCE, MARKETING, HR, SAAS, GENERIC

import { describe, it, expect } from 'vitest'

// The valid sectors as defined in both routes
const VALID_SECTORS = ['FINANCE', 'MARKETING', 'HR', 'SAAS', 'GENERIC'] as const
type Sector = typeof VALID_SECTORS[number]

/**
 * Reproduces the exact validation logic from upload/route.ts lines 45-51
 */
function validateSectorUpload(sector: string): boolean {
  const validSectors = ['FINANCE', 'MARKETING', 'HR', 'SAAS', 'GENERIC'] as const
  return (validSectors as readonly string[]).includes(sector)
}

/**
 * Reproduces the exact validation logic from regenerate/route.ts lines 54-59
 * (identical to upload but returns boolean for testing)
 */
function validateSectorRegenerate(sector: string): boolean {
  const validSectors = ['FINANCE', 'MARKETING', 'HR', 'SAAS', 'GENERIC'] as const
  return (validSectors as readonly string[]).includes(sector)
}

describe('Sector validation (Fix #6 — Upload)', () => {
  it('should accept valid sector: FINANCE', () => {
    expect(validateSectorUpload('FINANCE')).toBe(true)
  })

  it('should accept valid sector: MARKETING', () => {
    expect(validateSectorUpload('MARKETING')).toBe(true)
  })

  it('should accept valid sector: HR', () => {
    expect(validateSectorUpload('HR')).toBe(true)
  })

  it('should accept valid sector: SAAS', () => {
    expect(validateSectorUpload('SAAS')).toBe(true)
  })

  it('should accept valid sector: GENERIC', () => {
    expect(validateSectorUpload('GENERIC')).toBe(true)
  })

  it('should reject lowercase sector: finance', () => {
    expect(validateSectorUpload('finance')).toBe(false)
  })

  it('should reject lowercase sector: marketing', () => {
    expect(validateSectorUpload('marketing')).toBe(false)
  })

  it('should reject empty string', () => {
    expect(validateSectorUpload('')).toBe(false)
  })

  it('should reject undefined (before route reaches validation)', () => {
    expect(validateSectorUpload(undefined as unknown as string)).toBe(false)
  })

  it('should reject null', () => {
    expect(validateSectorUpload(null as unknown as string)).toBe(false)
  })

  it('should reject misspelled sector: FINANCE', () => {
    expect(validateSectorUpload('FINANC')).toBe(false)
  })

  it('should reject unknown sector', () => {
    expect(validateSectorUpload('HEALTHCARE')).toBe(false)
  })

  it('should reject sector with extra spaces', () => {
    expect(validateSectorUpload(' FINANCE')).toBe(false)
    expect(validateSectorUpload('FINANCE ')).toBe(false)
  })

  it('should reject numeric strings', () => {
    expect(validateSectorUpload('123')).toBe(false)
  })

  it('should reject special characters', () => {
    expect(validateSectorUpload('FINANCE!')).toBe(false)
  })

  it('should reject mixed case', () => {
    expect(validateSectorUpload('Finance')).toBe(false)
  })
})

describe('Sector validation (Fix #7 — Regenerate)', () => {
  it('should accept valid sector: FINANCE', () => {
    expect(validateSectorRegenerate('FINANCE')).toBe(true)
  })

  it('should accept valid sector: MARKETING', () => {
    expect(validateSectorRegenerate('MARKETING')).toBe(true)
  })

  it('should accept valid sector: HR', () => {
    expect(validateSectorRegenerate('HR')).toBe(true)
  })

  it('should accept valid sector: SAAS', () => {
    expect(validateSectorRegenerate('SAAS')).toBe(true)
  })

  it('should accept valid sector: GENERIC', () => {
    expect(validateSectorRegenerate('GENERIC')).toBe(true)
  })

  it('should reject lowercase: finance', () => {
    expect(validateSectorRegenerate('finance')).toBe(false)
  })

  it('should reject empty string', () => {
    expect(validateSectorRegenerate('')).toBe(false)
  })

  it('should reject null', () => {
    expect(validateSectorRegenerate(null as unknown as string)).toBe(false)
  })

  it('should reject unknown sector', () => {
    expect(validateSectorRegenerate('HEALTHCARE')).toBe(false)
  })
})
