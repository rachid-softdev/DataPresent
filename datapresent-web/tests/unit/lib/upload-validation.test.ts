// ==========================================
// File Upload Validation Tests (validateMagicBytes)
// ==========================================

import { describe, it, expect } from 'vitest'
import { validateMagicBytes } from '@/lib/upload-validation'

describe('validateMagicBytes', () => {
  describe('PDF validation', () => {
    it('should return true for a valid PDF header buffer', () => {
      // PDF files start with %PDF (0x25 0x50 0x44 0x46)
      const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34])
      expect(validateMagicBytes(buffer, 'pdf')).toBe(true)
    })

    it('should return false for an EXE header disguised as PDF extension', () => {
      // EXE/DLL files start with MZ (0x4D 0x5A)
      const buffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00])
      expect(validateMagicBytes(buffer, 'pdf')).toBe(false)
    })
  })

  describe('CSV validation', () => {
    it('should return true for CSV (no magic bytes to validate)', () => {
      const buffer = Buffer.from('col1,col2\nval1,val2')
      expect(validateMagicBytes(buffer, 'csv')).toBe(true)
    })
  })

  describe('XLSX validation', () => {
    it('should return true for valid XLSX (ZIP header)', () => {
      // ZIP files start with PK\x03\x04
      const buffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00])
      expect(validateMagicBytes(buffer, 'xlsx')).toBe(true)
    })

    it('should return false for non-ZIP file with xlsx extension', () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
      expect(validateMagicBytes(buffer, 'xlsx')).toBe(false)
    })
  })

  describe('XLS validation', () => {
    it('should return true for valid XLS (OLE2 header)', () => {
      // OLE2 files start with D0CF11E0
      const buffer = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])
      expect(validateMagicBytes(buffer, 'xls')).toBe(true)
    })
  })

  describe('unknown extensions', () => {
    it('should return false for unknown extension', () => {
      const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46])
      expect(validateMagicBytes(buffer, 'exe')).toBe(false)
    })

    it('should return false for empty extension', () => {
      const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46])
      expect(validateMagicBytes(buffer, '')).toBe(false)
    })
  })
})
