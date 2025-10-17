"use client";

import React, { useEffect, useState } from "react";

interface ContentItem {
  id: string;
  title: string;
  summary?: string;
}

export default function Sidebar({
  endpoint,
  onSelect,
}: {
  endpoint?: string;
  onSelect?: (item: ContentItem) => void;
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
        // Expecting array of { id, title, summary }
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
    <aside className="w-full md:w-64 bg-white/80 border border-white/30 rounded-2xl p-4 shadow-md">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Available Content</h3>
      {loading && <div className="text-sm text-gray-500">Loading...</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}
      {!loading && !items.length && <div className="text-sm text-gray-500">No content found</div>}
      <ul className="space-y-3 mt-2">
        {items.map((it) => (
          <li key={it.id}>
            <button
              onClick={() => onSelect?.(it)}
              className="w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium text-slate-800">{it.title}</div>
              {it.summary && <div className="text-xs text-slate-500">{it.summary}</div>}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
