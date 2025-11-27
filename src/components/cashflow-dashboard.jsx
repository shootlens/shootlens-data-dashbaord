// src/components/CashFlowDashboard.jsx
import React, { useState, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { COLORS } from "../constants";
import generateCashflowInsights from "../utils/nlpCashflow";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);

/* -------------------------
   Helpers
--------------------------*/
const normalizeKey = (str = "") => str.toLowerCase().replace(/\s+/g, " ").trim();

const parseNumber = (v) => {
  if (v == null || v === "" || v === "—") return 0;
  if (typeof v === "number") return v;
  const cleaned = String(v)
    .replace(/,/g, "")
    .replace(/cr|rs|₹/gi, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const safeReplaceAlpha = (rgba, alpha) => {
  try {
    const match = rgba.match(/rgba?\(([^)]+)\)/);
    if (!match) return rgba;
    const [r, g, b] = match[1].split(",").map((x) => x.trim());
    return `rgba(${r},${g},${b},${alpha})`;
  } catch {
    return rgba;
  }
};

// Color style option A — soft pastel
const POS_STYLE = "bg-green-50 border-green-300 text-green-700";
const NEG_STYLE = "bg-red-50 border-red-300 text-red-700";
const NEU_STYLE = "bg-yellow-50 border-yellow-300 text-yellow-700";

// classification thresholds (Standard ±5%)
const POS_THRESHOLD = 5;
const NEG_THRESHOLD = -5;

const getPctFromInsights = (insights, metricKey) => {
  try {
    const pct = insights?.meta?.stats?.[metricKey]?.pct;
    if (typeof pct === "number") return pct;
  } catch {}
  return null;
};

const getColorClassForPct = (pct) => {
  if (pct === null || pct === undefined) return `bg-gray-50 border-gray-200 text-gray-700`;
  if (pct > POS_THRESHOLD) return POS_STYLE;
  if (pct < NEG_THRESHOLD) return NEG_STYLE;
  return NEU_STYLE;
};

/* ---------------------------
   ChartCard component
----------------------------*/
const ChartCard = ({ title, chart, result, takeaway, insights, pct }) => {
  const colorClass = getColorClassForPct(pct);

  return (
    <div className={`bg-white rounded-[10px] border p-4`} style={{ borderColor: COLORS.border }}>
      <h3 className="text-lg font-medium mb-1 text-gray-700">{title}</h3>

      {/* Result (color-coded) */}
      <div className={`${colorClass} border rounded-md p-2 mb-2`}>
        <p className="text-sm font-medium">
          <span className="font-semibold text-gray-800">📊 Result:</span>{" "}
          <span dangerouslySetInnerHTML={{ __html: result || "No result available" }} />
        </p>
      </div>

      {/* Takeaway */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-3">
        <p className="text-sm text-blue-700">
          <span className="font-semibold text-gray-800">💡 Takeaway:</span> {takeaway || "No takeaway available"}
        </p>
      </div>

      {/* Chart */}
      <div className="h-80">{chart}</div>

      {/* Insights Panel - top 2 per-chart recs */}
      <div className="bg-purple-50 border border-purple-200 rounded-md p-2 mt-3">
        <p className="text-sm text-purple-700 font-semibold mb-1">🧠 Insights (AI-based):</p>
        <ul className="text-xs text-purple-800 list-disc ml-5">
          {(insights || []).slice(0, 2).map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
          {(insights || []).length === 0 && <li>No insights available</li>}
        </ul>
      </div>
    </div>
  );
};

/* ---------------------------
   Main Component
----------------------------*/
const CashFlowDashboard = ({ data }) => {
  const [activeTab, setActiveTab] = useState("trends");
  const [yearRange, setYearRange] = useState("all");

  if (!data || !Array.isArray(data) || data.length < 2)
    return <p className="text-center text-gray-500">No cashflow data available</p>;

  // --- parse table to normalized rows
  const headers = data[0].slice(1);
  const rowMap = {};
  data.slice(1).forEach((row) => {
    const key = normalizeKey(row[0]);
    rowMap[key] = row.slice(1).map(parseNumber);
  });

  const get = (name) => rowMap[normalizeKey(name)] || Array(headers.length).fill(0);

  // Try common variants for keys
  const ocf =
    get("cash from operating activity").length > 0
      ? get("cash from operating activity")
      : get("cash from operating activities").length > 0
      ? get("cash from operating activities")
      : get("operating cash flow");

  const icf =
    get("cash from investing activity").length > 0
      ? get("cash from investing activity")
      : get("cash from investing activities").length > 0
      ? get("cash from investing activities")
      : get("investing cash flow");

  const fcf =
    get("cash from financing activity").length > 0
      ? get("cash from financing activity")
      : get("cash from financing activities").length > 0
      ? get("cash from financing activities")
      : get("financing cash flow");

  const ncf =
    get("net cash flow").length > 0 ? get("net cash flow") : get("net cash") || get("net cash flow (increase/decrease)") || [];

  // --- apply year range filter
  const filteredLabels = useMemo(() => {
    if (yearRange === "all") return headers;
    const count = Math.min(headers.length, Number(yearRange));
    return headers.slice(-count);
  }, [headers, yearRange]);

  const sliceToRange = (arr) => arr.slice(-filteredLabels.length);

  const OCF = sliceToRange(ocf);
  const ICF = sliceToRange(icf);
  const FCF = sliceToRange(fcf);
  const NCF = sliceToRange(ncf);

  // --- generate insights via NLP
  const insights = useMemo(() => {
    try {
      return generateCashflowInsights({
        series: { ocf: OCF, icf: ICF, fcf: FCF, ncf: NCF },
        labels: filteredLabels,
      });
    } catch (e) {
      console.error("NLP engine error:", e);
      return null;
    }
  }, [OCF, ICF, FCF, NCF, filteredLabels]);

  // --- chart options
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { padding: 6 } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed?.y ?? ctx.parsed ?? 0;
            return `${ctx.dataset.label}: ₹${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })} Cr`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: false,
        ticks: { callback: (v) => Math.round(v) },
      },
    },
  };

  // --- chart datasets
  const combinedData = {
    labels: filteredLabels,
    datasets: [
      { type: "bar", label: "Operating", data: OCF, backgroundColor: "rgba(34,197,94,0.6)" },
      { type: "bar", label: "Investing", data: ICF, backgroundColor: "rgba(239,68,68,0.6)" },
      { type: "bar", label: "Financing", data: FCF, backgroundColor: "rgba(37,99,235,0.6)" },
      {
        type: "line",
        label: "Net Cash Flow",
        data: NCF,
        borderColor: "rgba(245,158,11,1)",
        backgroundColor: safeReplaceAlpha("rgba(245,158,11,1)", 0.25),
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const makeTrend = (label, color, arr) => ({
    labels: filteredLabels,
    datasets: [{ label, data: arr, borderColor: color, backgroundColor: safeReplaceAlpha(color, 0.25), fill: true, tension: 0.3 }],
  });

  const ocfTrend = makeTrend("Operating Cash Flow", "rgba(34,197,94,1)", OCF);
  const icfTrend = makeTrend("Investing Cash Flow", "rgba(239,68,68,1)", ICF);
  const fcfTrend = makeTrend("Financing Cash Flow", "rgba(37,99,235,1)", FCF);
  const ncfTrend = makeTrend("Net Cash Flow", "rgba(245,158,11,1)", NCF);

  const ocfVsIcf = { labels: filteredLabels, datasets: [{ label: "Operating", data: OCF, backgroundColor: "rgba(34,197,94,0.6)" }, { label: "Investing", data: ICF, backgroundColor: "rgba(239,68,68,0.6)" }] };
  const ocfVsNcf = { labels: filteredLabels, datasets: [{ label: "Operating", data: OCF, backgroundColor: "rgba(34,197,94,0.6)" }, { label: "Net CF", data: NCF, backgroundColor: "rgba(245,158,11,0.6)" }] };

  // --- prepare text & pct values for color classification (fallbacks included)
  const metaStats = insights?.meta?.stats || {};
  const pct_ocf = getPctFromInsights(insights, "ocf") ?? null;
  const pct_icf = getPctFromInsights(insights, "icf") ?? null;
  const pct_fcf = getPctFromInsights(insights, "fcf") ?? null;
  const pct_ncf = getPctFromInsights(insights, "ncf") ?? null;
  const pct_combined = pct_ncf; // use net cash pct for combined

  const perMetric = insights?.perMetric || {};
  const relationships = insights?.relationships || [];
  const recommendationsGlobal = insights?.recommendations || [];

  // fallback formatter when NLP text missing
  const fallbackResult = (label, arr) => {
    if (!arr || arr.length < 2) return `${label}: insufficient data`;
    const start = arr[0],
      end = arr[arr.length - 1];
    const pct = start === 0 ? (end === 0 ? 0 : end > 0 ? 100 : -100) : ((end - start) / Math.abs(start)) * 100;
    return `${label} ${pct >= 0 ? "increased" : "decreased"} by ${Math.abs(pct).toFixed(1)}% over selected period.`;
  };

  const trendsText = {
    ocf: insights?.ocf ?? fallbackResult("Operating Cash Flow", OCF),
    icf: insights?.icf ?? fallbackResult("Investing Cash Flow", ICF),
    fcf: insights?.fcf ?? fallbackResult("Financing Cash Flow", FCF),
    ncf: insights?.ncf ?? fallbackResult("Net Cash Flow", NCF),
    combined: insights?.overall ?? fallbackResult("Net Cash Flow", NCF),
  };

  /* --------------------------
     Render UI
  ---------------------------*/
  return (
    <div className="py-6">
      {/* Tabs */}
      <div className={`flex border-b border-[${COLORS.border}]`}>
        <button onClick={() => setActiveTab("trends")} className={`px-4 py-2 text-sm font-medium ${activeTab === "trends" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}>
          Cash Flow Trends
        </button>
        <button onClick={() => setActiveTab("insights")} className={`ml-4 px-4 py-2 text-sm font-medium ${activeTab === "insights" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}>
          Analytical Insights
        </button>

        {/* Year Filter */}
        <div className="ml-auto">
          <select value={yearRange} onChange={(e) => setYearRange(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="all">All Years</option>
            <option value="3">Last 3 Years</option>
            <option value="5">Last 5 Years</option>
            <option value="10">Last 10 Years</option>
          </select>
        </div>
      </div>

      {/* TRENDS */}
      {activeTab === "trends" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
          <ChartCard title="Overall Cash Flow Overview" chart={<Bar data={combinedData} options={baseOptions} />} result={trendsText.combined} takeaway={relationships[0]} insights={perMetric.combined} pct={pct_combined} />

          <ChartCard title="Operating Cash Flow Trend" chart={<Line data={ocfTrend} options={baseOptions} />} result={trendsText.ocf} takeaway={insights?.signals?.ocf?.msg} insights={perMetric.ocf} pct={pct_ocf} />

          <ChartCard title="Investing Cash Flow Trend" chart={<Line data={icfTrend} options={baseOptions} />} result={trendsText.icf} takeaway={insights?.signals?.icf?.msg} insights={perMetric.icf} pct={pct_icf} />

          <ChartCard title="Financing Cash Flow Trend" chart={<Line data={fcfTrend} options={baseOptions} />} result={trendsText.fcf} takeaway={insights?.signals?.fcf?.msg} insights={perMetric.fcf} pct={pct_fcf} />

          <ChartCard title="Net Cash Flow Trend" chart={<Line data={ncfTrend} options={baseOptions} />} result={trendsText.ncf} takeaway={insights?.signals?.ncf?.msg} insights={perMetric.ncf} pct={pct_ncf} />

          <ChartCard title="Operating vs Investing CF" chart={<Bar data={ocfVsIcf} options={baseOptions} />} result={`${trendsText.ocf} / ${trendsText.icf}`} takeaway={relationships[0]} insights={perMetric.icf} pct={pct_icf} />
        </div>
      )}

      {/* INSIGHTS */}
      {activeTab === "insights" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
          <ChartCard title="Operating vs Net Cash Flow" chart={<Bar data={ocfVsNcf} options={baseOptions} />} result={`${trendsText.ocf} / ${trendsText.ncf}`} takeaway={relationships[0]} insights={perMetric.ncf} pct={pct_ncf} />

          <ChartCard title="Net Cash Flow Cumulative" chart={<Line data={ncfTrend} options={baseOptions} />} result={trendsText.ncf} takeaway={relationships[0]} insights={perMetric.ncf} pct={pct_ncf} />

          <ChartCard title="Operating CF % Change" chart={<Line data={ocfTrend} options={baseOptions} />} result={trendsText.ocf} takeaway={insights?.signals?.ocf?.msg} insights={perMetric.ocf} pct={pct_ocf} />

          <ChartCard title="Investing CF % Change" chart={<Line data={icfTrend} options={baseOptions} />} result={trendsText.icf} takeaway={insights?.signals?.icf?.msg} insights={perMetric.icf} pct={pct_icf} />

          <ChartCard title="Financing CF % Change" chart={<Line data={fcfTrend} options={baseOptions} />} result={trendsText.fcf} takeaway={insights?.signals?.fcf?.msg} insights={perMetric.fcf} pct={pct_fcf} />

          <ChartCard title="Overall Movement Summary" chart={<Bar data={combinedData} options={baseOptions} />} result={trendsText.combined} takeaway={relationships[0]} insights={perMetric.combined} pct={pct_combined} />
        </div>
      )}
    </div>
  );
};

export default CashFlowDashboard;
