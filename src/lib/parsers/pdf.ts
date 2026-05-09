export interface ParsedData {
  sheets: Record<string, Record<string, unknown>[]>
  metadata: {
    fileName: string
    rowCount: number
    columnCount: number
  }
}

export async function parsePdf(buffer: Buffer, fileName: string): Promise<ParsedData> {
  // PDF parsing placeholder - requires additional setup
  return {
    sheets: { 'Sheet1': [] },
    metadata: {
      fileName,
      rowCount: 0,
      columnCount: 0,
    },
  }
}