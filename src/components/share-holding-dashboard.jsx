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
import Animate from "./common/animate";

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

    const availableRows = categories.filter((row) => {
        const numericValues = row.slice(1).map(parsePercentage);
        return numericValues.some((v) => !isNaN(v) && v > 0);
    });

    // --- Shareholding Composition ---
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

    // --- Trend Over Time ---
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

    // --- Institutional vs Non-Institutional ---
    const fii = getRow("FIIs");
    const dii = getRow("DIIs");
    const promoters = getRow("Promoters");
    const publicRow = getRow("Public");
    const govt = getRow("Government");

    const hasFII = !!fii;
    const hasDII = !!dii;
    const hasInstitutional = hasFII || hasDII;

    const hasPromoters = !!promoters;
    const hasPublic = !!publicRow;
    const hasGovt = !!govt;
    const hasNonInstitutional = hasPromoters || hasPublic || hasGovt;

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
                ].filter(Boolean),
            }
            : null;

    // --- Promoter Trend ---
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

    // --- Number of Shareholders ---
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

    // --- Retail Sentiment (Corrected Gauge) ---
    let retailSentimentChart = null;
    if (shareholders && shareholders.length > 2) {
        const latest = parseNumber(shareholders[shareholders.length - 1]);
        const prev = parseNumber(shareholders[shareholders.length - 2]);

        // Calculate realistic growth percent
        const growthPercent = ((latest - prev) / Math.max(prev, 1)) * 100;

        // Clamp growth for visual gauge (-5% to +5%)
        const clampedGrowth = Math.max(-5, Math.min(5, growthPercent));
        const angle = ((clampedGrowth + 5) / 10) * 180; // map to 0°-180°

        // Sentiment thresholds
        let sentiment = "Stable";
        let color = "#facc15";
        if (growthPercent > 0.5) {
            sentiment = "Retail Interest Rising";
            color = "#16a34a";
        } else if (growthPercent < -0.5) {
            sentiment = "Retail Interest Falling";
            color = "#dc2626";
        }

        retailSentimentChart = {
            datasets: [
                {
                    data: [angle, 180 - angle],
                    backgroundColor: [color, "#e5e7eb"],
                    borderWidth: 0,
                    circumference: 180,
                    rotation: 270,
                    cutout: "70%",
                },
            ],
        };

        retailSentimentChart.options = {
            responsive: true,
            plugins: { tooltip: { enabled: false }, legend: { display: false } },
        };

        retailSentimentChart.meta = { growthPercent, sentiment, color };
    }

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
                <Animate className="bg-white p-6 rounded-[10px] h-[400px] border" style={{ borderColor: "#D1D5DB" }}>
                    <h2 className="text-lg font-semibold mb-4">Shareholding Composition</h2>
                    <div className="h-80">
                        <Doughnut data={compositionData} options={baseOptions} />
                    </div>
                </Animate>
            )}

            {trendData && (
                <Animate className="bg-white p-6 rounded-[10px] h-[400px] border" style={{ borderColor: "#D1D5DB" }}>
                    <h2 className="text-lg font-semibold mb-4">Shareholding Trend</h2>
                    <div className="h-80">
                        <Line data={trendData} options={baseOptions} />
                    </div>
                </Animate>
            )}

            {institutionalData && (
                <Animate className="bg-white p-6 rounded-[10px] h-[400px] border" style={{ borderColor: "#D1D5DB" }}>
                    <h2 className="text-lg font-semibold mb-4">
                        Institutional vs Non-Institutional Ownership (%)
                    </h2>
                    <div className="h-80">
                        <Bar data={institutionalData} options={baseOptions} />
                    </div>
                </Animate>
            )}

            {promoterTrendData && (
                <Animate className="bg-white p-6 rounded-[10px] h-[400px] border" style={{ borderColor: "#D1D5DB" }}>
                    <h2 className="text-lg font-semibold mb-4">Promoter Shareholding Trend</h2>
                    <div className="h-80">
                        <Line data={promoterTrendData} options={baseOptions} />
                    </div>
                </Animate>
            )}

            {shareholdersData && (
                <Animate className="bg-white p-6 rounded-[10px] h-[400px] border" style={{borderColor:"#D1D5DB"}}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold">Number of Shareholders</h2>
                        {retailSentimentChart && (
                            <div className="flex items-center gap-5">
                                <div
                                    className="text-sm font-medium"
                                    style={{ color: retailSentimentChart.meta.color }}
                                >
                                    {retailSentimentChart.meta.sentiment}
                                </div>
                                <div
                                    className="text-2xl font-bold"
                                    style={{ color: retailSentimentChart.meta.color }}
                                >
                                    {retailSentimentChart.meta.growthPercent.toFixed(2)}%
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-80">
                        <Line data={shareholdersData} options={baseOptions} />
                    </div>
                </Animate>
            )}
        </div>
    );
};

export default ShareholdingCharts;
