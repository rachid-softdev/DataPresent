// ==========================================
// Sector Validation Tests
// ==========================================
//
// Tests the shared isValidSector() type guard from lib/sector.ts,
// which is derived from Prisma's Sector enum.
// Used by: POST /api/upload and POST /api/reports/[id]/regenerate

import { describe, it, expect } from 'vitest'
import { isValidSector, VALID_SECTORS } from '@/lib/sector'

describe('Sector validation — VALID_SECTORS constant', () => {
  it('should contain all expected sectors', () => {
    expect(VALID_SECTORS).toEqual(['FINANCE', 'MARKETING', 'HR', 'SAAS', 'GENERIC'])
  })
})

describe('Sector validation — isValidSector()', () => {
  it('should accept valid sector: FINANCE', () => {
    expect(isValidSector('FINANCE')).toBe(true)
  })

  it('should accept valid sector: MARKETING', () => {
    expect(isValidSector('MARKETING')).toBe(true)
  })

  it('should accept valid sector: HR', () => {
    expect(isValidSector('HR')).toBe(true)
  })

  it('should accept valid sector: SAAS', () => {
    expect(isValidSector('SAAS')).toBe(true)
  })

  it('should accept valid sector: GENERIC', () => {
    expect(isValidSector('GENERIC')).toBe(true)
  })

  it('should reject lowercase sector: finance', () => {
    expect(isValidSector('finance')).toBe(false)
  })

  it('should reject lowercase sector: marketing', () => {
    expect(isValidSector('marketing')).toBe(false)
  })

  it('should reject empty string', () => {
    expect(isValidSector('')).toBe(false)
  })

  it('should reject undefined', () => {
    expect(isValidSector(undefined as unknown as string)).toBe(false)
  })

  it('should reject null', () => {
    expect(isValidSector(null as unknown as string)).toBe(false)
  })

  it('should reject misspelled sector: FINANC', () => {
    expect(isValidSector('FINANC')).toBe(false)
  })

  it('should reject unknown sector', () => {
    expect(isValidSector('HEALTHCARE')).toBe(false)
  })

  it('should reject sector with extra spaces', () => {
    expect(isValidSector(' FINANCE')).toBe(false)
    expect(isValidSector('FINANCE ')).toBe(false)
  })

  it('should reject numeric strings', () => {
    expect(isValidSector('123')).toBe(false)
  })

  it('should reject special characters', () => {
    expect(isValidSector('FINANCE!')).toBe(false)
  })

  it('should reject mixed case', () => {
    expect(isValidSector('Finance')).toBe(false)
  })
})
