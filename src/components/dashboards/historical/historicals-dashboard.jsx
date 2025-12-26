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
    Title,
    Filler,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { COLORS } from "../../../constants";
import "../../../App.css"
import Animate from "../../common/animate";

ChartJS.register(
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
    BarElement,
    TimeScale,
    Tooltip,
    Legend,
    Title,
    Filler
);

/* ------------------------------
   Utilities
   ------------------------------*/
const safe = (v, fallback = null) => (v === undefined || Number.isNaN(v) ? fallback : v);
const getLast = (arr, n = 1) => (arr && arr.length ? arr[arr.length - n] : null);

const getISOWeek = (date) => {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    return Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
};

const getBucketStart = (date, timeframe) => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    if (timeframe === "week") {
        const day = d.getUTCDay(); // 0 (Sun) - 6 (Sat)
        // shift to Monday
        const diff = day === 0 ? -6 : 1 - day;
        d.setUTCDate(d.getUTCDate() + diff);
        return d.toISOString();
    }
    if (timeframe === "month") {
        d.setUTCDate(1);
        return d.toISOString();
    }
    if (timeframe === "6months") {
        const month = d.getUTCMonth();
        const halfStartMonth = Math.floor(month / 6) * 6; // 0 or 6
        d.setUTCMonth(halfStartMonth, 1);
        return d.toISOString();
    }
    if (timeframe === "year") {
        d.setUTCMonth(0, 1);
        return d.toISOString();
    }
    // daily
    return d.toISOString().slice(0, 10);
};

/* ------------------------------
   Aggregation (TradingView-style buckets)
   ------------------------------*/
const aggregateData = (data = [], timeframe = "day") => {
    if (!Array.isArray(data) || data.length === 0) return [];
    const sorted = [...data].sort((a, b) => new Date(a.time) - new Date(b.time));

    if (timeframe === "day" || timeframe === "overall") {
        return sorted.map((d) => ({ ...d, time: new Date(d.time).toISOString() }));
    }

    const buckets = new Map();
    for (const candle of sorted) {
        const key = getBucketStart(candle.time, timeframe);
        const existing = buckets.get(key);
        if (!existing) {
            buckets.set(key, {
                time: key,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
                volume: candle.volume || 0,
            });
        } else {
            existing.high = Math.max(existing.high, candle.high);
            existing.low = Math.min(existing.low, candle.low);
            existing.close = candle.close;
            existing.volume += candle.volume || 0;
        }
    }

    return Array.from(buckets.values()).sort((a, b) => new Date(a.time) - new Date(b.time));
};

/* ------------------------------
   Indicator implementations (operate on contiguous numeric arrays)
   - EMA uses SMA seed (TradingView style)
   - Wilder RSI for exact TradingView match
   - MACD uses EMA(12)-EMA(26) and signal=EMA(9) of MACD
   ------------------------------*/
const emaArray = (values = [], period = 12) => {
    const n = values.length;
    const out = new Array(n).fill(null);
    if (!values || n === 0) return out;
    if (n < period) return out;

    let sum = 0;
    for (let i = 0; i < period; i++) sum += Number(values[i] || 0);
    let prev = sum / period; // SMA seed like TradingView
    out[period - 1] = prev;
    const k = 2 / (period + 1);
    for (let i = period; i < n; i++) {
        const v = Number(values[i] || 0);
        prev = (v - prev) * k + prev;
        out[i] = prev;
    }
    return out;
};

const wilderRSI = (values = [], period = 14) => {
    const n = values.length;
    const out = new Array(n).fill(null);
    if (!values || n <= period) return out;
    const gains = new Array(n).fill(0);
    const losses = new Array(n).fill(0);
    for (let i = 1; i < n; i++) {
        const change = Number(values[i] || 0) - Number(values[i - 1] || 0);
        gains[i] = change > 0 ? change : 0;
        losses[i] = change < 0 ? -change : 0;
    }
    let sumGain = 0;
    let sumLoss = 0;
    for (let i = 1; i <= period; i++) {
        sumGain += gains[i];
        sumLoss += losses[i];
    }
    let avgGain = sumGain / period;
    let avgLoss = sumLoss / period;
    out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    for (let i = period + 1; i < n; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return out;
};

const macdArray = (values = [], fast = 12, slow = 26, signalPeriod = 9) => {
    const n = values.length;
    const empty = new Array(n).fill(null);
    if (!values || n === 0) return { macd: empty, signal: empty, hist: empty };
    if (n < slow) return { macd: empty, signal: empty, hist: empty };

    const emaFast = emaArray(values, fast);
    const emaSlow = emaArray(values, slow);
    const macd = new Array(n).fill(null);
    for (let i = 0; i < n; i++) {
        if (emaFast[i] != null && emaSlow[i] != null) macd[i] = emaFast[i] - emaSlow[i];
        else macd[i] = null;
    }

    // Signal: compute EMA on the compact macd values and map back to indices
    const compact = [];
    const idxs = [];
    for (let i = 0; i < n; i++) {
        if (macd[i] != null) {
            idxs.push(i);
            compact.push(macd[i]);
        }
    }
    const signalCompact = emaArray(compact, signalPeriod);
    const signal = new Array(n).fill(null);
    for (let j = 0; j < signalCompact.length; j++) {
        const idx = idxs[j];
        signal[idx] = signalCompact[j];
    }

    const hist = new Array(n).fill(null);
    for (let i = 0; i < n; i++) {
        if (macd[i] == null || signal[i] == null) hist[i] = null;
        else hist[i] = macd[i] - signal[i];
    }

    return { macd, signal, hist };
};

/* ------------------------------
   Volatility & volume helpers
   ------------------------------*/
const calcVolatility = (series = []) => {
    if (!series || series.length < 2) return 0;
    const returns = [];
    for (let i = 1; i < series.length; i++) {
        const prev = series[i - 1].close || 1;
        returns.push((series[i].close - prev) / prev);
    }
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
    return Math.sqrt(variance);
};

const averageVolume = (series = []) =>
    series && series.length ? series.reduce((a, b) => a + (b.volume || 0), 0) / series.length : 0;

/* ------------------------------
   TradingView-accurate pivot functions
   (exact behavior equivalent to PineScript's pivothigh / pivotlow with left/right)
   ------------------------------*/
const tvPivotHigh = (series = [], left = 2, right = 2) => {
    const n = series.length;
    const out = [];
    // i runs from left to n-right-1 (inclusive)
    for (let i = left; i < n - right; i++) {
        const pivotHigh = series[i].high;
        let isPivot = true;
        // left side (must be strictly less)
        for (let j = 1; j <= left; j++) {
            if (series[i - j].high >= pivotHigh) {
                isPivot = false;
                break;
            }
        }
        if (!isPivot) continue;
        // right side (must be strictly less)
        for (let j = 1; j <= right; j++) {
            if (series[i + j].high >= pivotHigh) {
                isPivot = false;
                break;
            }
        }
        if (isPivot) out.push({ index: i, price: pivotHigh });
    }
    return out;
};

const tvPivotLow = (series = [], left = 2, right = 2) => {
    const n = series.length;
    const out = [];
    for (let i = left; i < n - right; i++) {
        const pivotLow = series[i].low;
        let isPivot = true;
        for (let j = 1; j <= left; j++) {
            if (series[i - j].low <= pivotLow) {
                isPivot = false;
                break;
            }
        }
        if (!isPivot) continue;
        for (let j = 1; j <= right; j++) {
            if (series[i + j].low <= pivotLow) {
                isPivot = false;
                break;
            }
        }
        if (isPivot) out.push({ index: i, price: pivotLow });
    }
    return out;
};

/* ------------------------------
   Market structure, trendline slope, breakout (TradingView-consistent)
   ------------------------------*/
const tvMarketStructure = (highPivots = [], lowPivots = []) => {
    if (highPivots.length < 2 || lowPivots.length < 2) return "Not enough data";
    const last2H = highPivots.slice(-2);
    const last2L = lowPivots.slice(-2);
    const h1 = last2H[0].price;
    const h2 = last2H[1].price;
    const l1 = last2L[0].price;
    const l2 = last2L[1].price;
    if (h2 > h1 && l2 > l1) return "Uptrend"; // HH & HL
    if (h2 < h1 && l2 < l1) return "Downtrend"; // LH & LL
    return "Sideways";
};

// TradingView uses raw price difference per bar for slope (not percentage)
const tvTrendlineSlope = (points = []) => {
    if (!points || points.length < 2) return 0;
    const p1 = points[points.length - 2];
    const p2 = points[points.length - 1];
    if (!p1 || !p2) return 0;
    return (p2.price - p1.price) / Math.max(1, p2.index - p1.index);
};

const tvBreakout = (series = [], highPivots = [], lowPivots = []) => {
    const lastClose = series[series.length - 1]?.close;
    const lastHigh = highPivots.length ? highPivots[highPivots.length - 1].price : null;
    const lastLow = lowPivots.length ? lowPivots[lowPivots.length - 1].price : null;
    return {
        bullishBreakout: lastHigh != null && lastClose > lastHigh,
        bearishBreakdown: lastLow != null && lastClose < lastLow,
    };
};

/* ------------------------------
   Trend insights + combined insight builder
   ------------------------------*/
const generateTrendInsights = (series = [], left = 2, right = 2) => {
    const insights = [];
    if (!series || series.length < Math.max(left, right) + 3) {
        insights.push("Not enough data for trend analysis.");
        return insights;
    }

    const highs = tvPivotHigh(series, left, right);
    const lows = tvPivotLow(series, left, right);
    const structure = tvMarketStructure(highs, lows);
    const lowSlope = tvTrendlineSlope(lows);
    const highSlope = tvTrendlineSlope(highs);
    const { bullishBreakout, bearishBreakdown } = tvBreakout(series, highs, lows);

    if (structure === "Uptrend") insights.push("Market structure: Higher Highs & Higher Lows → Uptrend.");
    else if (structure === "Downtrend") insights.push("Market structure: Lower Highs & Lower Lows → Downtrend.");
    else insights.push("Market structure: Mixed → Sideways / Consolidation.");

    if (lowSlope > 0) insights.push("Swing lows form a rising trendline → buyers defending dips.");
    if (highSlope < 0) insights.push("Swing highs form a falling trendline → sellers controlling rallies.");
    if (Math.abs(lowSlope) === 0 && Math.abs(highSlope) === 0) insights.push("Trendlines are flat → range-bound / sideways market.");

    if (bullishBreakout) insights.push("Bullish breakout: price closed above recent swing high → potential continuation.");
    if (bearishBreakdown) insights.push("Bearish breakdown: price closed below recent swing low → potential bearish continuation.");

    if (highs.length) {
        const recentHighs = highs.slice(-3).map((h) => h.price);
        const resistance = recentHighs.length ? recentHighs.reduce((a, b) => a + b, 0) / recentHighs.length : null;
        if (resistance) insights.push(`Nearby resistance (avg recent highs): ${Number(resistance).toFixed(2)}`);
    }
    if (lows.length) {
        const recentLows = lows.slice(-3).map((l) => l.price);
        const support = recentLows.length ? recentLows.reduce((a, b) => a + b, 0) / recentLows.length : null;
        if (support) insights.push(`Nearby support (avg recent lows): ${Number(support).toFixed(2)}`);
    }

    return insights;
};

const buildInsights = ({ latestRSI, latestMACD, latestSignal, emaUp, emaDown, aboveEMA200, belowEMA200, volatility, series }) => {
    const insights = [];

    if (latestRSI != null) {
        if (latestRSI > 80) insights.push(`RSI ${latestRSI.toFixed(2)}: Strongly overbought — high chance of pullback or consolidation.`);
        else if (latestRSI > 70) insights.push(`RSI ${latestRSI.toFixed(2)}: Overbought — expect possible sideways or minor pullback.`);
        else if (latestRSI > 50) insights.push(`RSI ${latestRSI.toFixed(2)}: Bullish momentum.`);
        else if (latestRSI >= 30) insights.push(`RSI ${latestRSI.toFixed(2)}: Bearish momentum / weakening.`);
        else insights.push(`RSI ${latestRSI.toFixed(2)}: Oversold — bounce or reversal possible.`);
    }

    if (latestMACD != null && latestSignal != null) {
        if (latestMACD > latestSignal && latestMACD > 0) insights.push(`MACD ${latestMACD.toFixed(4)} > Signal ${latestSignal.toFixed(4)}: Bullish momentum.`);
        else if (latestMACD > latestSignal && latestMACD < 0) insights.push(`MACD ${latestMACD.toFixed(4)} > Signal ${latestSignal.toFixed(4)}: Bullish crossover but still below zero (early reversal).`);
        else if (latestMACD < latestSignal && latestMACD > 0) insights.push(`MACD ${latestMACD.toFixed(4)} < Signal ${latestSignal.toFixed(4)}: Momentum weakening — watch for pullback.`);
        else insights.push(`MACD ${latestMACD != null ? latestMACD.toFixed(4) : "—"} < Signal ${latestSignal != null ? latestSignal.toFixed(4) : "—"}: Bearish momentum.`);
    }

    if (emaUp) insights.push("EMA alignment: 9>20>50>200 — bullish alignment.");
    else if (emaDown) insights.push("EMA alignment: 9<20<50<200 — bearish alignment.");
    else insights.push("EMA alignment: Mixed across timeframes.");

    if (aboveEMA200) insights.push("Price is above EMA200 — long-term bias: bullish.");
    if (belowEMA200) insights.push("Price is below EMA200 — long-term bias: bearish.");

    const volPct = (volatility * 100) || 0;
    if (volPct < 1) insights.push(`Volatility low (${volPct.toFixed(2)}%) — consolidation likely.`);
    else if (volPct < 2) insights.push(`Volatility moderate (${volPct.toFixed(2)}%).`);
    else insights.push(`Volatility high (${volPct.toFixed(2)}%) — expect larger moves.`);

    const trendInsights = generateTrendInsights(series);
    insights.push(...trendInsights);

    // Rebalanced scoring for investment-grade calls
    const score = (() => {
        let s = 0;
        if (emaUp) s += 3;
        if (latestMACD != null && latestSignal != null && latestMACD > latestSignal) s += 2;
        if (latestRSI != null && latestRSI > 55) s += 1;
        if (aboveEMA200) s += 2;
        if (emaDown) s -= 3;
        if (latestMACD != null && latestSignal != null && latestMACD < latestSignal) s -= 2;
        if (latestRSI != null && latestRSI < 45) s -= 1;
        if (belowEMA200) s -= 2;
        return s;
    })();

    if (score >= 6) insights.push("Overall: Strong Bullish bias.");
    else if (score >= 3) insights.push("Overall: Bullish bias.");
    else if (score <= -6) insights.push("Overall: Strong Bearish bias.");
    else if (score <= -3) insights.push("Overall: Bearish bias.");
    else insights.push("Overall: Sideways / Neutral — wait for clearer signals.");

    return insights;
};

/* ------------------------------
   React Component
   ------------------------------*/
const HistoricalDashboard = ({ historicalData = [] }) => {
    const [timeframe, setTimeframe] = useState("day");
    // pivot left/right config (TradingView default left=2 right=2)
    const pivotLeft = 2;
    const pivotRight = 2;

    // 1. aggregate (normalized buckets)
    const aggregatedSeries = useMemo(() => aggregateData(historicalData, timeframe), [historicalData, timeframe]);

    // 2. determine display window
    const displayCount = useMemo(() => {
        switch (timeframe) {
            case "day":
            case "week":
            case "month":
                return Math.min(200, aggregatedSeries.length);
            case "6months":
                return Math.min(180, aggregatedSeries.length);
            case "year":
                return Math.min(260, aggregatedSeries.length);
            case "overall":
                return aggregatedSeries.length;
            default:
                return Math.min(200, aggregatedSeries.length);
        }
    }, [aggregatedSeries.length, timeframe]);

    const startIdx = Math.max(0, aggregatedSeries.length - displayCount);
    const displaySeries = useMemo(() => aggregatedSeries.slice(startIdx), [aggregatedSeries, startIdx]);

    // 3. arrays for indicators (contiguous, no leading nulls)
    const { labels, closes } = useMemo(() => {
        const labels = displaySeries.map((d) => d.time || "");
        const closes = displaySeries.map((d) => Number(d.close || 0));
        return { labels, closes };
    }, [displaySeries]);

    // 4. indicators computed on display slice (TradingView-accurate)
    const indicators = useMemo(() => {
        const ema9 = emaArray(closes, 9);
        const ema20 = emaArray(closes, 20);
        const ema50 = emaArray(closes, 50);
        const ema200 = emaArray(closes, 200);
        const rsi14 = wilderRSI(closes, 14);
        const macd = macdArray(closes, 12, 26, 9);
        return { ema9, ema20, ema50, ema200, rsi14, macd };
    }, [closes]);

    // 5. latest values & flags
    const latestClose = safe(getLast(closes), null);
    const latestEma9 = safe(getLast(indicators.ema9), null);
    const latestEma20 = safe(getLast(indicators.ema20), null);
    const latestEma50 = safe(getLast(indicators.ema50), null);
    const latestEma200 = safe(getLast(indicators.ema200), null);
    const latestRSI = safe(getLast(indicators.rsi14), null);
    const latestMACD = safe(getLast(indicators.macd.macd), null);
    const latestSignal = safe(getLast(indicators.macd.signal), null);

    const emaUp =
        [latestEma9, latestEma20, latestEma50, latestEma200].every((val) => val != null) &&
        latestEma9 > latestEma20 &&
        latestEma20 > latestEma50 &&
        latestEma50 > latestEma200;
    const emaDown =
        [latestEma9, latestEma20, latestEma50, latestEma200].every((val) => val != null) &&
        latestEma9 < latestEma20 &&
        latestEma20 < latestEma50 &&
        latestEma50 < latestEma200;

    const macdBullish = latestMACD != null && latestSignal != null && latestMACD > latestSignal && latestMACD > 0;
    const macdBearish = latestMACD != null && latestSignal != null && latestMACD < latestSignal && latestMACD < 0;

    const aboveEMA200 = latestClose != null && latestEma200 != null && latestClose > latestEma200;
    const belowEMA200 = latestClose != null && latestEma200 != null && latestClose < latestEma200;

    const volatility = calcVolatility(displaySeries);
    const avgVol30 = averageVolume(historicalData.slice(-30));

    // 6. pivots & trend structure computed on aggregatedSeries (full aggregated to find pivots across full view)
    const highs = useMemo(() => tvPivotHigh(aggregatedSeries, pivotLeft, pivotRight), [aggregatedSeries]);
    const lows = useMemo(() => tvPivotLow(aggregatedSeries, pivotLeft, pivotRight), [aggregatedSeries]);
    const structure = useMemo(() => tvMarketStructure(highs, lows), [highs, lows]);
    const lowSlope = useMemo(() => tvTrendlineSlope(lows), [lows]);
    const highSlope = useMemo(() => tvTrendlineSlope(highs), [highs]);
    const { bullishBreakout, bearishBreakdown } = useMemo(() => tvBreakout(aggregatedSeries, highs, lows), [aggregatedSeries, highs, lows]);

    const classifyTrendLabel = ({ structure, lowSlope, highSlope, bullishBreakout, bearishBreakdown }) => {
        if (bullishBreakout) return "Uptrend (Breakout)";
        if (bearishBreakdown) return "Downtrend (Breakdown)";
        if (structure === "Uptrend") {
            if (lowSlope > 0) return "Strong Uptrend";
            return "Uptrend";
        }
        if (structure === "Downtrend") {
            if (highSlope < 0) return "Strong Downtrend";
            return "Downtrend";
        }
        return "Sideways / Consolidation";
    };

    const trendLabel = classifyTrendLabel({ structure, lowSlope, highSlope, bullishBreakout, bearishBreakdown });

    // 7. insights
    const insights = useMemo(
        () =>
            buildInsights({
                latestRSI,
                latestMACD,
                latestSignal,
                emaUp,
                emaDown,
                aboveEMA200,
                belowEMA200,
                volatility,
                series: aggregatedSeries,
            }),
        [latestRSI, latestMACD, latestSignal, emaUp, emaDown, aboveEMA200, belowEMA200, volatility, aggregatedSeries]
    );

    const renderedInsights = useMemo(
        () =>
            insights.map((it, i) => (
                <li key={i} className="pb-2 text-[14px]" style={{ color: COLORS.secondaryText }}>
                    {it}
                </li>
            )),
        [insights]
    );

    return (
        <div className="bg-white p-4 rounded-[10px] border border-gray-200 mb-6">
            <Animate className="flex-1">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Historical Dashboard</h2>
                    <select className={`border rounded-[5px] px-2 py-1.5 text-sm`} value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                        <option value="day">Day</option>
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                        <option value="6months">6 Months</option>
                        <option value="year">Year</option>
                        <option value="overall">Overall</option>
                    </select>
                </div>
            </Animate>
            <Animate className="flex-1">
                <div
                    className={`p-2 rounded-md text-sm font-medium text-center mb-4 ${trendLabel.includes("Uptrend") ? "bg-green-100 text-green-700" : trendLabel.includes("Downtrend") ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                        }`}
                >
                    {trendLabel} ({timeframe.toUpperCase()})
                </div>
            </Animate>

            {/* Metric Cards Grid */}
            <div className="flex flex-wrap gap-5 mb-6">
                {/* EMA Status */}
                <Animate className="flex-1">
                    <div className="bg-white p-4 rounded-[10px] border border-gray-200 min-w-[220px] flex-1">
                        <div className="text-sm font-medium text-gray-500">EMA (9 / 20 / 50 / 200)</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {[
                                { p: "9", v: latestEma9 },
                                { p: "20", v: latestEma20 },
                                { p: "50", v: latestEma50 },
                                { p: "200", v: latestEma200 },
                            ].map((e, i) => {
                                const status = latestClose == null || e.v == null ? "Neutral" : latestClose > e.v ? "Above" : latestClose < e.v ? "Below" : "Neutral";
                                const color = status === "Above" ? "text-green-700" : status === "Below" ? "text-red-700" : "text-yellow-700";
                                return (
                                    <div key={i} className={`text-sm font-semibold ${color}`}>
                                        {e.p}: {status}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-2 text-xs font-medium">
                            EMA alignment: {emaUp ? <span className="text-green-600">Bullish alignment</span> : emaDown ? <span className="text-red-600">Bearish alignment</span> : <span className="text-yellow-600">Mixed</span>}
                        </div>
                        <div className="mt-2 text-[11px] border-t border-gray-200 pt-1 text-gray-500">EMA shows momentum across multiple timeframes.</div>
                    </div>
                </Animate>

                {/* RSI Card */}

                <Animate className="flex-1">
                    <div className="bg-white p-4 rounded-[10px] border border-gray-200 min-w-[220px]">
                        <div className="text-sm font-medium text-gray-500">RSI (14)</div>
                        <div className={`text-xl font-semibold my-1 ${latestRSI != null ? (latestRSI > 70 ? "text-red-600" : latestRSI < 30 ? "text-green-600" : "text-yellow-600") : "text-gray-700"}`}>
                            {latestRSI != null ? latestRSI.toFixed(2) : "—"}
                        </div>
                        <div className={`text-sm ${latestRSI != null ? (latestRSI > 70 ? "text-red-600" : latestRSI < 30 ? "text-green-600" : "text-yellow-600") : "text-gray-600"}`}>
                            {latestRSI != null ? (latestRSI > 70 ? "Overbought" : latestRSI < 30 ? "Oversold" : "Neutral") : "—"}
                        </div>
                        <div className="mt-2 text-[11px] border-t border-gray-200 pt-1 text-gray-500">Below 30 = Oversold, Above 70 = Overbought.</div>
                    </div>
                </Animate>

                {/* MACD Card */}
                <Animate className="flex-1">
                    <div className="bg-white p-4 rounded-[10px] border border-gray-200 min-w-[220px] flex-1">
                        <div className="text-sm font-medium text-gray-500">MACD (12,26,9)</div>
                        <div className={`text-xl font-semibold my-1 ${macdBullish ? "text-green-600" : macdBearish ? "text-red-600" : "text-yellow-600"}`}>
                            {latestMACD != null ? latestMACD.toFixed(4) : "—"}
                        </div>
                        <div className={`text-sm ${macdBullish ? "text-green-600" : macdBearish ? "text-red-600" : "text-gray-600"}`}>
                            {latestMACD != null && latestSignal != null ? (latestMACD > latestSignal ? "Bullish" : latestMACD < latestSignal ? "Bearish" : "Neutral") : "—"}
                        </div>
                        <div className="mt-2 text-[11px] border-t border-gray-200 pt-1 text-gray-500">MACD {`>`} Signal = bullish momentum.</div>
                    </div>
                </Animate>

                {/* Volatility Card */}
                <Animate className="flex-1">
                    <div className="bg-white p-4 rounded-[10px] border border-gray-200 min-w-[220px] flex-1">
                        <div className="text-sm font-medium text-gray-500">Volatility (σ)</div>
                        <div className="text-xl font-semibold my-1">{(volatility * 100).toFixed(2)}%</div>
                        <div className={`text-sm ${volatility * 100 < 2 ? "text-yellow-600" : "text-red-600"}`}>{volatility * 100 < 1 ? "Low" : volatility * 100 < 2 ? "Medium" : "High"}</div>
                        <div className="mt-2 text-[11px] border-t border-gray-200 pt-1 text-gray-500">Standard deviation of returns (higher = more movement).</div>
                    </div>
                </Animate>

                {/* Avg Volume Card */}
                <Animate className="flex-1">
                    <div className="bg-white p-4 rounded-[10px] border border-gray-200 min-w-[220px] flex-1">
                        <div className="text-sm font-medium text-gray-500">Avg Volume (30 days)</div>
                        <div className="text-xl font-semibold my-1">{avgVol30 ? Number(avgVol30).toLocaleString() : "—"}</div>
                        <div className={`text-sm ${avgVol30 > 50000 ? "text-green-600" : "text-red-600"}`}>{avgVol30 > 50000 ? "High" : "Low"}</div>
                        <div className="mt-2 text-[11px] border-t border-gray-200 pt-1 text-gray-500">Higher volume indicates better liquidity.</div>
                    </div>
                </Animate>
            </div>

            {/* AI Insights */}
            <Animate className="flex-1">
                <div className="animation-border p-[2px] rounded-[13px]">
                    <div className="p-[10px] shadow-sm shadow-blue-300 rounded-[12px] bg-white" style={{ borderColor: COLORS.border }}>
                        <h3 className="text-lg font-semibold mb-3" style={{ color: COLORS.titleText }}>📊 Insights</h3>
                        <ul>{renderedInsights}</ul>
                    </div>
                </div>
            </Animate>
        </div>
    );
};

export default HistoricalDashboard;
