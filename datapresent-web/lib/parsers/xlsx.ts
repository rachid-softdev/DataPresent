import * as XLSX from 'xlsx'
import type { ParsedData } from './index'

export async function parseXlsx(buffer: Buffer, fileName: string): Promise<ParsedData> {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  
  const sheets: Record<string, Record<string, unknown>[]> = {}
  let totalRows = 0
  let totalCols = 0

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]
    sheets[sheetName] = json
    totalRows += json.length
    if (json.length > 0) {
      totalCols = Math.max(totalCols, Object.keys(json[0] as object).length)
    }
  }

  return {
    sheets,
    metadata: {
      fileName,
      rowCount: totalRows,
      columnCount: totalCols,
    },
  }
}