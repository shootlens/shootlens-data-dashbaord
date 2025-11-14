// src/components/HistoricalDashboard.jsx
import React, { useMemo, useState } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Tooltip,
    Legend,
    TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";

ChartJS.register(
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
    BarElement,
    TimeScale,
    Tooltip,
    Legend
);

const HistoricalDashboard = ({ historicalData }) => {
    const [timeframe, setTimeframe] = useState("day");

    // ----------------- Data Aggregation -----------------
    const aggregateData = (data, timeframe) => {
        if (!data?.length) return [];

        if (timeframe === "overall") return data;

        const chunkSize =
            timeframe === "week" ? 5
                : timeframe === "month" ? 22
                    : timeframe === "6months" ? 120
                        : timeframe === "year" ? 250
                            : 1;

        if (chunkSize === 1) return data;

        const aggregated = [];
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            if (!chunk.length) continue;
            aggregated.push({
                time: chunk[chunk.length - 1].time,
                open: chunk[0].open,
                high: Math.max(...chunk.map(d => d.high)),
                low: Math.min(...chunk.map(d => d.low)),
                close: chunk[chunk.length - 1].close,
                volume: chunk.reduce((a, b) => a + b.volume, 0),
            });
        }
        return aggregated;
    };

    const filteredData = useMemo(
        () => aggregateData(historicalData, timeframe),
        [historicalData, timeframe]
    );

    // ----------------- Technical Calculations -----------------
    const calculateEMA = (data, period = 9) => {
        if (!data.length) return [];
        const k = 2 / (period + 1);
        const ema = [];
        data.forEach((d, i) => {
            const price = typeof d === "number" ? d : d.close;
            if (i === 0) ema.push(price);
            else ema.push(price * k + ema[i - 1] * (1 - k));
        });
        return ema;
    };

    const calculateRSI = (data, period = 14) => {
        if (data.length < 2) return [];
        const maxPeriod = Math.min(period, data.length - 1); // adjust period dynamically
        let gains = [], losses = [];
        for (let i = 1; i < data.length; i++) {
            const diff = data[i].close - data[i - 1].close;
            gains.push(diff > 0 ? diff : 0);
            losses.push(diff < 0 ? -diff : 0);
        }
        let avgGain = gains.slice(0, maxPeriod).reduce((a, b) => a + b, 0) / maxPeriod;
        let avgLoss = losses.slice(0, maxPeriod).reduce((a, b) => a + b, 0) / maxPeriod;
        const rsi = [];
        for (let i = maxPeriod; i < gains.length; i++) {
            avgGain = (avgGain * (maxPeriod - 1) + gains[i]) / maxPeriod;
            avgLoss = (avgLoss * (maxPeriod - 1) + losses[i]) / maxPeriod;
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            rsi.push(100 - 100 / (1 + rs));
        }
        return rsi;
    };

    const calculateMACD = (data, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) => {
        if (data.length < 2) return { macdLine: [], signalLine: [], histogram: [] };
        const closePrices = data.map(d => d.close);
        const maxLong = Math.min(longPeriod, data.length - 1);
        const maxShort = Math.min(shortPeriod, data.length - 1);
        const maxSignal = Math.min(signalPeriod, data.length - 1);

        const emaShort = calculateEMA(closePrices, maxShort);
        const emaLong = calculateEMA(closePrices, maxLong);
        const macdLine = emaShort.map((v, i) => i >= maxLong - 1 ? v - emaLong[i] : null).slice(maxLong - 1);
        const signalLine = calculateEMA(macdLine.filter(v => v !== null), maxSignal);
        const histogram = macdLine.map((v, i) => v - (signalLine[i] ?? 0));
        return { macdLine, signalLine, histogram };
    };

    const calculateVolatility = (data) => {
        if (data.length < 2) return 0;
        const returns = data.map((d, i) => i === 0 ? 0 : (d.close - data[i - 1].close) / data[i - 1].close);
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
        return Math.sqrt(variance);
    };

    const averageVolume = (data) => data.length ? data.reduce((a, b) => a + b.volume, 0) / data.length : 0;

    // ----------------- Metrics -----------------
    const ema9 = useMemo(() => calculateEMA(filteredData, 9), [filteredData]);
    const ema20 = useMemo(() => calculateEMA(filteredData, 20), [filteredData]);
    const ema50 = useMemo(() => calculateEMA(filteredData, 50), [filteredData]);
    const ema200 = useMemo(() => calculateEMA(filteredData, 200), [filteredData]);

    const rsi = useMemo(() => calculateRSI(filteredData), [filteredData]);
    const macd = useMemo(() => calculateMACD(filteredData), [filteredData]);

    const volatility = useMemo(() => calculateVolatility(filteredData), [filteredData]);
    const avgVolumeLast30Days = useMemo(() => {
        if (!historicalData?.length) return 0;
        const last30 = historicalData.slice(-30);
        return averageVolume(last30);
    }, [historicalData]);

    const latestClose = filteredData[filteredData.length - 1]?.close ?? null;

    // ----------------- Trend Detection -----------------
    const detectTrend = () => {
        if (!latestClose || !filteredData.length) return "No Data";

        const emaUp = ema9.at(-1) > ema20.at(-1) && ema20.at(-1) > ema50.at(-1) && ema50.at(-1) > ema200.at(-1);
        const emaDown = ema9.at(-1) < ema20.at(-1) && ema20.at(-1) < ema50.at(-1) && ema50.at(-1) < ema200.at(-1);

        const macdBullish = macd.macdLine.at(-1) > macd.signalLine.at(-1) && macd.macdLine.at(-1) > 0;
        const macdBearish = macd.macdLine.at(-1) < macd.signalLine.at(-1) && macd.macdLine.at(-1) < 0;

        const rsiVal = rsi.at(-1);
        const rsiBullish = rsiVal > 50 && rsiVal < 80;
        const rsiBearish = rsiVal < 50 && rsiVal > 20;

        const aboveEMA200 = latestClose > ema200.at(-1);
        const belowEMA200 = latestClose < ema200.at(-1);

        let score = 0;
        if (emaUp) score += 2;
        if (macdBullish) score += 1;
        if (rsiBullish) score += 1;
        if (aboveEMA200) score += 1;

        if (emaDown) score -= 2;
        if (macdBearish) score -= 1;
        if (rsiBearish) score -= 1;
        if (belowEMA200) score -= 1;

        if (score >= 4) return "Strong Uptrend";
        if (score >= 2) return "Uptrend";
        if (score <= -4) return "Strong Downtrend";
        if (score <= -2) return "Downtrend";
        return "Sideways / Consolidation";
    };

    const trendLabel = useMemo(detectTrend, [latestClose, ema9, ema20, ema50, ema200, macd, rsi]);

    // ----------------- EMA Comparison -----------------
    const emaComparison = useMemo(() => {
        if (!latestClose) return ["—", "—", "—", "—"];
        return [
            latestClose > ema9.at(-1) ? "Above" : latestClose < ema9.at(-1) ? "Below" : "Neutral",
            latestClose > ema20.at(-1) ? "Above" : latestClose < ema20.at(-1) ? "Below" : "Neutral",
            latestClose > ema50.at(-1) ? "Above" : latestClose < ema50.at(-1) ? "Below" : "Neutral",
            latestClose > ema200.at(-1) ? "Above" : latestClose < ema200.at(-1) ? "Below" : "Neutral",
        ];
    }, [latestClose, ema9, ema20, ema50, ema200]);

    // ----------------- Metric Cards -----------------
    const latestRSI = rsi.at(-1) ?? null;
    const latestMACD = macd.macdLine.at(-1) ?? null;
    const latestSignal = macd.signalLine.at(-1) ?? null;

    const getRSIStatus = (v) => v === null ? "—" : v > 70 ? "Overbought" : v < 30 ? "Oversold" : "Neutral";
    const getMACDStatus = (macdVal, signalVal) =>
        macdVal === null || signalVal === null ? "—" : macdVal > signalVal ? "Bullish" : macdVal < signalVal ? "Bearish" : "Neutral";
    const getVolatilityStatus = (v) => {
        if (!v) return "—";
        const pct = v * 100;
        if (pct < 1) return "Low";
        if (pct < 2) return "Medium";
        return "High";
    };

    const metricCards = [
        { name: "RSI", value: latestRSI?.toFixed(2) ?? "—", status: getRSIStatus(latestRSI), takeaway: "RSI shows buying/selling pressure. Below 30 = Oversold, Above 70 = Overbought." },
        { name: "MACD", value: latestMACD?.toFixed(2) ?? "—", status: getMACDStatus(latestMACD, latestSignal), takeaway: "MACD compares short vs long-term momentum. Bullish if MACD > Signal." },
        { name: "Volatility", value: (volatility * 100).toFixed(2) + "%", status: getVolatilityStatus(volatility), takeaway: "Volatility shows price fluctuation." },
    ];

    // ----------------- Render -----------------
    return (
        <div className="bg-white p-4 rounded-[10px] border border-gray-200 mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Historical Dashboard</h2>
                <select
                    className="border border-gray-300 rounded-md p-1 text-sm"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="6months">6 Months</option>
                    <option value="year">Year</option>
                    <option value="overall">Overall</option>
                </select>
            </div>

            {/* Trend Banner */}
            <div className={`p-2 rounded-md text-sm font-medium text-center mb-4
                ${trendLabel.includes("Uptrend") ? "bg-green-100 text-green-700"
                    : trendLabel.includes("Downtrend") ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                }`}>
                {trendLabel} ({timeframe.toUpperCase()})
            </div>

            {/* Metric Cards Grid */}
            <div className="flex flex-wrap gap-5">
                {/* EMA Card */}
                <div className="bg-white p-4 rounded-[10px] border border-gray-200 min-w-[280px] flex-1">
                    <div className="text-sm font-medium text-gray-500">EMA (9/20/50/200)</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {["9", "20", "50", "200"].map((p, i) => {
                            const status = emaComparison[i];
                            const color = status === "Above" ? "text-green-700" : status === "Below" ? "text-red-700" : "text-orange-700";
                            return <div key={p} className={`text-sm font-semibold ${color}`}>{p}: {status}</div>;
                        })}
                    </div>
                    <div className={`mt-2 text-xs font-medium ${trendLabel.includes("Uptrend") ? "text-green-600" : trendLabel.includes("Downtrend") ? "text-red-600" : "text-yellow-600"}`}>
                        {trendLabel}
                    </div>
                    <div className="mt-2 text-[11px] border-t border-gray-200 pt-1 text-gray-500">
                        EMA shows price direction across multiple timelines. Above = bullish, Below = bearish.
                    </div>
                </div>

                {/* Other Metric Cards */}
                {metricCards.map((m) => (
                    <div key={m.name} className="bg-white p-4 rounded-[10px] border border-gray-200 min-w-[280px] flex-1">
                        <div className="text-sm font-medium text-gray-500">{m.name}</div>
                        <div className={`text-xl font-semibold my-1
                            ${m.status === "Bullish" || m.status === "Oversold" ? "text-green-600"
                                : m.status === "Bearish" || m.status === "Overbought" ? "text-red-600"
                                    : "text-yellow-600"}`}>
                            {m.value}
                        </div>
                        <div className={`text-sm
                            ${m.status === "Bullish" || m.status === "Oversold" ? "text-green-600"
                                : m.status === "Bearish" || m.status === "Overbought" ? "text-red-600"
                                    : "text-yellow-600"}`}>
                            {m.status}
                        </div>
                        <div className="mt-2 text-[11px] border-t border-gray-200 pt-1 text-gray-500">{m.takeaway}</div>
                    </div>
                ))}

                {/* Avg Volume Card */}
                <div className="bg-white p-4 rounded-[10px] border border-gray-200 min-w-[280px] flex-1">
                    <div className="text-sm font-medium text-gray-500">Avg Volume (30 days)</div>
                    <div className="text-xl font-semibold my-1">{avgVolumeLast30Days?.toLocaleString() ?? "—"}</div>
                    <div className={`text-sm ${avgVolumeLast30Days > 50000 ? "text-green-600" : "text-red-600"}`}>
                        {avgVolumeLast30Days > 50000 ? "High" : "Low"}
                    </div>
                    <div className="mt-2 text-[11px] border-t border-gray-200 pt-1 text-gray-500">
                        Average trading volume for the last 30 days. Higher volume means better liquidity.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HistoricalDashboard;
