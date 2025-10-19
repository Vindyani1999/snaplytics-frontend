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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 ml-64">
        {/* Sticky title and controls */}
        <div className="sticky top-20 z-20 bg-gradient-to-br from-slate-50/90 via-blue-50/90 to-purple-50/90 backdrop-blur border-b border-white/30">
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
            className="bg-white/90 backdrop-blur-lg border border-white/30 px-6 py-4 rounded-3xl shadow-xl mx-4 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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
                <label className="block text-sm font-semibold text-slate-800">
                  X Axis
                </label>
                <select
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 bg-white/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                <label className="block text-sm font-semibold text-slate-800">
                  Y Axis
                </label>
                <select
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 bg-white/80 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
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
                  <label className="block text-sm font-semibold text-slate-800">
                    Single-field analysis
                  </label>
                  <select
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 bg-white/80 focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
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
                  <label className="block text-sm font-semibold text-slate-800">
                    Visualization Type
                  </label>
                  <select
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 bg-white/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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
            {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
          </motion.div>
        </div>

        {/* Content area: table + visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
          {/* Data Table (left) */}
          <div className="bg-white/90 backdrop-blur-lg border border-white/30 p-4 rounded-3xl shadow-xl min-h-[300px]">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center mb-3">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              Data Table
            </h3>
            <UserDataViewer data={data} fields={availableFields} />
          </div>

          {/* Visualization (right) */}
          <motion.div
            className="bg-white/90 backdrop-blur-lg border border-white/30 rounded-3xl shadow-xl overflow-hidden min-h-[300px]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="p-6 border-b border-slate-200/50">
              <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                <span className="w-2 h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mr-3"></span>
                Data Visualization
              </h2>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
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
