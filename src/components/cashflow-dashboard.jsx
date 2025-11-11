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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

const CashFlowDashboard = ({ data }) => {
  const [activeTab, setActiveTab] = useState("trends");
  const [yearRange, setYearRange] = useState("all");

  if (!data || !Array.isArray(data) || data.length < 2)
    return <p className="text-center text-gray-500">No cashflow data available</p>;

  // --- Parse data ---
  const headers = data[0].slice(1);
  const map = {};
  data.slice(1).forEach((row) => {
    const key = row[0];
    map[key] = row.slice(1).map((v) => parseFloat(v.replace(/,/g, "")) || 0);
  });

  const ocf = map["Cash from Operating Activity"] || [];
  const icf = map["Cash from Investing Activity"] || [];
  const fcf = map["Cash from Financing Activity"] || [];
  const ncf = map["Net Cash Flow"] || [];

  // --- Apply year filter ---
  const filteredLabels = useMemo(() => {
    if (yearRange === "all") return headers;
    const count = Math.min(headers.length, Number(yearRange));
    return headers.slice(-count);
  }, [headers, yearRange]);

  const filterSeries = (arr) => arr.slice(-filteredLabels.length);

  const OCF = filterSeries(ocf);
  const ICF = filterSeries(icf);
  const FCF = filterSeries(fcf);
  const NCF = filterSeries(ncf);

  // --- Chart options ---
  const options = {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: function (context) {
            const value = context.parsed.y;
            return `${context.dataset.label}: ₹${value.toFixed(2)} Cr`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        title: { display: true, text: "₹ Crores" },
        ticks: {
          callback: function (value) {
            return Math.round(value);
          },
        },
      },
    },
  };

  // --- Helpers ---
  const getChange = (arr) =>
    arr.length > 1 ? ((arr[arr.length - 1] - arr[0]) / Math.abs(arr[0] || 1)) * 100 : 0;

  const formatChange = (value) =>
    `${value >= 0 ? "increased" : "decreased"} by ${Math.abs(value).toFixed(1)}%`;

  const periodText =
    yearRange === "all"
      ? "over the available period"
      : `over the last ${yearRange} years`;

  // --- Chart Data ---
  const combinedData = {
    labels: filteredLabels,
    datasets: [
      { type: "bar", label: "Operating", data: OCF, backgroundColor: "rgba(34,197,94,0.6)", borderRadius: 8 },
      { type: "bar", label: "Investing", data: ICF, backgroundColor: "rgba(239,68,68,0.6)", borderRadius: 8 },
      { type: "bar", label: "Financing", data: FCF, backgroundColor: "rgba(37,99,235,0.6)", borderRadius: 8 },
      { type: "line", label: "Net Cash Flow", data: NCF, borderColor: "#f59e0b", tension: 0.3, borderWidth: 2 },
    ],
  };

  const makeTrend = (label, color, data) => ({
    labels: filteredLabels,
    datasets: [
      {
        label,
        data,
        borderColor: color,
        backgroundColor: color.replace("1)", "0.15)"),
        tension: 0.3,
        fill: true,
      },
    ],
  });

  const ocfTrend = makeTrend("Operating Cash Flow", "rgba(34,197,94,1)", OCF);
  const icfTrend = makeTrend("Investing Cash Flow", "rgba(239,68,68,1)", ICF);
  const fcfTrend = makeTrend("Financing Cash Flow", "rgba(37,99,235,1)", FCF);
  const ncfTrend = makeTrend("Net Cash Flow", "rgba(245,158,11,1)", NCF);

  const ocfVsIcf = {
    labels: filteredLabels,
    datasets: [
      { label: "Operating CF", data: OCF, backgroundColor: "rgba(34,197,94,0.6)", borderRadius: 8 },
      { label: "Investing CF", data: ICF, backgroundColor: "rgba(239,68,68,0.6)", borderRadius: 8 },
    ],
  };

  const ocfVsNcf = {
    labels: filteredLabels,
    datasets: [
      { label: "Operating CF", data: OCF, backgroundColor: "rgba(34,197,94,0.6)", borderRadius: 8 },
      { label: "Net CF", data: NCF, backgroundColor: "rgba(245,158,11,0.6)", borderRadius: 8 },
    ],
  };

  // --- Results (dynamic summaries) ---
  const results = {
    ocf: `Operating Cash Flow ${formatChange(getChange(OCF))} ${periodText}.`,
    icf: `Investing Cash Flow ${formatChange(getChange(ICF))} ${periodText}.`,
    fcf: `Financing Cash Flow ${formatChange(getChange(FCF))} ${periodText}.`,
    ncf: `Net Cash Flow ${formatChange(getChange(NCF))} ${periodText}.`,
    overall: `Overall company cash movement ${formatChange(getChange(NCF))} ${periodText}.`,
  };

  // --- Static User Takeaways ---
  const userTakeaways = {
    overall: "Shows the combined view of all cash activities — helps assess total liquidity trends.",
    ocf: "Indicates how well the company generates cash from its core business operations.",
    icf: "Reflects investment activities like buying/selling assets or new project expenditures.",
    fcf: "Highlights how the company manages debt, equity, and dividends through financing.",
    ncf: "Summarizes overall inflow and outflow of cash, indicating liquidity stability.",
    ocfVsIcf: "Compares operational cash generation against investments to measure reinvestment efficiency.",
    ocfVsNcf: "Shows if strong operations are effectively translating into positive total cash flows.",
  };

  // --- UI ---
  return (
    <div className="py-6">
      {/* Tabs */}
      <div className={`flex border-b border-[${COLORS.border}]`}>
        <button
          onClick={() => setActiveTab("trends")}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "trends"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Cash Flow Trends
        </button>
        <button
          onClick={() => setActiveTab("insights")}
          className={`ml-4 px-4 py-2 text-sm font-medium ${
            activeTab === "insights"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Analytical Insights
        </button>

        {/* Year Filter */}
        <div className="ml-auto">
          <select
            value={yearRange}
            onChange={(e) => setYearRange(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm text-gray-700"
          >
            <option value="all">All Years</option>
            <option value="3">Last 3 Years</option>
            <option value="5">Last 5 Years</option>
            <option value="10">Last 10 Years</option>
          </select>
        </div>
      </div>

      {/* === Tab 1 === */}
      {activeTab === "trends" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
          <ChartCard title="Overall Cash Flow Overview" result={results.overall} takeaway={userTakeaways.overall} chart={<Bar data={combinedData} options={options} />} />
          <ChartCard title="Operating Cash Flow Trend" result={results.ocf} takeaway={userTakeaways.ocf} chart={<Line data={ocfTrend} options={options} />} />
          <ChartCard title="Investing Cash Flow Trend" result={results.icf} takeaway={userTakeaways.icf} chart={<Line data={icfTrend} options={options} />} />
          <ChartCard title="Financing Cash Flow Trend" result={results.fcf} takeaway={userTakeaways.fcf} chart={<Line data={fcfTrend} options={options} />} />
          <ChartCard title="Net Cash Flow Trend" result={results.ncf} takeaway={userTakeaways.ncf} chart={<Line data={ncfTrend} options={options} />} />
          <ChartCard title="Operating vs Investing CF" result={results.ocf} takeaway={userTakeaways.ocfVsIcf} chart={<Bar data={ocfVsIcf} options={options} />} />
        </div>
      )}

      {/* === Tab 2 === */}
      {activeTab === "insights" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
          <ChartCard title="Operating vs Net Cash Flow" result={results.ocf} takeaway={userTakeaways.ocfVsNcf} chart={<Bar data={ocfVsNcf} options={options} />} />
          <ChartCard title="Net Cash Flow Cumulative" result={results.ncf} takeaway={userTakeaways.ncf} chart={<Line data={ncfTrend} options={options} />} />
          <ChartCard title="Operating CF % Change" result={results.ocf} takeaway={userTakeaways.ocf} chart={<Line data={ocfTrend} options={options} />} />
          <ChartCard title="Investing CF % Change" result={results.icf} takeaway={userTakeaways.icf} chart={<Line data={icfTrend} options={options} />} />
          <ChartCard title="Financing CF % Change" result={results.fcf} takeaway={userTakeaways.fcf} chart={<Line data={fcfTrend} options={options} />} />
          <ChartCard title="Overall Movement Summary" result={results.overall} takeaway={userTakeaways.overall} chart={<Bar data={combinedData} options={options} />} />
        </div>
      )}
    </div>
  );
};

// --- Chart Card ---
const ChartCard = ({ title, chart, result, takeaway }) => (
  <div className={`bg-white rounded-[10px] border border-[${COLORS.border}] p-4`}>
    <h3 className="text-lg font-medium mb-1 text-gray-700">{title}</h3>

    {/* Result Section */}
    <div className="bg-green-50 border border-green-200 rounded-md p-2 mb-2">
      <p className="text-sm text-green-700 font-medium">
        <span className="font-semibold text-gray-800">📊 Result:</span> {result}
      </p>
    </div>

    {/* User Takeaway Section */}
    <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-3">
      <p className="text-sm text-blue-700">
        <span className="font-semibold text-gray-800">💡 User Takeaway:</span> {takeaway}
      </p>
    </div>

  <div>  {chart}</div>
  </div>
);

export default CashFlowDashboard;
