// ==========================================
// PDF Parser Tests
// ==========================================

import { describe, it, expect } from 'vitest'

describe('pdf parser', () => {
  it('should export parsePdf function', async () => {
    const module = await import('@/lib/parsers/pdf')
    expect(module.parsePdf).toBeDefined()
  })

  it('should return empty data for placeholder implementation', async () => {
    const { parsePdf } = await import('@/lib/parsers/pdf')

    const buffer = Buffer.from('test')
    const result = await parsePdf(buffer, 'test.pdf')

    expect(result.sheets).toHaveProperty('Sheet1')
    expect(result.sheets.Sheet1).toEqual([])
    expect(result.metadata).toEqual({
      fileName: 'test.pdf',
      rowCount: 0,
      columnCount: 0,
    })
  })

  it('should handle different filenames', async () => {
    const { parsePdf } = await import('@/lib/parsers/pdf')

    const buffer = Buffer.from('test')
    const result = await parsePdf(buffer, 'report.pdf')

    expect(result.metadata.fileName).toBe('report.pdf')
  })
})
