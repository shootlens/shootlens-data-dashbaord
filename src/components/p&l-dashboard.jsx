import { useMemo } from "react";
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
import { COLORS } from "../constants";

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

const parseValue = (v) => {
    if (v == null) return 0;

    if (typeof v === "number") return v;

    const cleaned = String(v)
        .replace(/,/g, "")
        .replace("%", "")
        .replace(/[^\d.-]/g, "")
        .trim();

    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
};

const normalizeKey = (str = "") =>
    str.toLowerCase().replace(/\s+/g, " ").trim();

const get = (obj, key, len) =>
    obj[normalizeKey(key)] || Array(len).fill(0);

const ProfitLossDashboard = ({ profitLossData = [] }) => {
    const parsed = useMemo(() => {
        if (!Array.isArray(profitLossData) || profitLossData.length < 2)
            return null;

        const headers = profitLossData[0].slice(1); // year labels
        const dataObj = {};

        profitLossData.slice(1).forEach((row) => {
            const key = normalizeKey(row[0]);
            const values = row.slice(1).map(parseValue);
            dataObj[key] = values;
        });

        return { headers, dataObj };
    }, [profitLossData]);

    if (!parsed) return null;
    const { headers, dataObj } = parsed;
    const n = headers.length;


    const salesVsExpenses = {
        labels: headers,
        datasets: [
            {
                label: "Sales",
                data: get(dataObj, "sales", n),
                backgroundColor: "rgba(37,99,235,0.6)",
            },
            {
                label: "Expenses",
                data: get(dataObj, "expenses", n),
                backgroundColor: "rgba(239,68,68,0.6)",
            },
        ],
    };

    const operatingBreakdown = {
        labels: headers,
        datasets: [
            {
                label: "Operating Profit",
                data: get(dataObj, "operating profit", n),
                backgroundColor: "rgba(34,197,94,0.7)",
            },
            {
                label: "Other Income",
                data: get(dataObj, "other income", n),
                backgroundColor: "rgba(14,165,233,0.7)",
            },
            {
                label: "Interest",
                data: get(dataObj, "interest", n),
                backgroundColor: "rgba(234,179,8,0.7)",
            },
            {
                label: "Depreciation",
                data: get(dataObj, "depreciation", n),
                backgroundColor: "rgba(244,63,94,0.7)",
            },
        ],
    };

    const profitComparison = {
        labels: headers,
        datasets: [
            {
                label: "Profit Before Tax",
                data: get(dataObj, "profit before tax", n),
                borderColor: "rgba(99,102,241,1)",
                backgroundColor: "rgba(99,102,241,0.2)",
                tension: 0.3,
            },
            {
                label: "Net Profit",
                data: get(dataObj, "net profit", n),
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
                data: get(dataObj, "dividend payout %", n),
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
                data: get(dataObj, "tax %", n),
                backgroundColor: "rgba(249,115,22,0.7)",
            },
        ],
    };

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
        <div className="rounded-2xl mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">

                <ChartCard title="Sales vs Expenses">
                    <Bar data={salesVsExpenses} options={baseOptions} />
                </ChartCard>

                <ChartCard title="Operating Profit Breakdown">
                    <Bar data={operatingBreakdown} options={baseOptions} />
                </ChartCard>

                <ChartCard title="Profit Before Tax vs Net Profit">
                    <Line data={profitComparison} options={baseOptions} />
                </ChartCard>

                <ChartCard title="Dividend Payout %">
                    <Line data={dividendPayout} options={baseOptions} />
                </ChartCard>

                <ChartCard title="Tax % Variation">
                    <Bar data={taxVariation} options={baseOptions} />
                </ChartCard>

            </div>
        </div>
    );
};

const ChartCard = ({ title, children }) => (
    <div
        className="bg-white rounded-2xl border p-4 h-96"
        style={{ borderColor: COLORS.border }}
    >
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="h-80">{children}</div>
    </div>
);

export default ProfitLossDashboard;
