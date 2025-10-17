"use client";
interface ContentItem {
  id: string;
  title: string;
  summary?: string;
}

import React, { useEffect, useState } from "react";

interface ContentItem {
  id: string;
  title: string;
  summary?: string;
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
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
    const url = endpoint || `${API_BASE}/contents`;
    let mounted = true;
    setLoading(true);
    fetch(url, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const data = await res.json();
        if (!mounted) return;
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Sidebar load error:", err);
        if (mounted) setError(String(err || "Unknown error"));
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [endpoint]);

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
