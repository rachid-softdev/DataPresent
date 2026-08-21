import { FileType } from "@prisma/client";
import { parseCsv } from "./csv";
import { parseGoogleSheet } from "./gsheets";
import { parsePdf } from "./pdf";
import { parseXlsx } from "./xlsx";

export type ParsedData = {
  sheets: Record<string, Record<string, unknown>[]>;
  metadata: {
    fileName: string;
    rowCount: number;
    columnCount: number;
  };
};

export async function parseFile(
  buffer: Buffer,
  fileName: string,
  fileType: FileType,
): Promise<ParsedData> {
  switch (fileType) {
    case "XLSX":
      return parseXlsx(buffer, fileName);
    case "CSV":
      return parseCsv(buffer, fileName);
    case "PDF":
      return parsePdf(buffer, fileName);
    case "GSHEET":
      // For GSHEET, the buffer content is the spreadsheet ID (as a string)
      return parseGoogleSheet(buffer.toString("utf-8"));
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

export { parseGoogleSheet };
