// ==========================================
// XLSX Parser Tests
// ==========================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as XLSX from 'xlsx'

// Mock xlsx module
vi.mock('xlsx', async () => {
  const actual = await vi.importActual('xlsx')
  return {
    ...actual,
    read: vi.fn(),
    utils: {
      sheet_to_json: vi.fn(),
    },
  }
})

describe('xlsx parser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export parseXlsx function', async () => {
    const module = await import('@/lib/parsers/xlsx')
    expect(module.parseXlsx).toBeDefined()
  })

  it('should parse xlsx file with single sheet', async () => {
    const { parseXlsx } = await import('@/lib/parsers/xlsx')

    const mockData = [
      { Name: 'John', Age: 30 },
      { Name: 'Jane', Age: 25 },
    ]

    ;(XLSX.read as ReturnType<typeof vi.fn>).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {},
      },
    })
    ;(XLSX.utils.sheet_to_json as ReturnType<typeof vi.fn>).mockReturnValue(mockData)

    const buffer = Buffer.from('test')
    const result = await parseXlsx(buffer, 'test.xlsx')

    expect(result).toHaveProperty('sheets')
    expect(result.metadata).toEqual({
      fileName: 'test.xlsx',
      rowCount: 2,
      columnCount: 2,
    })
  })

  it('should handle empty sheet', async () => {
    const { parseXlsx } = await import('@/lib/parsers/xlsx')

    ;(XLSX.read as ReturnType<typeof vi.fn>).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {},
      },
    })
    ;(XLSX.utils.sheet_to_json as ReturnType<typeof vi.fn>).mockReturnValue([])

    const buffer = Buffer.from('test')
    const result = await parseXlsx(buffer, 'empty.xlsx')

    expect(result.metadata.rowCount).toBe(0)
    expect(result.metadata.columnCount).toBe(0)
  })

  it('should parse multiple sheets', async () => {
    const { parseXlsx } = await import('@/lib/parsers/xlsx')

    ;(XLSX.read as ReturnType<typeof vi.fn>).mockReturnValue({
      SheetNames: ['Sheet1', 'Sheet2'],
      Sheets: {
        Sheet1: {},
        Sheet2: {},
      },
    })
    ;(XLSX.utils.sheet_to_json as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce([{ col: 'a' }])
      .mockReturnValueOnce([{ col: 'b' }, { col: 'c' }])

    const buffer = Buffer.from('test')
    const result = await parseXlsx(buffer, 'multi.xlsx')

    expect(result.metadata.rowCount).toBe(3)
    expect(result.metadata.columnCount).toBe(1)
  })
})
