"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface ContentItem {
  id: string;
  title: string;
  summary?: string;
  // optional body or rows for immediate processing
  body?: string;
  rows?: Array<{ name: string; price: string }>;
}

export default function Sidebar({
  endpoint,
  onSelect,
  collapsed = false,
  onToggle,
}: {
  endpoint?: string;
  onSelect?: (item: ContentItem) => void;
  collapsed?: boolean;
  onToggle?: (next: boolean) => void;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
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
                const udRes = await fetch(`${API_BASE}/get_user_data_by_email/${encodeURI(user.email)}`, { credentials: "include" });
              if (!udRes.ok)
                throw new Error(`User data fetch failed: ${udRes.status}`);
              const udJson = await udRes.json();
              const records = Array.isArray(udJson.records)
                ? udJson.records
                : [];
              const rows: ContentItem[] = [];
              records.forEach((r: any, i: number) => {
                const parsed =
                  Array.isArray(r.parsed_rows) && r.parsed_rows.length
                    ? r.parsed_rows
                    : [];
                if (parsed.length) {
                  parsed.forEach((row: any, idx: number) => {
                    rows.push({
                      id: `user-${i}-${idx}`,
                      title: String(row.name || `Row ${idx + 1}`),
                      rows: [row],
                    });
                  });
                }
              });
              setItems(rows);
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
      className="fixed left-4 top-20 z-40 h-[calc(100vh-5rem)]"
    >
      <div
        className={`h-full bg-white/90 border border-white/30 rounded-2xl shadow-md overflow-auto transition-all ${
          collapsed ? "w-16 px-2 py-3" : "w-64 p-4"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          {!collapsed && (
            <h3 className="text-sm font-semibold text-slate-700">
              Available Content
            </h3>
          )}
          <button
            onClick={() => onToggle?.(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-2 text-xs text-slate-500 bg-transparent hover:bg-slate-100 rounded-full p-1"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}
        {!loading && !items.length && (
          <div className="text-sm text-gray-500">No content found</div>
        )}

        <ul className="space-y-3 mt-2">
          {items.map((it) => (
            <li key={it.id}>
              <button
                onClick={() => onSelect?.(it)}
                className={`w-full text-left rounded-lg hover:bg-blue-50 transition-colors flex items-start gap-2 ${
                  collapsed ? "p-2" : "p-3"
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                  {it.title?.charAt(0) || "C"}
                </div>
                {!collapsed && (
                  <div>
                    <div className="font-medium text-slate-800">{it.title}</div>
                    {it.summary && (
                      <div className="text-xs text-slate-500">{it.summary}</div>
                    )}
                    {it.rows && it.rows.length > 0 && (
                      <div className="text-xs text-slate-400 mt-1">
                        {it.rows.length} row(s)
                      </div>
                    )}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
