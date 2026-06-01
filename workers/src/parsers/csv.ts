import ExcelJS from "exceljs";
import type { ParsedData } from "./index";

export async function parseCsv(buffer: Buffer, fileName: string): Promise<ParsedData> {
  const workbook = new ExcelJS.Workbook();
  // CSV files are loaded via workbook.csv.read(), NOT workbook.xlsx.load()
  // which expects the binary XLSX format
  await workbook.csv.read(buffer, { parserOptions: { quote: '"', delimiter: "," } });
  const worksheet = workbook.worksheets[0];
  const sheetName = worksheet.name || "Sheet1";
  const json: Record<string, unknown>[] = [];
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell) => {
    headers.push(String(cell.value ?? ""));
  });
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const rowData: Record<string, unknown> = {};
    row.eachCell((cell, colNumber) => {
      if (headers[colNumber - 1]) rowData[headers[colNumber - 1]] = cell.value;
    });
    json.push(rowData);
  });

  return {
    sheets: { [sheetName]: json } as Record<string, Record<string, unknown>[]>,
    metadata: {
      fileName,
      rowCount: json.length,
      columnCount: json.length > 0 ? Object.keys(json[0] as object).length : 0,
    },
  };
}
