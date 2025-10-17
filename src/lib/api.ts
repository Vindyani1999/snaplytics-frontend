/**
 * Backend integration utilities for Snaplytics
 * The FastAPI backend exposes POST /process accepting:
 *   { fields: string[]; rawContent: string }
 * and responds with (on success):
 *   {
 *     status: "success",
 *     fields_requested: string[],
 *     formatted_data: string, // JSON or markdown fenced JSON
 *     csv_saved: boolean,
 *     timestamp: string
 *   }
 */

export interface ProcessRequestPayload {
  fields: string[];
  rawContent: string;
}

export interface ProcessResponseRaw {
  status?: string;
  error?: string;
  fields_requested?: string[];
  formatted_data?: string; // textual JSON maybe inside code fences
  csv_saved?: boolean;
  timestamp?: string;
}

export type ParsedFormattedData = Record<string, any> | Record<string, any>[];

// Helper: extract first JSON object/array from an arbitrary string
function extractJson(text: string): ParsedFormattedData | null {
  if (!text) return null;
  const trimmed = text.trim();
  // Quick attempt: direct parse
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    /* ignore */
  }
  // Remove code fences ```json ... ``` if present
  const fenceMatch = trimmed.match(/```(?:json)?([\s\S]*?)```/i);
  if (fenceMatch) {
    const inside = fenceMatch[1].trim();
    try {
      return JSON.parse(inside);
    } catch (_) {
      /* ignore */
    }
  }
  // Regex scan for first JSON object or array
  const objIdx = trimmed.indexOf("{");
  const arrIdx = trimmed.indexOf("[");
  const start =
    objIdx === -1 ? arrIdx : arrIdx === -1 ? objIdx : Math.min(objIdx, arrIdx);
  if (start >= 0) {
    // Attempt progressive slice endings
    for (let end = trimmed.length; end > start + 1; end--) {
      const candidate = trimmed.slice(start, end).trim();
      if (!candidate) continue;
      try {
        return JSON.parse(candidate);
      } catch (_) {
        // keep shrinking
      }
    }
  }
  return null;
}

// Normalize parsed data into array of objects for charts
function toDataset(parsed: ParsedFormattedData): Record<string, any>[] {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed as Record<string, any>[];
  // If it's an object whose values are primitives, turn into one-row dataset
  return [parsed as Record<string, any>];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

/**
 * authFetch: wrapper that attaches Authorization header when a token is available in localStorage
 */
export async function authFetch(input: RequestInfo, init?: RequestInit) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const headers = new Headers(init?.headers as HeadersInit | undefined);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { credentials: token ? "omit" : "include", ...init, headers });
}

/**
 * Calls backend /process endpoint with given fields and raw content, returning a dataset
 */
export async function processScrapeData(
  payload: ProcessRequestPayload
): Promise<{
  dataset: Record<string, any>[];
  raw: ProcessResponseRaw;
}> {
  if (!API_BASE) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }
  const res = await fetch(`${API_BASE}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ProcessResponseRaw = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || `Backend error: ${res.status}`);
  }
  const parsed = extractJson(json.formatted_data || "");
  return { dataset: toDataset(parsed || []), raw: json };
}

/**
 * Legacy sample dataset fallback (still used on initial load if desired)
 */

/**
 * Utility to detect chartable numeric fields in a dataset
 */
export function getNumericFields(data: Record<string, any>[]): string[] {
  if (!data.length) return [];
  const first = data[0];
  return Object.keys(first).filter((k) => typeof first[k] === "number");
}

// --- Processed CSV fetching ---
export interface ProcessedCsvResponse {
  status: "success" | "no_data" | "error" | string;
  rows: Array<Record<string, string>>;
  csv_path?: string;
  row_count?: number;
  error?: string;
}

// Attempt to convert numeric-looking strings to numbers for charting
function coerceDatasetTypes(rows: Array<Record<string, string>>): Record<string, any>[] {
  return rows.map((row) => {
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v == null) {
        obj[k] = v;
        continue;
      }
      const trimmed = String(v).trim();
      if (trimmed === "") {
        obj[k] = trimmed;
        continue;
      }
      const num = Number(trimmed);
      obj[k] = Number.isFinite(num) && /^-?\d*(?:\.\d+)?$/.test(trimmed) ? num : trimmed;
    }
    return obj;
  });
}

// Removed duplicate getProcessedData (see consolidated version below)

// Helper: try to coerce numeric-like strings to numbers
function coerceRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "string") {
      const s = v.trim();
      if (/^-?\d+(?:\.\d+)?$/.test(s)) {
        const n = Number(s);
        out[k] = Number.isNaN(n) ? v : n;
      } else {
        out[k] = v;
      }
    } else {
      out[k] = v as any;
    }
  }
  return out;
}

/**
 * Fetch processed data previously saved by the backend as CSV
 * GET /get_processed_data -> { status, rows, csv_path, row_count }
 */
export async function getProcessedData(): Promise<{
  dataset: Record<string, any>[];
  headers: string[];
  meta: ProcessedCsvResponse;
}> {
  if (!API_BASE) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }
  const res = await fetch(`${API_BASE}/get_processed_data`, { cache: "no-store" });
  const json: ProcessedCsvResponse = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || `Backend error: ${res.status}`);
  }
  if (json.status === "error") {
    throw new Error(json.error || "Unknown backend error");
  }
  const rows: Record<string, any>[] = Array.isArray(json?.rows) ? (json.rows as any) : [];
  const dataset = rows.map(coerceRow);
  const headers = dataset.length ? Object.keys(dataset[0]) : [];
  return { dataset, headers, meta: json };
}
