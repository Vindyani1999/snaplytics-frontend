"use client";

import React, { useEffect, useState } from "react";
import { fetchUserDataByEmail } from "@/lib/userApi";
import { getRowsFromRecord, normalizePrice, Row } from "@/utils/dataParsing";
import { processScrapeData } from "@/lib/api";
// Chart rendering is done on the main dashboard; here we show analysis JSON

export default function UserDataViewer({ email }: { email: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    fetchUserDataByEmail(email)
      .then((resp) => {
        const records = Array.isArray(resp.records) ? resp.records : [];
        const parsed: Row[] = records.flatMap((r: any) => getRowsFromRecord(r));
        setRows(parsed);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [email]);

  async function handleAnalyze() {
    if (!rows.length) return;
    const payload = {
      fields: ["name", "price"],
      rawContent: JSON.stringify(rows),
    };
    try {
      setLoading(true);
      const res = await processScrapeData(payload as any);
      setAnalysisResult(res.dataset);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">User data for {email}</h2>
        <div>
          <button className="btn" onClick={handleAnalyze} disabled={!rows.length || loading}>
            {loading ? "Processing…" : "Analyze"}
          </button>
        </div>
      </div>

      {error && <div className="text-red-500">{error}</div>}
      {!loading && !rows.length && <div className="text-sm text-slate-500">No rows found</div>}

      {rows.length > 0 && (
        <div className="overflow-auto border rounded p-2">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1">Price</th>
                <th className="px-2 py-1">Price (number)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const n = normalizePrice(r.price);
                return (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">{r.name}</td>
                    <td className="px-2 py-1">{r.price}</td>
                    <td className="px-2 py-1">{n ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {analysisResult && (
        <div>
          <h3 className="text-md font-medium">Analysis result (raw)</h3>
          <pre className="bg-slate-100 p-3 rounded mt-2 overflow-auto max-h-96">
            {JSON.stringify(analysisResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
