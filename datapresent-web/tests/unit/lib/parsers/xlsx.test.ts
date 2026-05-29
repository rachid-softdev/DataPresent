// ==========================================
// XLSX Parser Tests
// ==========================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock helpers for ExcelJS worksheet/row/cell objects
function createCell(value: unknown) {
  return { value }
}

function createRow(values: unknown[]) {
  return {
    eachCell: vi.fn((callback: (cell: { value: unknown }, colNumber?: number) => void) => {
      values.forEach((val, idx) => callback(createCell(val), idx + 1))
    }),
    }),
  }
}

function createWorksheet(name: string, headers: string[], ...dataRows: unknown[][]) {
  const headerRow = createRow(headers)
  const rows = [headerRow, ...dataRows.map((r) => createRow(r))]

  return {
    name,
    getRow: vi.fn((n: number) => (n === 1 ? headerRow : rows[n - 1])),
    eachRow: vi.fn((callback: (row: ReturnType<typeof createRow>, rowNumber: number) => void) => {
      rows.forEach((row, idx) => callback(row, idx + 1))
    }),
  }
}

let mockWorksheets: any[] = []

// Mock exceljs module for Vitest v4 (ESM-compatible)
// ExcelJS is imported as: import ExcelJS from 'exceljs' → ExcelJS.Workbook
vi.mock('exceljs', () => {
  function MockWorkbook() {
    this.xlsx = { load: vi.fn().mockResolvedValue(undefined) }
    Object.defineProperty(this, 'worksheets', {
      get: () => mockWorksheets,
      configurable: true,
    })
  }
  return {
    default: { Workbook: MockWorkbook },
    Workbook: MockWorkbook,
  }
})

describe('xlsx parser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorksheets = []
  })

  it('should export parseXlsx function', async () => {
    const module = await import('@/lib/parsers/xlsx')
    expect(module.parseXlsx).toBeDefined()
  })

  it('should parse xlsx file with single sheet', async () => {
    const { parseXlsx } = await import('@/lib/parsers/xlsx')

    mockWorksheets = [
      createWorksheet('Sheet1', ['Name', 'Age'], ['John', 30], ['Jane', 25]),
    ]

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

    mockWorksheets = [
      {
        name: 'Sheet1',
        getRow: vi.fn().mockReturnValue({ eachCell: vi.fn() }),
        eachRow: vi.fn(),
      },
    ]

    const buffer = Buffer.from('test')
    const result = await parseXlsx(buffer, 'empty.xlsx')

    expect(result.metadata.rowCount).toBe(0)
    expect(result.metadata.columnCount).toBe(0)
  })

  it('should parse multiple sheets', async () => {
    const { parseXlsx } = await import('@/lib/parsers/xlsx')

    mockWorksheets = [
      createWorksheet('Sheet1', ['col'], ['a']),
      createWorksheet('Sheet2', ['col'], ['b'], ['c']),
    ]

    const buffer = Buffer.from('test')
    const result = await parseXlsx(buffer, 'multi.xlsx')

    expect(result.metadata.rowCount).toBe(3)
    expect(result.metadata.columnCount).toBe(1)
  })
})
