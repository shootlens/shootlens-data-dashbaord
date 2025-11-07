// src/components/ShareholdingCharts.jsx
import React from "react";
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

const parsePercentage = (val) => parseFloat(val?.replace("%", "") || 0);
const parseNumber = (val) => parseInt(val?.replace(/,/g, "") || 0);

const ShareholdingCharts = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length < 2) {
    return <div>No shareholding data available</div>;
  }

  const headers = data[0].slice(1);
  const labels = headers;
  const categories = data.slice(1).filter((row) => Array.isArray(row));

  if (!labels.length || !categories.length) {
    return <div>No shareholding data available</div>;
  }

  const getRow = (name) => categories.find((row) => row[0] === name) || null;

  // Automatically filter only rows that have numeric data
  const availableRows = categories.filter((row) => {
    const numericValues = row.slice(1).map(parsePercentage);
    return numericValues.some((v) => !isNaN(v) && v > 0);
  });

  // Map available rows for different charts
  const compositionData =
    availableRows.length > 0
      ? {
          labels: availableRows.map((row) => row[0]),
          datasets: [
            {
              data: availableRows.map((row) => parsePercentage(row[row.length - 1])),
              backgroundColor: ["#4f46e5", "#10b981", "#f59e0b", "#3b82f6", "#ef4444"],
              hoverOffset: 10,
            },
          ],
        }
      : null;

  const trendData =
    availableRows.length > 0
      ? {
          labels,
          datasets: availableRows.map((row, idx) => ({
            label: row[0],
            data: row.slice(1).map(parsePercentage),
            borderColor: ["#4f46e5", "#10b981", "#f59e0b", "#3b82f6", "#ef4444"][idx % 5],
            backgroundColor: "transparent",
            tension: 0.3,
          })),
        }
      : null;

  // Institutional vs Non-Institutional
  const fii = getRow("FIIs");
const dii = getRow("DIIs");
const promoters = getRow("Promoters");
const publicRow = getRow("Public");
const govt = getRow("Government");

// Check which rows exist
const hasFII = !!fii;
const hasDII = !!dii;
const hasInstitutional = hasFII || hasDII;

const hasPromoters = !!promoters;
const hasPublic = !!publicRow;
const hasGovt = !!govt;
const hasNonInstitutional = hasPromoters || hasPublic || hasGovt;

// Build dataset dynamically
const institutionalData =
  hasInstitutional && hasNonInstitutional
    ? {
        labels,
        datasets: [
          hasInstitutional && {
            label:
              "Institutional" +
              (hasFII && hasDII ? " (FII + DII)" : hasFII ? " (FII)" : " (DII)"),
            data: labels.map(
              (_, i) =>
                (hasFII ? parsePercentage(fii[i + 1]) : 0) +
                (hasDII ? parsePercentage(dii[i + 1]) : 0)
            ),
            backgroundColor: "#10b981",
          },
          hasNonInstitutional && {
            label: "Non-Institutional",
            data: labels.map(
              (_, i) =>
                (hasPromoters ? parsePercentage(promoters[i + 1]) : 0) +
                (hasPublic ? parsePercentage(publicRow[i + 1]) : 0) +
                (hasGovt ? parsePercentage(govt[i + 1]) : 0)
            ),
            backgroundColor: "#3b82f6",
          },
        ].filter(Boolean), // remove null datasets
      }
    : null;

  // Promoter Trend
  const promoterTrendData = promoters
    ? {
        labels,
        datasets: [
          {
            label: "Promoters",
            data: promoters.slice(1).map(parsePercentage),
            borderColor: "#4f46e5",
            backgroundColor: "transparent",
            tension: 0.3,
          },
        ],
      }
    : null;

  // Number of Shareholders
  const shareholders = getRow("No. of Shareholders");
  const shareholdersData = shareholders
    ? {
        labels,
        datasets: [
          {
            label: "Number of Shareholders",
            data: shareholders.slice(1).map(parseNumber),
            borderColor: "#f59e0b",
            backgroundColor: "rgba(245,158,11,0.2)",
            fill: true,
            tension: 0.3,
          },
        ],
      }
    : null;

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "rgba(200,200,200,0.2)" } },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {compositionData && (
        <div className="bg-white p-6 rounded shadow h-[400px]">
          <h2 className="text-lg font-semibold mb-4">Shareholding Composition</h2>
          <div className="h-80">
            <Doughnut data={compositionData} options={baseOptions} />
          </div>
        </div>
      )}

      {trendData && (
        <div className="bg-white p-6 rounded shadow h-[400px]">
          <h2 className="text-lg font-semibold mb-4">Shareholding Trend</h2>
          <div className="h-80">
            <Line data={trendData} options={baseOptions} />
          </div>
        </div>
      )}

      {institutionalData && (
        <div className="bg-white p-6 rounded shadow h-[400px]">
          <h2 className="text-lg font-semibold mb-4">Institutional vs Non-Institutional Ownership (%)</h2>
          <div className="h-80">
            <Bar data={institutionalData} options={baseOptions} />
          </div>
        </div>
      )}

      {promoterTrendData && (
        <div className="bg-white p-6 rounded shadow h-[400px]">
          <h2 className="text-lg font-semibold mb-4">Promoter Shareholding Trend</h2>
          <div className="h-80">
            <Line data={promoterTrendData} options={baseOptions} />
          </div>
        </div>
      )}

      {shareholdersData && (
        <div className="bg-white p-6 rounded shadow h-[400px]">
          <h2 className="text-lg font-semibold mb-4">Number of Shareholders</h2>
          <div className="h-80">
            <Line data={shareholdersData} options={baseOptions} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareholdingCharts;
