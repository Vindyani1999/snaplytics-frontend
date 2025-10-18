"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import ChartRenderer from "@/components/ChartRenderer";
import Header from "@/components/Header";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";
import {
  processScrapeData,
  getNumericFields,
  getProcessedData,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import UserDataViewer from "@/components/UserDataViewer";

export default function DashboardPage() {
  const [data, setData] = useState<any[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [xField, setXField] = useState<string>("");
  const [yField, setYField] = useState<string>("");
  const [chartType, setChartType] = useState("line");
  const [singleFieldMode, setSingleFieldMode] = useState<
    "frequency" | "histogram" | "top10" | "bottom10"
  >("frequency");
  // New states for backend processing
  const [rawContent, setRawContent] = useState("");
  const [requestedFieldsInput, setRequestedFieldsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const { user, logout } = useAuth();

  async function handleProcess() {
    setError(null);
    setLoading(true);
    try {
      const fieldsRequested = requestedFieldsInput
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
      const { dataset, raw } = await processScrapeData({
        fields: fieldsRequested,
        rawContent,
      });
      if (!dataset.length) {
        setError(
          "Parsed dataset is empty. Check the backend formatted_data output."
        );
      }
      setData(dataset);
      const numeric = getNumericFields(dataset);
      setFields(Object.keys(dataset[0] || {}));
      // Auto-select axes if not chosen
      if (!xField && Object.keys(dataset[0] || {}).length) {
        setXField(Object.keys(dataset[0])[0]);
      }
      if (!yField && numeric.length) {
        setYField(numeric[0]);
      }
      setLastTimestamp(raw.timestamp || null);
    } catch (e: any) {
      setError(e.message || "Processing failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadProcessed() {
    setError(null);
    setLoading(true);
    try {
      const { dataset, headers, meta } = await getProcessedData();
      if (!dataset.length) {
        setError(
          meta.status === "no_data"
            ? "No processed CSV found yet."
            : meta.error || "No rows returned."
        );
      }
      setData(dataset);
      setFields(headers);
      setRowCount(meta.row_count ?? null);
      // Choose defaults: x as first non-numeric field if any, y as first numeric
      const numeric = getNumericFields(dataset);
      const firstNonNumeric = headers.find((h) => !numeric.includes(h));
      if (!xField) setXField(firstNonNumeric || headers[0] || "");
      if (!yField) setYField(numeric[0] || "");
    } catch (e: any) {
      setError(e.message || "Failed to load processed data");
    } finally {
      setLoading(false);
    }
  }

  // Helpers to analyze data for single-field selections
  const isNumeric = (v: any) => {
    if (v == null) return false;
    const n = Number(
      String(v)
        .toString()
        .replace(/[^0-9.\-]/g, "")
    );
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
    return total > 0 && numeric / total > 0.6; // majority numeric
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
    // default: original dataset and chosen chart type
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
      // categorical: frequency distribution
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

  // Initial dataset is empty until user processes raw content.

  return (
    <ProtectedRoute>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex gap-6">
            <div className="sticky top-24 h-[calc(100vh-6rem)] w-64 flex-shrink-0">
              <Sidebar
                endpoint={undefined}
                onSelect={(item) => {
                  // Support both content id selection and direct rows from Sidebar
                  const items = Array.isArray(item) ? item : [item];
                  const first = items[0] as any;
                  if (first?.rows) {
                    // Build raw content from provided rows
                    const rows = items.flatMap((it: any) => it.rows || []);
                    const raw = JSON.stringify(rows);
                    setRawContent(raw);
                    // If user hasn't entered fields, infer from first row
                    if (!requestedFieldsInput.trim() && rows.length) {
                      const inferred = Object.keys(rows[0]).join(", ");
                      setRequestedFieldsInput(inferred);
                    }
                    handleProcess();
                    return;
                  }

                  // Fallback to fetching content body by id
                  const contentId = first?.id;
                  if (!contentId) {
                    setError("Invalid selection");
                    return;
                  }
                  const API_BASE = (
                    process.env.NEXT_PUBLIC_API_URL || ""
                  ).replace(/\/$/, "");
                  fetch(`${API_BASE}/contents/${contentId}`, {
                    credentials: "include",
                  })
                    .then((r) => r.json())
                    .then((data) => {
                      if (data?.body) {
                        setRawContent(data.body);
                        handleProcess();
                      }
                    })
                    .catch((err) => {
                      console.error("Failed to load content body:", err);
                      setError("Failed to load content");
                    });
                }}
              />
            </div>
            <div
              className="flex-1 overflow-y-auto space-y-6"
              style={{ maxHeight: "calc(100vh - 6rem)" }}
            >
              {/* Logo and Title */}
              <motion.div
                className="text-center py-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <motion.div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
                    type: "spring",
                    stiffness: 200,
                  }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <span className="text-2xl">
                    <img src="/icon128.png" alt="Chart Icon" />
                  </span>
                </motion.div>
                <motion.h1
                  className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2"
                  style={{
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.4 }}
                >
                  Snaplytics
                </motion.h1>
                <motion.p
                  className="text-lg text-slate-700 max-w-2xl mx-auto font-medium"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                >
                  Transform your data into interactive visualizations
                </motion.p>
              </motion.div>

              {/* Processing & Selection Controls */}
              <motion.div
                className="bg-white/90 backdrop-blur-lg border border-white/30 p-6 rounded-3xl shadow-xl"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <input
                    type="text"
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full md:w-80"
                    placeholder="Enter fields (comma separated, e.g. name, price)"
                    value={requestedFieldsInput}
                    onChange={(e) => setRequestedFieldsInput(e.target.value)}
                  />
                  <motion.button
                    onClick={handleProcess}
                    disabled={loading || !rawContent}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={!loading ? { scale: 1.05 } : undefined}
                    whileTap={!loading ? { scale: 0.96 } : undefined}
                  >
                    {loading ? "Processing..." : "Process & Load Data"}
                  </motion.button>
                  <motion.button
                    onClick={handleLoadProcessed}
                    disabled={loading}
                    className="px-6 py-3 rounded-xl border-2 border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={!loading ? { scale: 1.03 } : undefined}
                    whileTap={!loading ? { scale: 0.97 } : undefined}
                  >
                    {loading ? "Loading..." : "Load Last Processed CSV"}
                  </motion.button>
                  {lastTimestamp && (
                    <span className="text-xs text-slate-500">
                      Last processed:{" "}
                      {new Date(lastTimestamp).toLocaleTimeString()}
                    </span>
                  )}
                  {rowCount !== null && (
                    <span className="text-xs text-slate-500">
                      Rows: {rowCount}
                    </span>
                  )}
                  {error && (
                    <span className="text-sm text-red-600 font-medium">
                      {error}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-800">
                      X Axis Field
                    </label>
                    <select
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-white/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm hover:shadow-md text-slate-800 font-medium"
                      value={xField}
                      onChange={(e) => setXField(e.target.value)}
                    >
                      <option value="">Choose X axis...</option>
                      {(requestedFieldsInput.trim()
                        ? requestedFieldsInput
                            .split(",")
                            .map((f) => f.trim())
                            .filter(Boolean)
                        : fields
                      ).map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-800">
                      Y Axis Field
                    </label>
                    <select
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-white/80 backdrop-blur-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 shadow-sm hover:shadow-md text-slate-800 font-medium"
                      value={yField}
                      onChange={(e) => setYField(e.target.value)}
                    >
                      <option value="">Choose Y axis...</option>
                      {(requestedFieldsInput.trim()
                        ? requestedFieldsInput
                            .split(",")
                            .map((f) => f.trim())
                            .filter(Boolean)
                        : fields
                      ).map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  {Boolean(xField) !== Boolean(yField) ? (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-800">
                        Single-field analysis
                      </label>
                      <select
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-white/80 backdrop-blur-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200 shadow-sm hover:shadow-md text-slate-800 font-medium"
                        value={singleFieldMode}
                        onChange={(e) =>
                          setSingleFieldMode(e.target.value as any)
                        }
                      >
                        <option value="frequency">
                          🔢 Frequency (categories)
                        </option>
                        <option value="histogram">
                          📊 Histogram (numeric)
                        </option>
                        <option value="top10">⬆️ Top 10 (numeric)</option>
                        <option value="bottom10">⬇️ Bottom 10 (numeric)</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-800">
                        Visualization Type
                      </label>
                      <select
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-white/80 backdrop-blur-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200 shadow-sm hover:shadow-md text-slate-800 font-medium"
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value)}
                      >
                        <option value="line">📈 Line Chart</option>
                        <option value="bar">📊 Bar Chart</option>
                        <option value="scatter">⚪ Scatter Plot</option>
                        <option value="pie">🥧 Pie Chart</option>
                      </select>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Two Column Layout: Table and Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Data Table */}
                <motion.div
                  className="bg-white/90 backdrop-blur-lg border border-white/30 rounded-3xl shadow-xl overflow-hidden"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  <div className="p-4 border-b border-slate-200/50">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                      <span className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full mr-3"></span>
                      Data Table
                    </h2>
                  </div>
                  <div className="overflow-auto max-h-[600px]">
                    {user && <UserDataViewer email={user.email} />}
                  </div>
                </motion.div>

                {/* Chart Visualization */}
                <motion.div
                  className="bg-white/90 backdrop-blur-lg border border-white/30 rounded-3xl shadow-xl overflow-hidden"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  <div className="p-4 border-b border-slate-200/50">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                      <motion.span
                        className="w-2 h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mr-3"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatType: "reverse",
                        }}
                      ></motion.span>
                      Data Visualization
                    </h2>
                  </div>
                  <div className="p-4">
                    <ChartRenderer
                      data={displayData}
                      xField={displayX}
                      yField={displayY}
                      chartType={displayType}
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
