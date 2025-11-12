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

    // ----------------- Aggregation -----------------
    const aggregateData = (data, timeframe) => {
        if (!data?.length) return [];

        if (timeframe === "overall") return data;

        const chunkSize =
            timeframe === "week"
                ? 5
                : timeframe === "month"
                    ? 22
                    : timeframe === "6months"
                        ? 120
                        : timeframe === "year"
                            ? 250
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

    const filteredData = useMemo(() => aggregateData(historicalData, timeframe), [historicalData, timeframe]);

    // ----------------- Utilities -----------------
    const calculateEMA = (data, period = 9) => {
        if (!data.length) return [];
        const k = 2 / (period + 1);
        let ema = [];
        data.forEach((d, i) => {
            if (i === 0) ema.push(d.close);
            else ema.push(d.close * k + ema[i - 1] * (1 - k));
        });
        return ema;
    };

    const calculateRSI = (data, period = 14) => {
        if (data.length < period) return [];
        let gains = [], losses = [];
        for (let i = 1; i < data.length; i++) {
            const diff = data[i].close - data[i - 1].close;
            gains.push(diff > 0 ? diff : 0);
            losses.push(diff < 0 ? -diff : 0);
        }
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let rsi = [];
        for (let i = period; i < gains.length; i++) {
            avgGain = (avgGain * (period - 1) + gains[i]) / period;
            avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
            const rs = avgLoss === 0 ? 0 : avgGain / avgLoss;
            rsi.push(100 - 100 / (1 + rs));
        }
        return rsi.slice(period);
    };

    const calculateMACD = (data, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) => {
        if (data.length < longPeriod) return { macdLine: [], signalLine: [], histogram: [] };
        const emaShort = calculateEMA(data, shortPeriod);
        const emaLong = calculateEMA(data, longPeriod);
        const macdLine = emaShort.map((v, i) => v - emaLong[i]);
        const signalLine = calculateEMA(macdLine.map(v => ({ close: v })), signalPeriod);
        const histogram = macdLine.map((v, i) => v - signalLine[i]);
        return { macdLine: macdLine.slice(longPeriod), signalLine, histogram };
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

    const getEMAComparison = (price, ema) => {
        if (ema === undefined || price === null) return "—";
        if (price > ema) return "Above";
        if (price < ema) return "Below";
        return "Neutral";
    };

    const emaComparison = [
        getEMAComparison(latestClose, ema9.at(-1)),
        getEMAComparison(latestClose, ema20.at(-1)),
        getEMAComparison(latestClose, ema50.at(-1)),
        getEMAComparison(latestClose, ema200.at(-1)),
    ];

    const overallEMASentiment =
        emaComparison.filter(v => v === "Above").length >= 3 ? "Bullish"
            : emaComparison.filter(v => v === "Below").length >= 3 ? "Bearish"
                : "Mixed";

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

    // ----------------- Cards -----------------
    const metricCards = [
        { name: "RSI", value: latestRSI?.toFixed(2) ?? "—", status: getRSIStatus(latestRSI), takeaway: "RSI shows buying/selling pressure. Below 30 = Oversold, Above 70 = Overbought." },
        { name: "MACD", value: latestMACD?.toFixed(2) ?? "—", status: getMACDStatus(latestMACD, latestSignal), takeaway: "MACD compares short vs long-term momentum. Bullish if MACD > Signal." },
        { name: "EMA (9/20/50/200)", value: emaComparison, sentiment: overallEMASentiment, isEMA: true, takeaway: "EMA shows price direction across timelines." },
        { name: "Volatility", value: (volatility * 100).toFixed(2) + "%", status: getVolatilityStatus(volatility), takeaway: "Volatility shows price fluctuation." },
    ];

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

            {/* Sentiment Banner */}
            <div className={`p-2 rounded-md text-sm font-medium text-center mb-4
                ${overallEMASentiment === "Bullish" ? "bg-green-100 text-green-700"
                    : overallEMASentiment === "Bearish" ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                }`}>
                {overallEMASentiment} Trend Detected ({timeframe.toUpperCase()})
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metricCards.map((m) => (
                    <div key={m.name} className="bg-white p-4 rounded-[10px] border border-gray-200 min-w-[280px] flex-1">
                        <div className="text-sm font-medium text-gray-500">{m.name}</div>
                        {m.isEMA ? (
                            <>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {["9", "20", "50", "200"].map((p, i) => {
                                        const status = m.value[i];
                                        const color = status === "Above" ? "text-green-700" : status === "Below" ? "text-red-700" : "text-orange-700";
                                        return <div key={p} className={`text-sm font-semibold ${color}`}>{p}: {status}</div>;
                                    })}
                                </div>
                                <div className={`mt-2 text-xs font-medium ${m.sentiment === "Bullish" ? "text-green-600" : m.sentiment === "Bearish" ? "text-red-600" : "text-yellow-600"}`}>
                                    {m.sentiment}
                                </div>
                            </>
                        ) : (
                            <>
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
                            </>
                        )}
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
                    <div className="mt-2 text-[11px] border-t border-gray-200 pt-1 text-gray-500">Average trading volume for the last 30 days. Higher volume means better liquidity.</div>
                </div>
            </div>
        </div>
    );
};

export default HistoricalDashboard;
