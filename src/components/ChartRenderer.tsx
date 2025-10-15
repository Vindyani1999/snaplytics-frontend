import React, { ReactElement } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange
  "#ec4899", // Pink
  "#6366f1", // Indigo
];

const GRADIENTS = [
  "url(#gradient1)",
  "url(#gradient2)",
  "url(#gradient3)",
  "url(#gradient4)",
  "url(#gradient5)",
];

interface ChartRendererProps {
  data: any[];
  xField: string;
  yField: string;
  chartType: string;
}

export default function ChartRenderer({
  data,
  xField,
  yField,
  chartType,
}: ChartRendererProps) {
  if (!xField || !yField || data.length === 0)
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-96 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-300"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-16 h-16 bg-gradient-to-br rounded-full flex items-center justify-center mb-4"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <span className="text-white text-xl opacity-50">
            <img src="/icon128.png" alt="Chart Icon" />
          </span>
        </motion.div>
        <motion.p
          className="text-slate-700 font-medium text-lg mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.5, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Ready to visualize your data?
        </motion.p>
        <motion.p
          className="text-slate-600 text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.5, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Select X and Y fields to get started
        </motion.p>
      </motion.div>
    );

  let chart: ReactElement | null = null;

  switch (chartType) {
    case "bar":
      chart = (
        <BarChart data={data}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis
            dataKey={xField}
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Bar
            dataKey={yField}
            fill="url(#barGradient)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      );
      break;

    case "line":
      chart = (
        <LineChart data={data}>
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis
            dataKey={xField}
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Line
            type="monotone"
            dataKey={yField}
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
            activeDot={{
              r: 6,
              stroke: "#3b82f6",
              strokeWidth: 2,
              fill: "#fff",
            }}
            fill="url(#lineGradient)"
          />
        </LineChart>
      );
      break;

    case "scatter":
      chart = (
        <ScatterChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          <XAxis
            dataKey={xField}
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey={yField}
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Scatter data={data} fill="#3b82f6" />
        </ScatterChart>
      );
      break;

    case "pie":
      chart = (
        <PieChart>
          <defs>
            {COLORS.map((color, index) => (
              <linearGradient
                key={index}
                id={`pieGradient${index}`}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                <stop offset="100%" stopColor={color} stopOpacity={0.6} />
              </linearGradient>
            ))}
          </defs>
          <Pie
            data={data}
            dataKey={yField}
            nameKey={xField}
            cx="50%"
            cy="50%"
            outerRadius={140}
            innerRadius={50}
            paddingAngle={2}
            label={(props: any) =>
              `${props.name}: ${(props.percent * 100).toFixed(1)}%`
            }
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={`url(#pieGradient${index % COLORS.length})`}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
            }}
          />
        </PieChart>
      );
      break;

    default:
      chart = <p>No chart type selected.</p>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${chartType}-${xField}-${yField}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
      >
        <ChartWrapper>{chart}</ChartWrapper>
      </motion.div>
    </AnimatePresence>
  );
}

function ChartWrapper({ children }: { children: ReactElement }) {
  return (
    <div className="relative overflow-hidden">
      {/* Background decoration with animations */}
      <motion.div
        className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full -translate-x-16 -translate-y-16"
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      ></motion.div>
      <motion.div
        className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-pink-400/10 to-orange-400/10 rounded-full translate-x-20 translate-y-20"
        animate={{
          rotate: [360, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
      ></motion.div>

      <motion.div
        className="relative p-8 min-h-[500px] flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <ResponsiveContainer width="100%" height={450}>
          {children}
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
