import * as XLSX from "xlsx";

export interface ParsedFileResult {
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
  fileName: string;
}

/**
 * Parse a CSV or XLSX file (from browser File input) and extract columns + all rows.
 * Returns structured data ready to be used with the AI mapping.
 */
export async function parseContactFile(file: File): Promise<ParsedFileResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Use the first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Le fichier ne contient aucune feuille de calcul.");
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Impossible de lire la feuille de calcul.");
  }

  // Convert to JSON — header: 1 gives us arrays, default gives objects with headers as keys
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false, // Force string conversion for dates, numbers, etc.
  });

  if (rawRows.length === 0) {
    throw new Error("Le fichier est vide ou ne contient pas de données.");
  }

  // Extract column names from the first row's keys
  const columns = Object.keys(rawRows[0]!);

  // Convert all values to strings
  const rows = rawRows.map((row) => {
    const stringRow: Record<string, string> = {};
    for (const col of columns) {
      const val = row[col];
      stringRow[col] = val != null ? String(val).trim() : "";
    }
    return stringRow;
  });

  return {
    columns,
    rows,
    totalRows: rows.length,
    fileName: file.name,
  };
}

/**
 * Extract a sample of rows for the AI mapping (max 5 non-empty rows).
 */
export function getSampleData(
  rows: Record<string, string>[],
  maxSamples = 5
): Record<string, string>[] {
  // Pick rows that have at least some non-empty values to give the AI better context
  const nonEmptyRows = rows.filter((row) =>
    Object.values(row).some((v) => v !== "")
  );
  return nonEmptyRows.slice(0, maxSamples);
}

/**
 * Validate that the file is a supported format (CSV, XLSX, XLS).
 */
export function isValidContactFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const allowedTypes = [
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
  ];

  const allowedExtensions = [".csv", ".xlsx", ".xls"];
  const extension = file.name
    .substring(file.name.lastIndexOf("."))
    .toLowerCase();

  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: "Format non supporté. Utilisez un fichier CSV, XLSX ou XLS.",
    };
  }

  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: "Le fichier est trop volumineux (max 10 Mo).",
    };
  }

  return { valid: true };
}
