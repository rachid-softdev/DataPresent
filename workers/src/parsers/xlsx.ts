import ExcelJS from "exceljs";
import type { ParsedData } from "./index";

export async function parseXlsx(buffer: Buffer, fileName: string): Promise<ParsedData> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheets: Record<string, Record<string, unknown>[]> = {};
  let totalRows = 0;
  let totalCols = 0;

  for (const worksheet of workbook.worksheets) {
    const sheetName = worksheet.name;
    const json: Record<string, unknown>[] = [];

    // Get header row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell) => {
      headers.push(String(cell.value ?? ""));
    });

    // Process data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        if (headers[colNumber - 1]) {
          rowData[headers[colNumber - 1]] = cell.value;
        }
      });
      json.push(rowData);
    });

    sheets[sheetName] = json;
    totalRows += json.length;
    if (json.length > 0) {
      totalCols = Math.max(totalCols, headers.length);
    }
  }

  return {
    sheets,
    metadata: {
      fileName,
      rowCount: totalRows,
      columnCount: totalCols,
    },
  };
}
