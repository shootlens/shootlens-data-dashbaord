import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Legend,
  Tooltip,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Legend,
  Tooltip
);

const QuarterlyResultsDashboard = ({ quarterlyData, quarterlyHoldingData }) => {
  const [activeTab, setActiveTab] = useState("results"); // 'results' | 'holding'

  if (!quarterlyData || !Array.isArray(quarterlyData)) {
    return <p className="text-center text-gray-500">No data available</p>;
  }

  // Convert the 2D array into a dictionary
  const dataMap = {};
  quarterlyData.forEach((row) => {
    const category = row[0];
    const values = row.slice(1);
    dataMap[category] = values;
  });

  // Extract labels (quarters)
  const quarterlyLabels = quarterlyData[0].slice(1);
  const parseNum = (v) => parseFloat(v.replace(/,/g, "").replace("%", "")) || 0;

  // Extract numeric series
  const sales = (dataMap["Sales"] || []).map(parseNum);
  const expenses = (dataMap["Expenses"] || []).map(parseNum);
  const operatingProfit = (dataMap["Operating Profit"] || []).map(parseNum);
  const opm = (dataMap["OPM %"] || []).map(parseNum);
  const otherIncome = (dataMap["Other Income"] || []).map(parseNum);
  const netProfit = (dataMap["Net Profit"] || []).map(parseNum);
  const eps = (dataMap["EPS in Rs"] || []).map(parseNum);

  // Common chart options
  const options = {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom" },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { title: { display: true, text: "₹ Crores" } },
    },
  };

  // === PERFORMANCE OVERVIEW (Tab 1) ===

  // 1️⃣ Combined Chart
const mainData = {
    labels: quarterlyLabels,
    datasets: [
      {
        type: "bar",
        label: "Sales (₹ Cr)",
        data: sales,
        backgroundColor: "rgba(59,130,246,0.6)",
        borderRadius: 8,
      },
      {
        type: "bar",
        label: "Expenses (₹ Cr)",
        data: expenses,
        backgroundColor: "rgba(239,68,68,0.6)",
        borderRadius: 8,
      },
      {
        type: "bar",
        label: "Operating Profit (₹ Cr)",
        data: operatingProfit,
        backgroundColor: "rgba(34,197,94,0.6)",
        borderRadius: 8,
      },
      {
        type: "line",
        label: "OPM %",
        data: opm,
        borderColor: "#f59e0b",
        borderWidth: 2,
        tension: 0.3,
        yAxisID: "percentage",
      },
      {
        type: "bar",
        label: "Net Profit (₹ Cr)",
        data: netProfit,
        backgroundColor: "rgba(94,246,82,0.8)",
        borderRadius: 8,
      },
    ],
  };

  // 2️⃣ OPM % Trend
  const opmData = {
    labels: quarterlyLabels,
    datasets: [
      {
        label: "Operating Profit Margin (%)",
        data: opm,
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // 3️⃣ Net Profit vs Other Income
  const profitData = {
    labels: quarterlyLabels,
    datasets: [
      { label: "Net Profit (₹ Cr)", data: netProfit, backgroundColor: "rgba(34,197,94,0.6)", borderRadius: 8 },
      { label: "Other Income (₹ Cr)", data: otherIncome, backgroundColor: "rgba(168,85,247,0.6)", borderRadius: 8 },
    ],
  };

  // 4️⃣ EPS Trend
  const epsData = {
    labels: quarterlyLabels,
    datasets: [
      {
        label: "Earnings Per Share (EPS)",
        data: eps,
        borderColor: "#6366F1",
        backgroundColor: "rgba(99,102,241,0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // === SHAREHOLDING INSIGHTS (Tab 2) ===

  // 1️⃣ Revenue vs Expenses
  const revenueVsExpenses = {
    labels: quarterlyLabels,
    datasets: [
      { label: "Revenue (₹ Cr)", data: sales, backgroundColor: "rgba(37,99,235,0.6)", borderRadius: 8 },
      { label: "Expenses (₹ Cr)", data: expenses, backgroundColor: "rgba(239,68,68,0.6)", borderRadius: 8 },
    ],
  };

  // 2️⃣ Operating Profit vs Net Profit
  const opVsNetProfit = {
    labels: quarterlyLabels,
    datasets: [
      { label: "Operating Profit (₹ Cr)", data: operatingProfit, backgroundColor: "rgba(16,185,129,0.6)", borderRadius: 8 },
      { label: "Net Profit (₹ Cr)", data: netProfit, backgroundColor: "rgba(234,179,8,0.6)", borderRadius: 8 },
    ],
  };

  // 3️⃣ EPS Growth
  const epsGrowth = {
    labels: quarterlyLabels,
    datasets: [
      {
        label: "EPS Growth (%)",
        data: eps.map((v, i) => (i === 0 ? 0 : ((v - eps[i - 1]) / eps[i - 1]) * 100)),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.2)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="p-6 bg-gray-50 rounded-2xl shadow space-y-6">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("results")}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "results"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Performance Overview
        </button>
        <button
          onClick={() => setActiveTab("holding")}
          className={`ml-4 px-4 py-2 text-sm font-medium ${
            activeTab === "holding"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Shareholding Insights
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "results" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ChartCard title="Sales, Expenses, Operating Profit, OPM %" chart={<Bar data={mainData} options={options} />} />
          <ChartCard title="Operating Profit Margin (%)" chart={<Line data={opmData} options={options} />} />
          <ChartCard title="Net Profit vs Other Income" chart={<Bar data={profitData} options={options} />} />
          <ChartCard title="Earnings Per Share (EPS)" chart={<Line data={epsData} options={options} />} />
        </div>
      )}

      {activeTab === "holding" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ChartCard title="Revenue vs Expenses (Core Profitability View)" chart={<Bar data={revenueVsExpenses} options={options} />} />
          <ChartCard title="Operating Profit vs Net Profit" chart={<Bar data={opVsNetProfit} options={options} />} />
          <ChartCard title="EPS Growth (Earnings Power Trend)" chart={<Line data={epsGrowth} options={options} />} />
        </div>
      )}
    </div>
  );
};

// ✅ Reusable Chart Card
const ChartCard = ({ title, chart }) => (
  <div className="bg-white shadow-md rounded-2xl p-4">
    <h3 className="text-lg font-medium mb-2 text-gray-700">{title}</h3>
    {chart}
  </div>
);

export default QuarterlyResultsDashboard;
