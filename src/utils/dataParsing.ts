export type Row = { name: string; price: string };

export function extractJsonFromCodeBlock(text: string): any | null {
  if (!text) return null;
  const code = text
    .replace(/^```[a-zA-Z]*\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  try {
    return JSON.parse(code);
  } catch (err) {
    // try to find JSON substring
    const first = code.indexOf("{");
    const last = code.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(code.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function normalizePrice(priceStr: string): number | null {
  if (priceStr == null) return null;
  const cleaned = String(priceStr).replace(/[^0-9.\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function getRowsFromRecord(record: any): Row[] {
  if (!record) return [];
  if (Array.isArray(record.parsed_rows) && record.parsed_rows.length) {
    return record.parsed_rows.map((r: any) => ({
      name: String(r.name || ""),
      price: String(r.price || ""),
    }));
  }
  const maybe = extractJsonFromCodeBlock(String(record.model_raw || ""));
  if (!maybe) return [];
  const rows = Array.isArray(maybe.rows)
    ? maybe.rows
    : Array.isArray(maybe)
    ? maybe
    : [];
  return rows.map((r: any) => ({
    name: String(r.name || ""),
    price: String(r.price || ""),
  }));
}
