import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Doughnut, Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

// Helper: parse numbers safely
const parseNumber = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/,/g, "").replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const BalanceSheetDashboard = ({ balance_sheet }) => {
  if (!balance_sheet || !Array.isArray(balance_sheet) || balance_sheet.length < 2) {
    return <div className="p-6">No balance sheet data available</div>;
  }

  // Extract headers & data rows
  const headers = balance_sheet[0].slice(1);
  const rows = balance_sheet.slice(1);
  const years = headers;

  // Map category → numeric values
  const rowMap = {};
  rows.forEach((r) => {
    rowMap[r[0]] = r.slice(1).map(parseNumber);
  });

  const getRow = (name) => rowMap[name] || new Array(years.length).fill(0);

  // --- Identify latest & previous years dynamically ---
  const latestIdx = headers.length - 1;
  const prevIdx = Math.max(0, latestIdx - 1);
  const prevYear = headers[prevIdx];
  const currentYear = headers[latestIdx];

  console.log(prevYear, "------------")
    console.log(prevIdx, "------------ idx")

  // --- Key Financial Data ---
  const totalAssets = getRow("Total Assets")[latestIdx];
  const totalLiabilities = getRow("Total Liabilities")[latestIdx];
  const equityCapital = getRow("Equity Capital")[latestIdx];
  const reserves = getRow("Reserves")[latestIdx];
  const borrowings = getRow("Borrowings")[latestIdx];
  const otherLiabilities = getRow("Other Liabilities")[latestIdx];

  const assetsRows = ["Fixed Assets", "CWIP", "Investments", "Other Assets"];
  const liabilitiesRows = ["Equity Capital", "Reserves", "Borrowings", "Other Liabilities"];

  // --- Ratios ---
  const debtToEquity = (borrowings + otherLiabilities) / Math.max(1, equityCapital + reserves);
  const equityRatio = (equityCapital + reserves) / Math.max(1, totalAssets);

  // --- YOY Growth (dynamic years) ---
  const totalAssetsPrev = getRow("Total Assets")[prevIdx];
  const totalAssetsGrowth =
    totalAssetsPrev > 0 ? ((totalAssets - totalAssetsPrev) / totalAssetsPrev) * 100 : 0;

  // --- Trends & Charts ---
  const assetsTrendData = useMemo(
    () => ({
      labels: years,
      datasets: assetsRows.map((name, idx) => ({
        label: name,
        data: getRow(name),
        borderColor: ["#10b981", "#f59e0b", "#3b82f6", "#6b7280"][idx % 4],
        backgroundColor: "transparent",
        tension: 0.3,
      })),
    }),
    [balance_sheet]
  );

  const liabilitiesTrendData = useMemo(
    () => ({
      labels: years,
      datasets: liabilitiesRows.map((name, idx) => ({
        label: name,
        data: getRow(name),
        borderColor: ["#2563eb", "#4f46e5", "#ef4444", "#f97316"][idx % 4],
        backgroundColor: "transparent",
        tension: 0.3,
      })),
    }),
    [balance_sheet]
  );

  const assetsCompositionData = useMemo(
    () => ({
      labels: years,
      datasets: assetsRows.map((name, idx) => ({
        label: name,
        data: getRow(name),
        backgroundColor: ["#059669", "#f59e0b", "#3b82f6", "#9ca3af"][idx % 4],
      })),
    }),
    [balance_sheet]
  );

  const liabilitiesCompositionData = useMemo(
    () => ({
      labels: years,
      datasets: liabilitiesRows.map((name, idx) => ({
        label: name,
        data: getRow(name),
        backgroundColor: ["#2563eb", "#4f46e5", "#ef4444", "#f97316"][idx % 4],
      })),
    }),
    [balance_sheet]
  );

  const assetsLatestDataset = useMemo(() => {
    const values = assetsRows.map((r) => getRow(r)[latestIdx]);
    return {
      labels: assetsRows,
      datasets: [
        {
          data: values,
          backgroundColor: ["#059669", "#f59e0b", "#3b82f6", "#9ca3af"],
          hoverOffset: 8,
        },
      ],
    };
  }, [balance_sheet]);

  const liabilitiesLatestDataset = useMemo(() => {
    const values = liabilitiesRows.map((r) => getRow(r)[latestIdx]);
    return {
      labels: liabilitiesRows,
      datasets: [
        {
          data: values,
          backgroundColor: ["#2563eb", "#4f46e5", "#ef4444", "#f97316"],
          hoverOffset: 8,
        },
      ],
    };
  }, [balance_sheet]);

  const totalAssetsOverTime = years.map((_, i) => getRow("Total Assets")[i]);
  const yoyChange = totalAssetsOverTime.map((val, i) =>
    i === 0 ? 0 : Math.round(((val - totalAssetsOverTime[i - 1]) / Math.max(1, totalAssetsOverTime[i - 1])) * 100)
  );

  const yoyData = {
    labels: years,
    datasets: [
      {
        label: "YoY % change - Total Assets",
        data: yoyChange,
        backgroundColor: yoyChange.map((v) =>
          v >= 0 ? "rgba(16,185,129,0.8)" : "rgba(239,68,68,0.8)"
        ),
      },
    ],
  };

  // --- Chart Options ---
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "rgba(200,200,200,0.15)" }, beginAtZero: true },
    },
  };

  const stackedOptions = {
    ...baseOptions,
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, grid: { color: "rgba(200,200,200,0.15)" }, beginAtZero: true },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
  };

  // === UI ===
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Assets", value: totalAssets, note: "Represents everything company owns" },
          { label: "Total Liabilities", value: totalLiabilities, note: "All obligations company must pay" },
          { label: "Equity (Capital + Reserves)", value: equityCapital + reserves, note: "Funds contributed + retained earnings" },
          { label: "Reserves", value: reserves, note: "Profits kept for future growth" },
          { label: "Borrowings", value: borrowings, note: "Total debt obligations" },
        ].map((card, i) => (
          <div key={i} className="bg-white p-4 rounded shadow flex flex-col justify-between">
            <div>
              <div className="text-sm text-gray-500">{card.label}</div>
              <div className="text-2xl font-semibold">{card.value.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mt-1">As of {currentYear}</div>
            </div>
            <div className="text-xs text-gray-500 mt-2 italic">{card.note}</div>
          </div>
        ))}
      </div>

      {/* Ratios */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow flex flex-col">
          <div className="text-sm text-gray-500">Debt to Equity</div>
          <div className="text-2xl font-semibold">{debtToEquity.toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-1">Lower means company is less leveraged</div>
        </div>

        <div className="bg-white p-4 rounded shadow flex flex-col">
          <div className="text-sm text-gray-500">Equity Ratio</div>
          <div className="text-2xl font-semibold">{(equityRatio * 100).toFixed(1)}%</div>
          <div className="text-xs text-gray-400 mt-1">Share of assets funded by equity</div>
        </div>

        <div className="bg-white p-4 rounded shadow flex flex-col">
          <div className="text-sm text-gray-500">
            Total Assets Growth ({prevYear} → {currentYear})
          </div>
          <div className="text-2xl font-semibold">{totalAssetsGrowth.toFixed(1)}%</div>
          <div className="text-xs text-gray-400 mt-1">Year-on-year change</div>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded shadow h-[420px]">
          <h3 className="text-lg font-semibold mb-4">Assets Trend</h3>
          <div className="h-[330px]">
            <Line data={assetsTrendData} options={baseOptions} />
          </div>
        </div>
        <div className="bg-white p-6 rounded shadow h-[420px]">
          <h3 className="text-lg font-semibold mb-4">Liabilities & Equity Trend</h3>
          <div className="h-[330px]">
            <Line data={liabilitiesTrendData} options={baseOptions} />
          </div>
        </div>
      </div>

      {/* Stacked Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded shadow h-[460px]">
          <h3 className="text-lg font-semibold mb-4">Assets Composition Over Years</h3>
          <div className="h-[360px]">
            <Bar data={assetsCompositionData} options={stackedOptions} />
          </div>
        </div>
        <div className="bg-white p-6 rounded shadow h-[460px]">
          <h3 className="text-lg font-semibold mb-4">Liabilities & Equity Composition Over Years</h3>
          <div className="h-[360px]">
            <Bar data={liabilitiesCompositionData} options={stackedOptions} />
          </div>
        </div>
      </div>

      {/* Doughnuts + YoY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded shadow h-[360px]">
          <h3 className="text-lg font-semibold mb-4">Latest Year - Assets Breakdown</h3>
          <div className="h-[240px]">
            <Doughnut data={assetsLatestDataset} options={doughnutOptions} />
          </div>
          <div className="text-xs text-gray-500 mt-3">Year: {currentYear}</div>
        </div>
        <div className="bg-white p-6 rounded shadow h-[360px]">
          <h3 className="text-lg font-semibold mb-4">Latest Year - Liabilities & Equity Breakdown</h3>
          <div className="h-[240px]">
            <Doughnut data={liabilitiesLatestDataset} options={doughnutOptions} />
          </div>
          <div className="text-xs text-gray-500 mt-3">Year: {currentYear}</div>
        </div>
        <div className="bg-white p-6 rounded shadow h-[360px]">
          <h3 className="text-lg font-semibold mb-4">YoY % Change - Total Assets</h3>
          <div className="h-[240px]">
            <Bar
              data={yoyData}
              options={{
                ...baseOptions,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: false },
                },
              }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-3">Shows % growth / decline each year</div>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetDashboard;
