import React, { useMemo } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
    scales: {
        x: { grid: { display: false } },
        y: { grid: { color: "rgba(200,200,200,0.2)" } },
    },
};

const parseValue = (v) => {
    if (typeof v === "string") {
        const cleaned = v.replace(/,/g, "").replace("%", "");
        return parseFloat(cleaned) || 0;
    }
    return v || 0;
};

const ProfitLossDashboard = ({ profitLossData = [] }) => {
    const parsed = useMemo(() => {
        if (!Array.isArray(profitLossData) || profitLossData.length < 2) return null;

        const headers = profitLossData[0].slice(1); // Years
        const dataObj = {};

        profitLossData.slice(1).forEach((row) => {
            const key = row[0];
            const values = row.slice(1).map(parseValue);
            dataObj[key] = values;
        });

        return { headers, dataObj };
    }, [profitLossData]);

    if (!parsed) return null;
    const { headers, dataObj } = parsed;

    // ---- CHART DATA ----
    const salesVsExpenses = {
        labels: headers,
        datasets: [
            {
                label: "Sales",
                data: dataObj["Sales"],
                backgroundColor: "rgba(37,99,235,0.6)",
            },
            {
                label: "Expenses",
                data: dataObj["Expenses"],
                backgroundColor: "rgba(239,68,68,0.6)",
            },
        ],
    };

    const operatingBreakdown = {
        labels: headers,
        datasets: [
            {
                label: "Operating Profit",
                data: dataObj["Operating Profit"],
                backgroundColor: "rgba(34,197,94,0.7)",
            },
            {
                label: "Other Income",
                data: dataObj["Other Income"],
                backgroundColor: "rgba(14,165,233,0.7)",
            },
            {
                label: "Interest",
                data: dataObj["Interest"],
                backgroundColor: "rgba(234,179,8,0.7)",
            },
            {
                label: "Depreciation",
                data: dataObj["Depreciation"],
                backgroundColor: "rgba(244,63,94,0.7)",
            },
        ],
    };

    const profitComparison = {
        labels: headers,
        datasets: [
            {
                label: "Profit Before Tax",
                data: dataObj["Profit before tax"],
                borderColor: "rgba(99,102,241,1)",
                backgroundColor: "rgba(99,102,241,0.2)",
                tension: 0.3,
            },
            {
                label: "Net Profit",
                data: dataObj["Net Profit"],
                borderColor: "rgba(34,197,94,1)",
                backgroundColor: "rgba(34,197,94,0.2)",
                tension: 0.3,
            },
        ],
    };

    const dividendPayout = {
        labels: headers,
        datasets: [
            {
                label: "Dividend Payout %",
                data: dataObj["Dividend Payout %"],
                borderColor: "rgba(234,179,8,1)",
                backgroundColor: "rgba(234,179,8,0.3)",
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const taxVariation = {
        labels: headers,
        datasets: [
            {
                label: "Tax %",
                data: dataObj["Tax %"],
                backgroundColor: "rgba(249,115,22,0.7)",
            },
        ],
    };

    return (
        <div className="p-6 bg-gray-50 rounded-2xl mt-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
                Profit & Loss Dashboard
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                {/* Chart 1: Sales vs Expenses */}
                <div className="bg-white rounded-2xl shadow p-4 h-96">
                    <h3 className="text-lg font-semibold mb-2">Sales vs Expenses</h3>
                    <div className="h-80"><Bar data={salesVsExpenses} options={baseOptions} /></div>
                </div>

                {/* Chart 2: Operating Breakdown */}
                <div className="bg-white rounded-2xl shadow p-4 h-96">
                    <h3 className="text-lg font-semibold mb-2">
                        Operating Profit Breakdown
                    </h3>
                    <div className="h-80"><Bar data={operatingBreakdown} options={baseOptions} /></div>
                </div>

                {/* Chart 3: Profit Before Tax vs Net Profit */}
                <div className="bg-white rounded-2xl shadow p-4 h-96">
                    <h3 className="text-lg font-semibold mb-2">
                        Profit Before Tax vs Net Profit
                    </h3>
                    <div className="h-80"><Line data={profitComparison} options={baseOptions} /></div>
                </div>

                {/* Chart 4: Dividend Payout */}
                <div className="bg-white rounded-2xl shadow p-4 h-96">
                    <h3 className="text-lg font-semibold mb-2">Dividend Payout %</h3>
                    <div className="h-80"><Line data={dividendPayout} options={baseOptions} /></div>
                </div>

                {/* Chart 5: Tax % Variation */}
                <div className="bg-white rounded-2xl shadow p-4 h-96">
                    <h3 className="text-lg font-semibold mb-2">Tax % Variation</h3>
                    <div className="h-80"><Bar data={taxVariation} options={baseOptions} /></div>
                </div>
            </div>
        </div>
    );
};

export default ProfitLossDashboard;
