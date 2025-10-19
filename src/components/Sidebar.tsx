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
      className="fixed h-[calc(100vh-4rem)] top-16 left-0 z-30"
    >
      <div className="h-full bg-gradient-to-b from-white to-slate-50 border-r border-slate-200 shadow-xl overflow-auto transition-all w-64">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-4 mb-4 shadow-md">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Available Content
          </h3>
        </div>

        <div className="px-4">
          {loading && (
            <div className="text-sm text-slate-500 flex items-center gap-2 p-3">
              <svg
                className="animate-spin h-4 w-4 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Loading...
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              {error}
            </div>
          )}
          {!loading && Object.keys(grouped).length === 0 && (
            <div className="text-sm text-slate-500 text-center py-8">
              <svg
                className="w-12 h-12 mx-auto mb-2 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              No content found
            </div>
          )}

          <ul className="space-y-3 mt-2">
            {Object.entries(grouped).map(([timestamp, group]) => (
              <li key={timestamp}>
                <button
                  className="w-full flex items-center gap-3 text-left p-3 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 border border-slate-200 hover:border-indigo-300 hover:shadow-md group"
                  onClick={() => onSelect?.(group)}
                >
                  <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-slate-800 group-hover:text-indigo-700 transition-colors">
                      {timestamp === "unknown-0"
                        ? "Unknown time"
                        : new Date(timestamp).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path
                          fillRule="evenodd"
                          d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {group.length} item{group.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
