"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import ChartRenderer from "@/components/ChartRenderer";
import Header from "@/components/Header";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import UserDataViewer from "@/components/UserDataViewer";

export default function DashboardPage() {
  const { user } = useAuth();

  // Visualization state
  const [data, setData] = useState<any[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [xField, setXField] = useState<string>("");
  const [yField, setYField] = useState<string>("");
  const [chartType, setChartType] = useState<
    "line" | "bar" | "scatter" | "pie"
  >("line");
  const [singleFieldMode, setSingleFieldMode] = useState<
    "frequency" | "histogram" | "top10" | "bottom10"
  >("frequency");
  const [requestedFieldsInput, setRequestedFieldsInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Helpers
  const isNumeric = (v: any) => {
    if (v == null) return false;
    const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n);
  };

  const fieldIsNumeric = (field: string) => {
    if (!field) return false;
    let total = 0,
      numeric = 0;
    for (let i = 0; i < data.length && i < 50; i++) {
      const val = (data[i] || {})[field];
      if (val !== undefined) {
        total++;
        if (isNumeric(val)) numeric++;
      }
    }
    return total > 0 && numeric / total > 0.6;
  };

  const buildFrequency = (field: string) => {
    const counts: Record<string, number> = {};
    data.forEach((row) => {
      const key = String(row[field] ?? "(empty)");
      counts[key] = (counts[key] || 0) + 1;
    });
    const arr = Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    return { dataset: arr, x: "value", y: "count", type: "bar" as const };
  };

  const buildHistogram = (field: string, bins = 10) => {
    const nums = data
      .map((row) => Number(String(row[field]).replace(/[^0-9.\-]/g, "")))
      .filter((n) => Number.isFinite(n));
    if (!nums.length)
      return { dataset: [], x: "bin", y: "count", type: "bar" as const };
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const width = (max - min || 1) / bins;
    const counts = new Array(bins).fill(0);
    nums.forEach((n) => {
      let idx = Math.floor((n - min) / width);
      if (idx >= bins) idx = bins - 1;
      if (idx < 0) idx = 0;
      counts[idx]++;
    });
    const dataset = counts.map((c, i) => ({
      bin: `${(min + i * width).toFixed(1)} - ${(min + (i + 1) * width).toFixed(
        1
      )}`,
      count: c,
    }));
    return { dataset, x: "bin", y: "count", type: "bar" as const };
  };

  const buildTopBottom = (
    field: string,
    k = 10,
    order: "desc" | "asc" = "desc"
  ) => {
    const withVal = data
      .map((row, idx) => ({
        label: String(row.name ?? `#${idx + 1}`),
        value: Number(String(row[field]).replace(/[^0-9.\-]/g, "")),
      }))
      .filter((r) => Number.isFinite(r.value));
    const sorted = withVal.sort((a, b) =>
      order === "desc" ? b.value - a.value : a.value - b.value
    );
    const topk = sorted.slice(0, k);
    return { dataset: topk, x: "label", y: "value", type: "bar" as const };
  };

  const availableFields = useMemo(() => {
    const entered = requestedFieldsInput
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
    return entered.length ? entered : fields;
  }, [requestedFieldsInput, fields]);

  const singleFieldSelected = Boolean(xField) !== Boolean(yField);

  const { displayData, displayX, displayY, displayType } = useMemo(() => {
    if (!singleFieldSelected || !data.length) {
      return {
        displayData: data,
        displayX: xField,
        displayY: yField,
        displayType: chartType,
      };
    }
    const field = xField || yField;
    if (!field)
      return {
        displayData: data,
        displayX: xField,
        displayY: yField,
        displayType: chartType,
      };
    const numeric = fieldIsNumeric(field);
    if (!numeric) {
      const res = buildFrequency(field);
      return {
        displayData: res.dataset as any[],
        displayX: res.x,
        displayY: res.y,
        displayType: res.type,
      };
    }
    switch (singleFieldMode) {
      case "histogram": {
        const res = buildHistogram(field);
        return {
          displayData: res.dataset as any[],
          displayX: res.x,
          displayY: res.y,
          displayType: res.type,
        };
      }
      case "top10": {
        const res = buildTopBottom(field, 10, "desc");
        return {
          displayData: res.dataset as any[],
          displayX: res.x,
          displayY: res.y,
          displayType: res.type,
        };
      }
      case "bottom10": {
        const res = buildTopBottom(field, 10, "asc");
        return {
          displayData: res.dataset as any[],
          displayX: res.x,
          displayY: res.y,
          displayType: res.type,
        };
      }
      case "frequency":
      default: {
        const res = buildFrequency(field);
        return {
          displayData: res.dataset as any[],
          displayX: res.x,
          displayY: res.y,
          displayType: res.type,
        };
      }
    }
  }, [singleFieldSelected, data, xField, yField, chartType, singleFieldMode]);

  // Handle Sidebar selection of content items or groups
  const handleSidebarSelect = async (selection: any) => {
    try {
      setError(null);
      const applyRows = (rows: any[]) => {
        setData(rows);
        const headers = Object.keys(rows[0] || {});
        setFields(headers);
        if (!xField && headers.length) setXField(headers[0]);
        if (!yField) {
          const numericOptions = headers.filter((h) =>
            rows.some((r) => isNumeric(r[h]))
          );
          if (numericOptions.length) setYField(numericOptions[0]);
        }
      };

      if (Array.isArray(selection)) {
        const rows: any[] = [];
        selection.forEach((it) => {
          if (Array.isArray((it as any).rows)) rows.push(...(it as any).rows);
        });
        if (rows.length) return applyRows(rows);
      } else if (selection && Array.isArray(selection.rows)) {
        return applyRows(selection.rows);
      } else if (selection && selection.id) {
        const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/$/,
          ""
        );
        if (!API_BASE) throw new Error("API base URL not configured");
        const res = await fetch(`${API_BASE}/contents/${selection.id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed to load content ${selection.id}`);
        const json = await res.json();
        const rows = Array.isArray(json?.parsed_rows) ? json.parsed_rows : [];
        if (rows.length) return applyRows(rows);
        throw new Error("No rows available in the selected content");
      }
      throw new Error("Nothing to visualize from selection");
    } catch (e: any) {
      setError(e?.message || "Failed to load selection");
    }
  };

  return (
    <ProtectedRoute>
      <Header />

      {/* Fixed/positioned Sidebar */}
      <Sidebar onSelect={handleSidebarSelect} />

      {/* Main content shifted to the right of the sidebar */}
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 ml-64">
        {/* Sticky title and controls */}
        <div className="sticky top-20 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
          {/* <motion.div
            className="text-center py-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-2 shadow bg-white/70"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <img src="/icon128.png" alt="Chart Icon" className="w-14 h-14" />
            </motion.div>
            <motion.h1
              className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
              style={{ WebkitBackgroundClip: "text", backgroundClip: "text" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Snaplytics
            </motion.h1>
            <motion.p
              className="text-sm text-slate-700 max-w-2xl mx-auto font-medium"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              Transform your data into interactive visualizations
            </motion.p>
          </motion.div> */}

          {/* Controls */}
          <motion.div
            className="px-6 py-5 mx-4 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              {/* <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800">
                  Fields (comma-separated)
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g. name, price, rating"
                  value={requestedFieldsInput}
                  onChange={(e) => setRequestedFieldsInput(e.target.value)}
                />
              </div> */}

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                  X Axis
                </label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white shadow-sm hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-200 text-sm font-medium"
                  value={xField}
                  onChange={(e) => setXField(e.target.value)}
                >
                  <option value="">Choose X axis...</option>
                  {availableFields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                  Y Axis
                </label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white shadow-sm hover:border-purple-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-sm font-medium"
                  value={yField}
                  onChange={(e) => setYField(e.target.value)}
                >
                  <option value="">Choose Y axis...</option>
                  {availableFields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {singleFieldSelected ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Single-field analysis
                  </label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white shadow-sm hover:border-pink-400 focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all duration-200 text-sm font-medium"
                    value={singleFieldMode}
                    onChange={(e) => setSingleFieldMode(e.target.value as any)}
                  >
                    <option value="frequency">Frequency (categories)</option>
                    <option value="histogram">Histogram (numeric)</option>
                    <option value="top10">Top 10 (numeric)</option>
                    <option value="bottom10">Bottom 10 (numeric)</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    Visualization Type
                  </label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 bg-white shadow-sm hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all duration-200 text-sm font-medium"
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as any)}
                  >
                    <option value="line">Line</option>
                    <option value="bar">Bar</option>
                    <option value="scatter">Scatter</option>
                    <option value="pie">Pie</option>
                  </select>
                </div>
              )}
            </div>
            {error && (
              <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}
          </motion.div>
        </div>

        {/* Content area: table + visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Data Table (left) */}
          <motion.div
            className="bg-white border border-slate-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 min-h-[300px]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center mb-4 pb-3 border-b border-slate-200">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mr-3 shadow-md">
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
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </span>
              Data Table
            </h3>
            <UserDataViewer data={data} fields={availableFields} />
          </motion.div>

          {/* Visualization (right) */}
          <motion.div
            className="bg-white border border-slate-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden min-h-[300px]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mr-3 shadow-md">
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </span>
                Data Visualization
              </h2>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <ChartRenderer
                data={displayData}
                xField={displayX}
                yField={displayY}
                chartType={displayType as any}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
