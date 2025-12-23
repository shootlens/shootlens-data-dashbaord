// src/components/ROCEDashboard.jsx
import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

const ROCEDashboard = ({ ratios }) => {
  /* ---------------- Parse ROCE Data (ROBUST) ---------------- */
  const roceData = useMemo(() => {
    if (!Array.isArray(ratios) || ratios.length === 0)
      return { labels: [], data: [] };

    const roceRow = ratios.find(
      (row) =>
        typeof row?.[0] === "string" &&
        (row[0].toLowerCase().includes("return on capital") ||
          row[0].toLowerCase().includes("roce"))
    );

    if (!roceRow || roceRow.length <= 1)
      return { labels: [], data: [] };

    const rawValues = roceRow.slice(1);

    const data = rawValues.map((v) => {
      if (!v || v === "-") return null;
      return parseFloat(String(v).replace(/[% ,]/g, ""));
    });

    // Generate fallback labels safely
    const labels = rawValues.map((_, i) => `Year ${i + 1}`);

    return { labels, data };
  }, [ratios]);

  /* ---------------- Analytics ---------------- */
  const analytics = useMemo(() => {
    const valid = roceData.data.filter(
      (v) => v !== null && !isNaN(v)
    );

    if (valid.length < 2) {
      return {
        outcome: "Insufficient ROCE data to draw conclusions.",
        outcomeColor: "text-gray-400",
        volatility: "N/A",
        volatilityColor: "text-gray-400",
        confidence: 0,
      };
    }

    const first = valid[0];
    const last = valid[valid.length - 1];

    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    const variance =
      valid.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      valid.length;
    const stdDev = Math.sqrt(variance);

    let trend = "flat";
    if (first !== 0) {
      const diff = ((last - first) / Math.abs(first)) * 100;
      if (diff > 5) trend = "up";
      else if (diff < -5) trend = "down";
    }

    const stable = stdDev < 5;

    let outcome = "";
    let outcomeColor = "";

    if (trend === "up" && stable) {
      outcome =
        "ROCE shows steady improvement with consistent capital efficiency.";
      outcomeColor = "text-green-600";
    } else if (trend === "up" && !stable) {
      outcome =
        "ROCE has improved overall but remains volatile, indicating inconsistent capital efficiency.";
      outcomeColor = "text-yellow-600";
    } else if (trend === "down") {
      outcome =
        "ROCE has declined over time, suggesting weakening returns on capital.";
      outcomeColor = "text-red-600";
    } else {
      outcome =
        "ROCE has remained broadly stable without a clear directional trend.";
      outcomeColor = "text-gray-600";
    }

    let confidence = 50;
    confidence += Math.min(valid.length * 5, 20);
    confidence += stable ? 15 : 0;
    confidence += trend === "up" ? 10 : trend === "down" ? -10 : 0;
    confidence = Math.max(0, Math.min(100, confidence));

    return {
      outcome,
      outcomeColor,
      volatility: stable ? "Stable" : "Volatile",
      volatilityColor: stable ? "text-green-600" : "text-yellow-600",
      confidence,
    };
  }, [roceData]);

  /* ---------------- Chart ---------------- */
  const chartData = {
    labels: roceData.labels,
    datasets: [
      {
        label: "ROCE (%)",
        data: roceData.data,
        borderColor: "rgba(75,192,192,1)",
        backgroundColor: "rgba(75,192,192,0.2)",
        tension: 0.3,
        pointRadius: 4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      y: {
        title: { display: true, text: "ROCE (%)" },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[10px] border border-[#D1D5DB] p-4">
      <h2 className="text-lg font-medium mb-[10px]">ROCE Analysis</h2>

      {roceData.data.length === 0 ? (
        <p className="text-gray-400">ROCE data not available.</p>
      ) : (
        <Line data={chartData} options={options} />
      )}

      <div className="mt-6 space-y-3">
        <p>
          <strong>Volatility:</strong>{" "}
          <span className={analytics.volatilityColor}>
            {analytics.volatility}
          </span>
        </p>

        <p>
          <strong>Confidence Score:</strong>{" "}
          {analytics.confidence}%
        </p>

        <p className={analytics.outcomeColor}>
          {analytics.outcome}
        </p>
      </div>
    </div>
    </div>
    
  );
};

export default ROCEDashboard;
