"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Table, FileSpreadsheet, FileText } from "lucide-react";

interface DataPreviewProps {
  file: File | null;
}

interface PreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
  sheetName?: string;
}

export function DataPreview({ file }: DataPreviewProps) {
  const t = useTranslations("preview");
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setData(null);
      setError(null);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const parseFile = async () => {
      try {
        const ExcelJS = await import("exceljs");
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        const sheetName = worksheet.name;
        // Convert ExcelJS rows to array format like sheet_to_json with header:1
        const jsonData: unknown[][] = [];
        const row1 = worksheet.getRow(1);
        const headerRow: unknown[] = [];
        row1.eachCell((cell) => {
          headerRow.push(cell.value);
        });
        if (headerRow.length > 0) jsonData.push(headerRow);
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowArr: unknown[] = [];
          row.eachCell((cell) => {
            rowArr.push(cell.value);
          });
          jsonData.push(rowArr);
        });

        if (cancelled) return;

        if (jsonData.length === 0) {
          setError(t("emptyFile"));
          setLoading(false);
          return;
        }

        const firstRow = jsonData[0];
        const headers = firstRow.map((h) => String(h || ""));
        const rows = jsonData.slice(1, 6).map((row) => row.map((cell) => String(cell ?? "")));
        // Pad rows to match header length
        rows.forEach((row) => {
          while (row.length < headers.length) row.push("");
        });

        setData({
          headers,
          rows,
          totalRows: jsonData.length - 1,
          sheetName,
        });
      } catch {
        if (!cancelled) setError(t("cannotRead"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    parseFile();
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (!file) return null;

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
        <FileText className="w-4 h-4" />
        <span>{t("notAvailable")}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{t("loading")}</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-destructive p-4 bg-destructive/10 rounded-lg">{error}</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileSpreadsheet className="w-4 h-4" />
        <span>
          {data.sheetName && `${data.sheetName} — `}
          {t("rows", { count: data.totalRows })}, {t("columns", { count: data.headers.length })}
        </span>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              {data.headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.rows.map((row, i) => (
              <tr key={i} className="hover:bg-muted/30">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.totalRows > 5 && (
        <p className="text-xs text-muted-foreground text-center">
          {t("andMore", { count: data.totalRows - 5 })}
        </p>
      )}
    </div>
  );
}
