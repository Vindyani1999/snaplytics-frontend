"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface ContentItem {
  id: string;
  title: string;
  summary?: string;
  timestamp?: string;
  body?: string;
  rows?: Array<{ name: string; price: string }>;
}

export default function Sidebar({
  endpoint,
  onSelect,
}: {
  endpoint?: string;
  onSelect?: (item: ContentItem | ContentItem[]) => void;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  // Grouped by timestamp: { [timestamp]: ContentItem[] }
  const [grouped, setGrouped] = useState<Record<string, ContentItem[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
    const url = endpoint || `${API_BASE}/contents`;
    let mounted = true;
    setLoading(true);

    (async () => {
      try {
        console.debug("Sidebar fetching URL:", url);
        const res = await fetch(url, { credentials: "include" });
        console.debug("Sidebar response status:", res.status, res.statusText);

        if (!mounted) return;

        // On any non-ok status, try the user-data fallback (if email present)
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.warn(
            `Sidebar primary fetch failed: ${res.status}`,
            text.slice(0, 1000)
          );

          if (user?.email) {
            try {
              const udUrl = `${API_BASE}/get_user_data_by_email/${encodeURIComponent(
                user.email
              )}`;
              console.debug("Sidebar falling back to user data URL:", udUrl);
              const udRes = await fetch(
                `${API_BASE}/get_user_data_by_email/${encodeURI(user.email)}`,
                { credentials: "include" }
              );
              if (!udRes.ok)
                throw new Error(`User data fetch failed: ${udRes.status}`);
              const udJson = await udRes.json();
              const records = Array.isArray(udJson.records)
                ? udJson.records
                : [];
              const rows: ContentItem[] = [];
              // Group by timestamp (if present)
              const groups: Record<string, ContentItem[]> = {};
              records.forEach((r: any, i: number) => {
                const parsed =
                  Array.isArray(r.parsed_rows) && r.parsed_rows.length
                    ? r.parsed_rows
                    : [];
                const ts = r.timestamp || r.created_at || `unknown-${i}`;
                if (!groups[ts]) groups[ts] = [];
                parsed.forEach((row: any, idx: number) => {
                  groups[ts].push({
                    id: `user-${i}-${idx}`,
                    title: String(row.name || `Row ${idx + 1}`),
                    rows: [row],
                    timestamp: ts,
                  });
                });
              });
              setItems(rows); // legacy flat list (not used below)
              setGrouped(groups);
              setError(null);
              return;
            } catch (udErr) {
              console.error("Sidebar user-data fallback failed:", udErr);
              if (mounted)
                setError(String(udErr || "User data fallback failed"));
              return;
            }
          }

          // no fallback available
          if (mounted) setError(`Primary fetch failed: ${res.status}`);
          return;
        }

        // success path
        const data = await res.json();
        if (!mounted) return;
        setItems(Array.isArray(data) ? data : []);
        // If data has timestamps, group by timestamp
        const groups: Record<string, ContentItem[]> = {};
        (Array.isArray(data) ? data : []).forEach((item: any, i: number) => {
          const ts = item.timestamp || item.created_at || `unknown-${i}`;
          if (!groups[ts]) groups[ts] = [];
          groups[ts].push({ ...item, timestamp: ts });
        });
        setGrouped(groups);
        setError(null);
      } catch (err: any) {
        console.error("Sidebar load error:", err);
        if (mounted) setError(String(err || "Unknown error"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [endpoint, user?.email]);

  return (
    <aside
      aria-label="Available content sidebar"
      className="fixed h-[calc(100vh-4rem)]"
    >
      <div className="h-full bg-white/90 border border-white/30 shadow-md overflow-auto transition-all w-64 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">
            Available Content
          </h3>
        </div>

        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}
        {!loading && Object.keys(grouped).length === 0 && (
          <div className="text-sm text-gray-500">No content found</div>
        )}

        <ul className="space-y-3 mt-2">
          {Object.entries(grouped).map(([timestamp, group]) => (
            <li key={timestamp} className="mb-2">
              <button
                className="w-full flex items-center gap-2 text-left font-semibold text-blue-700 p-3"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [timestamp]: !prev[timestamp],
                  }))
                }
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  🕒
                </span>
                <span className="flex-1">
                  {timestamp === "unknown-0"
                    ? "Unknown time"
                    : new Date(timestamp).toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">
                  {group.length} item(s)
                </span>
                <span className="ml-auto">
                  {expanded[timestamp] ? "▼" : "►"}
                </span>
              </button>
              {expanded[timestamp] && (
                <ul className="ml-4 mt-1 space-y-1">
                  <li>
                    <button
                      className="w-full text-left text-blue-600 hover:underline text-xs py-1"
                      onClick={() => onSelect?.(group)}
                    >
                      Visualize all ({group.length} row
                      {group.length !== 1 ? "s" : ""})
                    </button>
                  </li>
                  {group.map((it) => (
                    <li key={it.id}>
                      <button
                        onClick={() => onSelect?.(it)}
                        className="w-full text-left rounded hover:bg-blue-50 px-2 py-1 text-slate-700 text-xs"
                      >
                        {it.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
