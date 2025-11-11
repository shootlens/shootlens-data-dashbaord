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

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

const ROCEDashboard = ({ ratios }) => {
    const roceData = useMemo(() => {
        if (!ratios || ratios.length === 0) return { labels: [], data: [] };

        // First row = header (years)
        const headerRow = ratios[0];
        const yearLabels = headerRow.slice(1); // skip 'Category'

        // Find the ROCE row safely (case-insensitive)
        const roceRow = ratios.find((row) =>
            row[0].toLowerCase().includes("roce")
        );

        if (!roceRow) return { labels: yearLabels, data: [] };

        const values = roceRow.slice(1).map((val) => {
            if (!val || val === "") return null;
            return parseFloat(val.replace("%", "").trim());
        });

        return { labels: yearLabels, data: values };
    }, [ratios]);

    // Calculate trend summary
    const { resultText, resultColor } = useMemo(() => {
        const validValues = roceData.data.filter((v) => v !== null && !isNaN(v));
        if (validValues.length < 2)
            return {
                resultText: "Not enough data to determine ROCE trend.",
                resultColor: "text-gray-400",
            };

        const first = validValues[0];
        const last = validValues[validValues.length - 1];
        const diff = ((last - first) / Math.abs(first)) * 100;

        let text = "";
        let color = "";

        if (diff > 0) {
            text = `ROCE improved by ${diff.toFixed(
                1
            )}% over the available period, indicating stronger capital efficiency.`;
            color = "text-green-600";
        } else if (diff < 0) {
            text = `ROCE declined by ${Math.abs(
                diff
            ).toFixed(1)}% over the available period, indicating reduced capital efficiency.`;
            color = "text-red-600";
        } else {
            text = "ROCE remained stable over the available period.";
            color = "text-gray-500";
        }

        return { resultText: text, resultColor: color };
    }, [roceData]);

    const chartData = {
        labels: roceData.labels,
        datasets: [
            {
                label: "ROCE (%)",
                data: roceData.data,
                borderColor: "rgba(75, 192, 192, 1)",
                backgroundColor: "rgba(75, 192, 192, 0.2)",
                pointBackgroundColor: "rgba(75, 192, 192, 1)",
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
                beginAtZero: false,
                title: { display: true, text: "ROCE (%)" },
            },
        },
    };

    const takeawayText = `ROCE (Return on Capital Employed) measures how efficiently a company generates profits from its total capital.
A consistently high or improving ROCE indicates effective use of capital and strong operational performance.`;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
            <div className="bg-white rounded-[10px] border border-[#D1D5DB] p-6">
                <h2 className="text-xl font-semibold mb-4">ROCE Trend</h2>
                <Line data={chartData} options={options} />
                <div className="mt-6">
                    <h3 className="font-semibold text-gray-700">User Takeaway</h3>
                    <p className="text-gray-600 whitespace-pre-line mt-2">{takeawayText}</p>
                </div>

                <div className="mt-4">
                    <h3 className="font-semibold text-gray-700">Result Summary</h3>
                    <p className={`${resultColor} mt-2`}>{resultText}</p>
                </div>
            </div>
        </div>
    );
};

export default ROCEDashboard;
