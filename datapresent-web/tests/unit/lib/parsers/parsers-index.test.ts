// ==========================================
// Parsers Index Tests
// ==========================================

import { describe, it, expect, vi } from 'vitest'

// Mock the submodules
vi.mock('@/lib/parsers/xlsx', () => ({
  parseXlsx: vi.fn().mockResolvedValue({
    sheets: { Sheet1: [{ a: 1 }] },
    metadata: { fileName: 'test.xlsx', rowCount: 1, columnCount: 1 },
  }),
}))

vi.mock('@/lib/parsers/csv', () => ({
  parseCsv: vi.fn().mockResolvedValue({
    sheets: { Sheet1: [{ a: 1 }] },
    metadata: { fileName: 'test.csv', rowCount: 1, columnCount: 1 },
  }),
}))

vi.mock('@/lib/parsers/pdf', () => ({
  parsePdf: vi.fn().mockResolvedValue({
    sheets: { Sheet1: [] },
    metadata: { fileName: 'test.pdf', rowCount: 0, columnCount: 0 },
  }),
}))

vi.mock('@/lib/parsers/gsheets', () => ({
  parseGoogleSheet: vi.fn().mockResolvedValue({
    sheets: { Sheet1: [{ a: 1 }] },
    metadata: { fileName: 'spreadsheet-id', rowCount: 1, columnCount: 1 },
  }),
}))

describe('parsers index', () => {
  it('should export parseFile function', async () => {
    const module = await import('@/lib/parsers')
    expect(module.parseFile).toBeDefined()
  })

  it('should parse XLSX files', async () => {
    const { parseFile } = await import('@/lib/parsers')

    const buffer = Buffer.from('test')
    const result = await parseFile(buffer, 'test.xlsx', 'XLSX')

    expect(result.metadata.fileName).toBe('test.xlsx')
    expect(result.metadata.rowCount).toBe(1)
  })

  it('should parse CSV files', async () => {
    const { parseFile } = await import('@/lib/parsers')

    const buffer = Buffer.from('test')
    const result = await parseFile(buffer, 'test.csv', 'CSV')

    expect(result.metadata.fileName).toBe('test.csv')
  })

  it('should parse PDF files', async () => {
    const { parseFile } = await import('@/lib/parsers')

    const buffer = Buffer.from('test')
    const result = await parseFile(buffer, 'test.pdf', 'PDF')

    expect(result.metadata.rowCount).toBe(0)
  })

  it('should parse Google Sheets files', async () => {
    const { parseFile } = await import('@/lib/parsers')

    const buffer = Buffer.from('spreadsheet-id')
    const result = await parseFile(buffer, 'spreadsheet-id', 'GSHEET')

    expect(result.metadata.fileName).toBe('spreadsheet-id')
  })

  it('should throw error for unsupported file types', async () => {
    const { parseFile } = await import('@/lib/parsers')

    const buffer = Buffer.from('test')

    await expect(parseFile(buffer, 'test.xyz', 'UNKNOWN' as any)).rejects.toThrow(
      'Unsupported file type'
    )
  })
})
