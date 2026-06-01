export interface ParsedData {
  sheets: Record<string, Record<string, unknown>[]>;
  metadata: {
    fileName: string;
    rowCount: number;
    columnCount: number;
  };
}

export async function parsePdf(_buffer: Buffer, _fileName: string): Promise<ParsedData> {
  throw new Error(
    "PDF parsing is not yet implemented. " +
      "Please convert your PDF to Excel (.xlsx) or CSV format. " +
      "Install pdf-parse (npm install pdf-parse) and update this function to enable PDF support.",
  );
}
