import * as XLSX from 'xlsx'
import type { ParsedData } from './index'

export async function parseCsv(buffer: Buffer, fileName: string): Promise<ParsedData> {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: true })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const json = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[]

  return {
    sheets: { [sheetName]: json } as Record<string, Record<string, unknown>[]>,
    metadata: {
      fileName,
      rowCount: json.length,
      columnCount: json.length > 0 ? Object.keys(json[0] as object).length : 0,
    },
  }
}