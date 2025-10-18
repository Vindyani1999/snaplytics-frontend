"use client";

import { useState, useEffect } from "react";
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
              className="flex-1 overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 6rem)" }}
            >
              {/* Profile Section */}
              {/* {user && (
            <div className="flex items-center gap-4 bg-white/80 border border-blue-100 rounded-xl p-4 mb-6 shadow">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-14 h-14 rounded-full border-2 border-blue-500"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">
                    {user.name?.charAt(0) || "U"}
                  </span>
                </div>
              )}
              <div>
                <div className="font-semibold text-lg text-blue-700">
                  {user.name}
                </div>
                <div className="text-sm text-gray-600">{user.email}</div>
              </div>
              <button
                onClick={logout}
                className="ml-auto px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold shadow transition-colors"
              >
                Logout
              </button>
            </div>
          )} */}

              {/* Header Section */}
              {user && (
                <div className="mb-6">
                  <UserDataViewer email={user.email} />
                </div>
              )}
              <motion.div
                className="text-center py-8"
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
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
                className="bg-white/90 backdrop-blur-lg border border-white/30 p-8 rounded-3xl shadow-xl"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                whileHover={{ y: -5 }}
              >
                <div className="flex flex-wrap items-center gap-4 mb-6">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 1.2 }}
                  >
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      X Axis Field
                    </label>
                    <motion.select
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-white/80 backdrop-blur-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm hover:shadow-md text-slate-800 font-medium"
                      value={xField}
                      onChange={(e) => setXField(e.target.value)}
                      whileFocus={{ scale: 1.02 }}
                      whileHover={{ y: -2 }}
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
                    </motion.select>
                  </motion.div>

                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.4 }}
                  >
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Y Axis Field
                    </label>
                    <motion.select
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-white/80 backdrop-blur-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 shadow-sm hover:shadow-md text-slate-800 font-medium"
                      value={yField}
                      onChange={(e) => setYField(e.target.value)}
                      whileFocus={{ scale: 1.02 }}
                      whileHover={{ y: -2 }}
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
                    </motion.select>
                  </motion.div>

                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 1.6 }}
                  >
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Visualization Type
                    </label>
                    <motion.select
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-white/80 backdrop-blur-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200 shadow-sm hover:shadow-md text-slate-800 font-medium"
                      value={chartType}
                      onChange={(e) => setChartType(e.target.value)}
                      whileFocus={{ scale: 1.02 }}
                      whileHover={{ y: -2 }}
                    >
                      <option value="line">📈 Line Chart</option>
                      <option value="bar">📊 Bar Chart</option>
                      <option value="scatter">⚪ Scatter Plot</option>
                      <option value="pie">🥧 Pie Chart</option>
                    </motion.select>
                  </motion.div>
                </div>
              </motion.div>

              {/* Chart Renderer */}
              <motion.div
                className="bg-white/90 backdrop-blur-lg border border-white/30 rounded-3xl shadow-xl overflow-hidden"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.8 }}
                whileHover={{ y: -5 }}
              >
                <motion.div
                  className="p-6 border-b border-slate-200/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 2 }}
                >
                  <h2 className="text-xl font-semibold text-slate-800 flex items-center">
                    <motion.span
                      className="w-2 h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mr-3"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse",
                        delay: 0.5,
                      }}
                    ></motion.span>
                    Data Visualization
                  </h2>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 2.2 }}
                >
                  <ChartRenderer
                    data={data}
                    xField={xField}
                    yField={yField}
                    chartType={chartType}
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
