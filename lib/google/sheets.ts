import { google } from "googleapis";
import { parseCsv } from "@/lib/csv-parser";

export function extractSheetId(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export async function fetchSheetCsv(
  spreadsheetId: string,
  sheetName: string
): Promise<Record<string, string>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    sheetName
  )}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch tab "${sheetName}": HTTP ${res.status}`);
  }
  const text = await res.text();
  return parseCsv(text);
}

export async function getGoogleSheetsClient(customCredentials?: {
  clientEmail?: string;
  privateKey?: string;
}) {
  const clientEmail =
    customCredentials?.clientEmail ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL;

  let privateKey =
    customCredentials?.privateKey || process.env.GOOGLE_PRIVATE_KEY;

  if (privateKey) {
    // Handle escaped newlines from environment variables
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (clientEmail && privateKey) {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    return google.sheets({ version: "v4", auth });
  }

  // Fallback to API Key if configured
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (apiKey) {
    return google.sheets({ version: "v4", auth: apiKey });
  }

  return null;
}

export async function fetchSheetValues(
  spreadsheetId: string,
  range: string,
  credentials?: { clientEmail?: string; privateKey?: string }
): Promise<string[][]> {
  // If range is like "Assignments!A1:Z", extract sheet name and try fetchSheetCsv first
  const sheetName = range.split("!")[0];
  try {
    const records = await fetchSheetCsv(spreadsheetId, sheetName);
    if (records.length > 0) {
      const headers = Object.keys(records[0]);
      const rows = [headers, ...records.map((r) => headers.map((h) => r[h] || ""))];
      return rows;
    }
  } catch (err) {
    // Fall back to official API if available
  }

  const sheets = await getGoogleSheetsClient(credentials);
  if (!sheets) {
    throw new Error(
      "Google Sheets credentials not configured. Please ensure the sheet is accessible or configure a Service Account."
    );
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return (response.data.values as string[][]) || [];
}

export function rowsToObjects<T = Record<string, any>>(rows: string[][]): T[] {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());

  return rows.slice(1).map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] !== undefined ? row[index] : "";
    });
    return obj as T;
  });
}
