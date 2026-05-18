import { google } from 'googleapis'
import type { ParsedData } from './index'

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})

export async function parseGoogleSheet(spreadsheetId: string): Promise<ParsedData> {
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() as any })
  
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: true,
  })

  const result: Record<string, Record<string, unknown>[]> = {}
  let totalRows = 0
  let totalCols = 0

  for (const sheet of spreadsheet.data.sheets || []) {
    const sheetName = sheet.properties?.title || 'Sheet'
    const gridData = sheet.data?.[0]?.rowData || []
    
    if (gridData.length === 0) continue

    const headers = gridData[0]?.values?.map(v => v.formattedValue || '') || []
    const rows: Record<string, unknown>[] = []

    for (let i = 1; i < gridData.length; i++) {
      const values = gridData[i]?.values || []
      const row: Record<string, unknown> = {}
      headers.forEach((header, idx) => {
        const value = values[idx]?.formattedValue || ''
        const num = parseFloat(value)
        row[header] = isNaN(num) ? value : num
      })
      rows.push(row)
    }

    result[sheetName] = rows
    totalRows += rows.length
    totalCols = Math.max(totalCols, headers.length)
  }

  return {
    sheets: result,
    metadata: {
      fileName: spreadsheetId,
      rowCount: totalRows,
      columnCount: totalCols,
    },
  }
}