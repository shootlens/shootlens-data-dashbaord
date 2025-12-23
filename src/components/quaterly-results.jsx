import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Legend,
  Tooltip,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { COLORS } from "../constants";
import { RxCross2 } from "react-icons/rx";
import { MdOpenInFull } from "react-icons/md"


ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Legend,
  Tooltip
);

const QuarterlyResultsDashboard = ({ quarterlyData, quarterlyHoldingData }) => {
  const [activeTab, setActiveTab] = useState("results"); // 'results' | 'holding'
  const [fullscreenChart, setFullscreenChart] = useState(null);

  if (!quarterlyData || !Array.isArray(quarterlyData)) {
    return <p className="text-center text-gray-500">No data available</p>;
  }

  // -----------------------------
  // Helpers
  // -----------------------------
  const parseNum = (v) => {
    if (v == null) return 0;
    if (typeof v === "number") return v;
    const cleaned = String(v).replace(/,/g, "").replace("%", "").trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  const computeSeriesStats = (series = []) => {
    const vals = series.filter((v) => v != null && isFinite(v));
    if (!vals.length) return null;

    const first = vals[0];
    const last = vals[vals.length - 1];
    const changeAbs = last - first;
    const changePct = first !== 0 ? (changeAbs / first) * 100 : 0;

    const periods = vals.length - 1;
    const cagr =
      first > 0 && periods > 0
        ? (Math.pow(last / first, 1 / periods) - 1) * 100
        : 0;

    const mean =
      vals.reduce((sum, v) => sum + v, 0) / Math.max(1, vals.length);
    const variance =
      vals.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) /
      Math.max(1, vals.length);
    const std = Math.sqrt(variance);

    let numUp = 0;
    let numDown = 0;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[i - 1]) numUp++;
      else if (vals[i] < vals[i - 1]) numDown++;
    }

    let maxVal = vals[0];
    let minVal = vals[0];
    let maxIdx = 0;
    let minIdx = 0;
    vals.forEach((v, idx) => {
      if (v > maxVal) {
        maxVal = v;
        maxIdx = idx;
      }
      if (v < minVal) {
        minVal = v;
        minIdx = idx;
      }
    });

    return {
      first,
      last,
      changeAbs,
      changePct,
      cagr,
      std,
      numUp,
      numDown,
      maxVal,
      minVal,
      maxIdx,
      minIdx,
      nValid: vals.length,
    };
  };

  const meanSafe = (stats) => {
    if (!stats || !stats.nValid) return 0;
    const approxSum =
      stats.first +
      stats.last +
      (stats.maxVal || 0) +
      (stats.minVal || 0);
    return approxSum / Math.max(1, 4);
  };

  const classifyTrend = (stats, label) => {
    if (!stats || stats.nValid < 2) return null;

    const { cagr, changePct, std, last, first } = stats;
    let tone = "neutral";
    let color = "#f59e0b";
    let bgColor = "rgba(245,158,11,0.12)";
    let text = `${label} trend is mixed over the available periods.`;

    const falling = last < first && cagr <= 0;

    if (cagr >= 10 && changePct > 40 && std < Math.abs(meanSafe(stats) * 0.6)) {
      tone = "bullish";
      color = "#16a34a";
      bgColor = "rgba(22,163,74,0.1)";
      text = `${label} shows strong long-term growth across the available periods.`;
    } else if (falling) {
      tone = "bearish";
      color = "#dc2626";
      bgColor = "rgba(220,38,38,0.08)";
      text = `${label} has weakened over the available periods and needs closer review.`;
    } else if (cagr <= 1 && Math.abs(changePct) < 5) {
      tone = "neutral";
      color = "#6b7280";
      bgColor = "rgba(156,163,175,0.08)";
      text = `${label} is broadly flat over the available periods.`;
    }

    return { tone, color, bgColor, text };
  };

  // Special classifier for CFO vs Net Profit (using ratio series)
  const classifyCfoVsNetProfit = (ratioSeries = []) => {
    const validRatios = (ratioSeries || []).filter(
      (v) => v != null && isFinite(v)
    );
    if (!validRatios.length) return null;

    const avgRatio =
      validRatios.reduce((s, v) => s + v, 0) / validRatios.length;
    const last = validRatios[validRatios.length - 1];

    if (avgRatio >= 1 && last >= 1) {
      return {
        tone: "bullish",
        color: "#16a34a",
        bgColor: "rgba(22,163,74,0.1)",
        text: "Earnings quality is strong – operating cash flows broadly match or exceed reported net profit across the period.",
      };
    }
    if (avgRatio >= 0.7) {
      return {
        tone: "neutral",
        color: "#f59e0b",
        bgColor: "rgba(245,158,11,0.12)",
        text: "Earnings quality is reasonable – cash conversion is decent but not consistently strong in every quarter.",
      };
    }
    return {
      tone: "bearish",
      color: "#dc2626",
      bgColor: "rgba(220,38,38,0.08)",
      text: "Earnings quality looks weak – operating cash flows lag reported net profit in many quarters.",
    };
  };

  // Special classifier for Interest Coverage
  const classifyInterestCoverage = (icSeries) => {
    const vals = (icSeries || []).filter((v) => v != null && isFinite(v));
    if (!vals.length) return null;
    const last = vals[vals.length - 1];
    const avg =
      vals.reduce((sum, v) => sum + v, 0) / Math.max(1, vals.length);

    if (last >= 5 && avg >= 4) {
      return {
        tone: "bullish",
        color: "#16a34a",
        bgColor: "rgba(22,163,74,0.1)",
        text: "Debt servicing capacity is strong – operating profit covers interest comfortably across most quarters.",
      };
    }
    if (last >= 2 && avg >= 2) {
      return {
        tone: "neutral",
        color: "#f59e0b",
        bgColor: "rgba(245,158,11,0.12)",
        text: "Interest coverage is adequate but should be watched if leverage or interest rates move up.",
      };
    }
    return {
      tone: "bearish",
      color: "#dc2626",
      bgColor: "rgba(220,38,38,0.08)",
      text: "Interest coverage is low – the company could face pressure servicing its debt if business conditions weaken.",
    };
  };

  // -----------------------------
  // Metric-specific insight builders
  // -----------------------------

  const buildCombinedInsights = (
    salesSeries,
    expensesSeries,
    opSeries,
    opmSeries,
    netSeries,
    labels
  ) => {
    const salesStats = computeSeriesStats(salesSeries);
    const opStats = computeSeriesStats(opSeries);
    const opmStats = computeSeriesStats(opmSeries);

    const insights = [];

    if (salesStats) {
      if (salesStats.changePct > 5) {
        insights.push(
          `Sales in the latest quarter are roughly ${salesStats.changePct.toFixed(
            1
          )}% higher than in the earliest period shown, indicating a healthy top-line expansion over time.`
        );
      } else if (salesStats.changePct < -5) {
        insights.push(
          `Sales are currently below the starting level by about ${Math.abs(
            salesStats.changePct
          ).toFixed(
            1
          )}%, suggesting some cooling in topline growth across the period.`
        );
      } else {
        insights.push(
          `Sales have moved in a relatively narrow band across the quarters, without a very strong upward or downward drift.`
        );
      }
    }

    if (salesStats && opStats) {
      if (opStats.changePct > salesStats.changePct + 5) {
        insights.push(
          `Operating profit has grown faster than sales, pointing to an improvement in underlying profitability and cost efficiency.`
        );
      } else if (opStats.changePct + 5 < salesStats.changePct) {
        insights.push(
          `Sales growth has outpaced operating profit, indicating some margin pressure despite revenue expansion.`
        );
      } else {
        insights.push(
          `Sales and operating profit have broadly moved together, keeping operating profitability largely stable over the period.`
        );
      }
    }

    if (opmStats && labels[opmStats.maxIdx] && labels[opmStats.minIdx]) {
      insights.push(
        `The strongest margin phase in this history appears around ${labels[
        opmStats.maxIdx
        ]}, while a softer patch in profitability shows up near ${labels[opmStats.minIdx]
        }.`
      );
    }

    const positiveSpreadCount = salesSeries.filter(
      (v, i) => v > (expensesSeries[i] || 0)
    ).length;
    if (positiveSpreadCount > salesSeries.length * 0.7) {
      insights.push(
        `In most quarters, revenue comfortably stayed above expenses, keeping operations solidly profitable at the operating level.`
      );
    } else if (positiveSpreadCount < salesSeries.length * 0.5) {
      insights.push(
        `A fair number of quarters show revenue not far from expenses, indicating phases where operating profitability was tight.`
      );
    }

    return insights;
  };

  const buildOpmInsights = (opmSeries, labels) => {
    const stats = computeSeriesStats(opmSeries);
    if (!stats) return [];

    const insights = [];
    const volBase = Math.abs(meanSafe(stats));

    if (stats.changePct > 3) {
      insights.push(
        `Operating margins are higher now than at the start, up by about ${stats.changePct.toFixed(
          1
        )} percentage points over the available quarters.`
      );
    } else if (stats.changePct < -3) {
      insights.push(
        `Operating margins have drifted down over time, lower by roughly ${Math.abs(
          stats.changePct
        ).toFixed(1)} percentage points versus the earliest quarter.`
      );
    } else {
      insights.push(
        `Operating margins have hovered around similar levels across the quarters, with no major structural shift in profitability.`
      );
    }

    if (volBase > 0 && stats.std > volBase * 0.6) {
      insights.push(
        `Quarter-to-quarter margin swings are quite noticeable, which means profitability is somewhat sensitive to cost or pricing changes.`
      );
    } else {
      insights.push(
        `Margin volatility is moderate, suggesting a reasonably stable operating profile despite normal business fluctuations.`
      );
    }

    if (labels[stats.maxIdx] && labels[stats.minIdx]) {
      insights.push(
        `The best margin phase shows up around ${labels[stats.maxIdx]}, while a weaker margin patch appears near ${labels[stats.minIdx]}.`
      );
    }

    return insights;
  };

  const buildEpsInsights = (epsSeries, epsGrowthSeries, labels) => {
    const epsStats = computeSeriesStats(epsSeries);
    const epsGrowthStats = computeSeriesStats(epsGrowthSeries || []);
    if (!epsStats) return [];

    const insights = [];

    if (epsStats.changePct > 10) {
      insights.push(
        `Earnings per share are meaningfully higher now than at the start, up by about ${epsStats.changePct.toFixed(
          1
        )}%.`
      );
    } else if (epsStats.changePct < -10) {
      insights.push(
        `Earnings per share have declined over the period, lower by roughly ${Math.abs(
          epsStats.changePct
        ).toFixed(1)}% versus the earliest quarter.`
      );
    } else {
      insights.push(
        `EPS has stayed within a relatively tight range, without a very strong long-term up or down move.`
      );
    }

    if (epsGrowthSeries && epsGrowthSeries.length > 1) {
      const positives = epsGrowthSeries.filter((v) => v > 0).length;
      const negatives = epsGrowthSeries.filter((v) => v < 0).length;
      if (positives > negatives) {
        insights.push(
          `More quarters show positive EPS growth than declines, which supports a constructive earnings trend.`
        );
      } else if (negatives > positives) {
        insights.push(
          `There are more quarters with negative EPS growth than positive ones, indicating an uneven earnings trajectory.`
        );
      } else {
        insights.push(
          `Positive and negative EPS growth quarters are fairly balanced, reflecting a mixed earnings cycle.`
        );
      }
    }

    if (labels[epsStats.maxIdx] && labels[epsStats.minIdx]) {
      insights.push(
        `EPS peaks around ${labels[epsStats.maxIdx]}, while one of the softer earnings phases appears near ${labels[epsStats.minIdx]}.`
      );
    }

    return insights;
  };

  const buildEpsGrowthInsights = (epsGrowthSeries, labels) => {
    const stats = computeSeriesStats(epsGrowthSeries || []);
    if (!stats) return [];

    const insights = [];

    const positives = epsGrowthSeries.filter((v) => v > 0).length;
    const negatives = epsGrowthSeries.filter((v) => v < 0).length;

    if (positives > negatives) {
      insights.push(
        `Across the history shown, EPS has grown in more quarters than it has declined, signalling overall positive earnings momentum.`
      );
    } else if (negatives > positives) {
      insights.push(
        `EPS growth has been negative in more quarters than positive ones, which points to a patchy or weakening earnings cycle.`
      );
    } else {
      insights.push(
        `The number of positive and negative EPS growth quarters is similar, indicating a stop-start pattern in earnings momentum.`
      );
    }

    if (stats && labels[stats.maxIdx]) {
      insights.push(
        `One of the strongest bursts of EPS growth appears around ${labels[stats.maxIdx]}, standing out versus other periods.`
      );
    }

    if (Math.abs(stats.std) > Math.abs(meanSafe(stats)) * 0.7) {
      insights.push(
        `Growth rates are quite volatile from quarter to quarter, so investors should focus more on the long-term direction than any single print.`
      );
    } else {
      insights.push(
        `EPS growth swings are present but not extreme, suggesting a relatively steady earnings progression.`
      );
    }

    return insights;
  };

  const buildNetProfitOtherInsights = (netSeries, otherSeries, labels) => {
    const npStats = computeSeriesStats(netSeries);
    const ratios = netSeries.map((np, i) =>
      np !== 0 ? otherSeries[i] / Math.abs(np) : 0
    );
    const validRatios = ratios.filter((v) => isFinite(v) && v >= 0);
    const insights = [];

    if (npStats) {
      if (npStats.changePct > 10) {
        insights.push(
          `Net profit has improved over the period, ending roughly ${npStats.changePct.toFixed(
            1
          )}% higher than the earliest quarter shown.`
        );
      } else if (npStats.changePct < -10) {
        insights.push(
          `Net profit is lower now than at the start of the series, signalling some pressure on bottom-line profitability.`
        );
      } else {
        insights.push(
          `Net profit has oscillated without a very strong long-term up or down drift.`
        );
      }
    }

    if (validRatios.length) {
      const avgRatio =
        validRatios.reduce((s, v) => s + v, 0) / validRatios.length;
      if (avgRatio < 0.1) {
        insights.push(
          `Other income contributes only a small portion of net profit on average, so earnings are largely driven by core operations.`
        );
      } else if (avgRatio < 0.3) {
        insights.push(
          `Other income forms a meaningful but not dominant share of net profit, adding a helpful cushion in several quarters.`
        );
      } else {
        insights.push(
          `A sizeable chunk of net profit is explained by other income, indicating that non-operating items play an important role in the bottom line.`
        );
      }
    }

    if (npStats && labels[npStats.maxIdx] && labels[npStats.minIdx]) {
      insights.push(
        `One of the strongest profit phases appears around ${labels[npStats.maxIdx]}, while a weaker stretch is visible near ${labels[npStats.minIdx]}.`
      );
    }

    return insights;
  };

  const buildRevExpInsights = (coreProfitSeries, salesSeries, labels) => {
    const stats = computeSeriesStats(coreProfitSeries);
    if (!stats) return [];

    const insights = [];
    const profitableQuarters = coreProfitSeries.filter((v) => v > 0).length;

    if (stats.changePct > 10) {
      insights.push(
        `The gap between revenue and expenses has widened over time, with core operating profit ending higher than where it started.`
      );
    } else if (stats.changePct < -10) {
      insights.push(
        `The spread between revenue and expenses has narrowed versus the first quarter, signalling some pressure on core operating profitability.`
      );
    } else {
      insights.push(
        `The revenue–expense gap has moved within a moderate band, keeping core profitability broadly stable across the period.`
      );
    }

    if (profitableQuarters > coreProfitSeries.length * 0.7) {
      insights.push(
        `Most quarters show positive core profit (revenue above expenses), which is a good sign for the strength of the underlying business.`
      );
    } else if (profitableQuarters < coreProfitSeries.length * 0.5) {
      insights.push(
        `A notable number of quarters have thin or negative core profit, highlighting periods where costs were close to or above revenue.`
      );
    }

    if (stats && labels[stats.maxIdx] && labels[stats.minIdx]) {
      insights.push(
        `The healthiest core profitability phase appears around ${labels[stats.maxIdx]}, while a more challenging stretch is visible near ${labels[stats.minIdx]}.`
      );
    }

    return insights;
  };

  const buildOpVsNpInsights = (opSeries, netSeries, labels) => {
    const diffSeries = opSeries.map((v, i) => v - (netSeries[i] || 0));
    const diffStats = computeSeriesStats(diffSeries);
    if (!diffStats) return [];

    const insights = [];
    const ratioSeries = opSeries.map((op, i) =>
      op !== 0 ? (netSeries[i] || 0) / op : 0
    );
    const validRatios = ratioSeries.filter((v) => isFinite(v) && v >= 0);
    const avgRatio =
      validRatios.length > 0
        ? validRatios.reduce((s, v) => s + v, 0) / validRatios.length
        : null;

    if (avgRatio != null) {
      if (avgRatio >= 0.8) {
        insights.push(
          `Net profit generally tracks operating profit well, meaning interest, tax and other items do not erode too much of the operating earnings.`
        );
      } else if (avgRatio >= 0.5) {
        insights.push(
          `On average, net profit converts to a moderate share of operating profit, reflecting a normal burden from interest, tax and other items.`
        );
      } else {
        insights.push(
          `Net profit captures only a smaller portion of operating profit in many quarters, suggesting heavier drag from interest, tax or exceptional items.`
        );
      }
    }

    if (diffStats && labels[diffStats.maxIdx] && labels[diffStats.minIdx]) {
      insights.push(
        `The gap between operating and net profit is most favourable around ${labels[diffStats.maxIdx]}, while it is relatively tight near ${labels[diffStats.minIdx]}.`
      );
    }

    return insights;
  };

  const buildCfoInsights = (cfoToNpRatio, labels) => {
    const stats = computeSeriesStats(cfoToNpRatio || []);
    if (!stats) {
      return [
        "Insufficient CFO data available in this period to derive meaningful cash-flow based insights.",
      ];
    }

    const insights = [];
    const avgRatio =
      (cfoToNpRatio || [])
        .filter((v) => v != null && isFinite(v))
        .reduce((s, v, _, arr) => s + v / arr.length, 0) || 0;

    if (avgRatio >= 1) {
      insights.push(
        `Over the long term, operating cash flows have, on average, matched or exceeded reported net profit – a strong sign of earnings quality.`
      );
    } else if (avgRatio >= 0.7) {
      insights.push(
        `Cash generation is generally in line with reported profits, though not every quarter shows perfect conversion.`
      );
    } else {
      insights.push(
        `Across the available quarters, operating cash flows lag reported net profit, signalling that some of the earnings are not fully backed by cash.`
      );
    }

    if (stats.changePct > 10) {
      insights.push(
        `Cash conversion of profits improves towards the later quarters, with CFO-to-net-profit ratios trending upward versus the starting period.`
      );
    } else if (stats.changePct < -10) {
      insights.push(
        `CFO-to-net-profit ratios soften towards the end of the series, implying weaker cash backing for the most recent earnings.`
      );
    }

    if (labels[stats.maxIdx] && labels[stats.minIdx]) {
      insights.push(
        `The strongest cash conversion phase appears around ${labels[stats.maxIdx]}, while a weaker cash-backing stretch shows up near ${labels[stats.minIdx]}.`
      );
    }

    return insights;
  };

  const buildInterestCoverageInsights = (icSeries, labels) => {
    const stats = computeSeriesStats(icSeries || []);
    if (!stats) return [];

    const insights = [];

    if (stats.changePct > 10) {
      insights.push(
        `Interest coverage has improved over the series, with the latest quarter covering interest more comfortably than the earliest one.`
      );
    } else if (stats.changePct < -10) {
      insights.push(
        `Interest coverage has eased compared to the start, indicating that debt servicing headroom has reduced over time.`
      );
    } else {
      insights.push(
        `Interest coverage has broadly oscillated around a similar band, without a dramatic long-term shift in debt-servicing strength.`
      );
    }

    const vals = (icSeries || []).filter((v) => v != null && isFinite(v));
    if (vals.length) {
      const safeQuarters = vals.filter((v) => v >= 3).length;
      if (safeQuarters > vals.length * 0.7) {
        insights.push(
          `Most quarters show interest coverage above 3x, which is typically viewed as a comfortable buffer by many analysts.`
        );
      } else if (safeQuarters < vals.length * 0.4) {
        insights.push(
          `Several quarters sit below the 3x coverage mark, suggesting periods where leverage or interest burden was on the higher side.`
        );
      }
    }

    if (labels[stats.maxIdx] && labels[stats.minIdx]) {
      insights.push(
        `The strongest coverage phase appears around ${labels[stats.maxIdx]}, while a more stretched phase emerges near ${labels[stats.minIdx]}.`
      );
    }

    return insights;
  };

  // -----------------------------
  // Build data map from 2D array
  // -----------------------------
  const dataMap = {};
  quarterlyData.forEach((row) => {
    const category = row[0];
    const values = row.slice(1);
    dataMap[category] = values;
  });

  // Extract labels (quarters)
  const quarterlyLabels = quarterlyData[0].slice(1);

  const getSeries = (key) => (dataMap[key] || []).map(parseNum);

  // Income statement series
  const sales = getSeries("Sales");
  const expenses = getSeries("Expenses");
  const operatingProfit = getSeries("Operating Profit");
  const opm = getSeries("OPM %");
  const otherIncome = getSeries("Other Income");
  const netProfit = getSeries("Net Profit");
  const eps = getSeries("EPS in Rs");

  // Try to derive CFO & Interest from likely row names
  const getSeriesForKeys = (keys) => {
    for (const k of keys) {
      if (dataMap[k]) return dataMap[k].map(parseNum);
    }
    // fallback to zeros if not available
    return quarterlyLabels.map(() => 0);
  };

  const cfo = getSeriesForKeys([
    "Cash from Operating Activity",
    "Cash from Operating Activities",
    "Net Cash from Operating Activities",
    "CFO",
  ]);

  const interestExpense = getSeriesForKeys([
    "Interest",
    "Interest Cost",
    "Interest Expenses",
    "Finance Cost",
    "Finance Costs",
  ]);

  // Interest coverage: Operating Profit / Interest Expense
  const interestCoverage = operatingProfit.map((op, i) => {
    const interest = interestExpense[i] || 0;
    if (interest <= 0) return null;
    return op / interest;
  });

  // EPS growth %
  const epsGrowthSeries = eps.map((v, i) =>
    i === 0 || eps[i - 1] === 0 ? 0 : ((v - eps[i - 1]) / eps[i - 1]) * 100
  );

  // CFO / Net Profit ratio series
  const cfoToNpRatio = cfo.map((cf, i) =>
    netProfit[i] ? cf / netProfit[i] : 0
  );

  // -----------------------------
  // Chart options
  // -----------------------------
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom" },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { title: { display: true, text: "₹ / %" } },
    },
  };

  // -----------------------------
  // CHART DATASETS
  // -----------------------------

  // 1️⃣ Combined Chart
  const mainData = {
    labels: quarterlyLabels,
    datasets: [
      {
        type: "bar",
        label: "Sales (₹ Cr)",
        data: sales,
        backgroundColor: "rgba(59,130,246,0.6)",
        borderRadius: 8,
      },
      {
        type: "bar",
        label: "Expenses (₹ Cr)",
        data: expenses,
        backgroundColor: "rgba(239,68,68,0.6)",
        borderRadius: 8,
      },
      {
        type: "bar",
        label: "Operating Profit (₹ Cr)",
        data: operatingProfit,
        backgroundColor: "rgba(34,197,94,0.6)",
        borderRadius: 8,
      },
      {
        type: "line",
        label: "OPM %",
        data: opm,
        borderColor: "#f59e0b",
        borderWidth: 2,
        tension: 0.3,
        yAxisID: "percentage",
      },
      {
        type: "bar",
        label: "Net Profit (₹ Cr)",
        data: netProfit,
        backgroundColor: "rgba(94,246,82,0.8)",
        borderRadius: 8,
      },
    ],
  };

  // 2️⃣ OPM % Trend
  const opmData = {
    labels: quarterlyLabels,
    datasets: [
      {
        label: "Operating Profit Margin (%)",
        data: opm,
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.2)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // 3️⃣ Net Profit vs Other Income
  const profitData = {
    labels: quarterlyLabels,
    datasets: [
      {
        label: "Net Profit (₹ Cr)",
        data: netProfit,
        backgroundColor: "rgba(34,197,94,0.6)",
        borderRadius: 8,
      },
      {
        label: "Other Income (₹ Cr)",
        data: otherIncome,
        backgroundColor: "rgba(168,85,247,0.6)",
        borderRadius: 8,
      },
    ],
  };

  // 4️⃣ EPS Trend
  const epsData = {
    labels: quarterlyLabels,
    datasets: [
      {
        label: "Earnings Per Share (EPS)",
        data: eps,
        borderColor: "#6366F1",
        backgroundColor: "rgba(99,102,241,0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // 5️⃣ Revenue vs Expenses
  const revenueVsExpenses = {
    labels: quarterlyLabels,
    datasets: [
      {
        label: "Revenue (₹ Cr)",
        data: sales,
        backgroundColor: "rgba(37,99,235,0.6)",
        borderRadius: 8,
      },
      {
        label: "Expenses (₹ Cr)",
        data: expenses,
        backgroundColor: "rgba(239,68,68,0.6)",
        borderRadius: 8,
      },
    ],
  };

  // 6️⃣ Operating Profit vs Net Profit
  const opVsNetProfit = {
    labels: quarterlyLabels,
    datasets: [
      {
        label: "Operating Profit (₹ Cr)",
        data: operatingProfit,
        backgroundColor: "rgba(16,185,129,0.6)",
        borderRadius: 8,
      },
      {
        label: "Net Profit (₹ Cr)",
        data: netProfit,
        backgroundColor: "rgba(234,179,8,0.6)",
        borderRadius: 8,
      },
    ],
  };

  // 7️⃣ EPS Growth (Earnings Power Trend)
  const epsGrowth = {
    labels: quarterlyLabels,
    datasets: [
      {
        label: "EPS Growth (%)",
        data: epsGrowthSeries,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.2)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  // 8️⃣ CFO vs Net Profit
  const cfoVsNetProfitData = {
    labels: quarterlyLabels,
    datasets: [
      {
        type: "bar",
        label: "Cash Flow from Operations (₹ Cr)",
        data: cfo,
        backgroundColor: "rgba(37,99,235,0.6)",
        borderRadius: 8,
      },
      {
        type: "bar",
        label: "Net Profit (₹ Cr)",
        data: netProfit,
        backgroundColor: "rgba(16,185,129,0.6)",
        borderRadius: 8,
      },
    ],
  };

  // 9️⃣ Interest Coverage Ratio
  const interestCoverageData = {
    labels: quarterlyLabels,
    datasets: [
      {
        label: "Interest Coverage (x)",
        data: interestCoverage,
        borderColor: "#7c3aed",
        backgroundColor: "rgba(124,58,237,0.15)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  // -----------------------------
  // Stats & Result classification
  // -----------------------------
  const salesStats = computeSeriesStats(sales);
  const opStats = computeSeriesStats(operatingProfit);
  const opmStats = computeSeriesStats(opm);
  const epsStats = computeSeriesStats(eps);
  const epsGrowthStats = computeSeriesStats(epsGrowthSeries);
  const npStats = computeSeriesStats(netProfit);

  const mainResult = classifyTrend(salesStats, "Revenue & profitability");
  const opmResult = classifyTrend(opmStats, "Operating margin");
  const epsResult = classifyTrend(epsStats, "Earnings per share");
  const epsGrowthResult = classifyTrend(
    epsGrowthStats,
    "EPS growth momentum"
  );
  const npOtherResult = classifyTrend(npStats, "Net profit pattern");
  const revExpResult = classifyTrend(
    computeSeriesStats(
      sales.map((s, i) => s - (expenses[i] || 0))
    ),
    "Core profitability"
  );
  const opVsNpResult = classifyTrend(
    computeSeriesStats(
      operatingProfit.map((v, i) => v - (netProfit[i] || 0))
    ),
    "Operating vs reported profit gap"
  );
  const cfoResult = classifyCfoVsNetProfit(cfoToNpRatio);
  const icResult = classifyInterestCoverage(interestCoverage);

  // -----------------------------
  // Chart-specific natural insights
  // -----------------------------

  const combinedInsights = buildCombinedInsights(
    sales,
    expenses,
    operatingProfit,
    opm,
    netProfit,
    quarterlyLabels
  );

  const opmInsights = buildOpmInsights(opm, quarterlyLabels);

  const epsInsights = buildEpsInsights(
    eps,
    epsGrowthSeries,
    quarterlyLabels
  );

  const epsGrowthInsights = buildEpsGrowthInsights(
    epsGrowthSeries,
    quarterlyLabels
  );

  const npInsights = buildNetProfitOtherInsights(
    netProfit,
    otherIncome,
    quarterlyLabels
  );

  const coreProfitSeries = sales.map(
    (s, i) => s - (expenses[i] || 0)
  );
  const revExpInsights = buildRevExpInsights(
    coreProfitSeries,
    sales,
    quarterlyLabels
  );

  const opVsNpInsights = buildOpVsNpInsights(
    operatingProfit,
    netProfit,
    quarterlyLabels
  );

  const cfoInsights = buildCfoInsights(
    cfoToNpRatio,
    quarterlyLabels
  );

  const icInsights = buildInterestCoverageInsights(
    interestCoverage,
    quarterlyLabels
  );

  // Optional advanced stats for a separate section
  const advancedMetrics = [
    { label: "Sales", stats: salesStats },
    { label: "Operating Profit", stats: opStats },
    { label: "Net Profit", stats: npStats },
    { label: "EPS", stats: epsStats },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartCard
          title="Sales, Expenses, Operating Profit, OPM %"
          takeaway="Shows how revenue, costs, operating profit and margins have evolved across all reported quarters."
          result={mainResult}
          chart={<Bar data={mainData} options={options} />}
          insights={combinedInsights}
          onFullscreen={() =>
            setFullscreenChart({
              title: "Sales, Expenses, Operating Profit, OPM %",
              chart: <Bar data={mainData} options={options} />,
            })
          }
        />

        <ChartCard
          title="Operating Profit Margin (%)"
          takeaway="Tracks the long-term behaviour of operating profit margin across quarters."
          result={opmResult}
          chart={<Line data={opmData} options={options} />}
          insights={opmInsights}
          onFullscreen={() =>
            setFullscreenChart({
              title: "Operating Profit Margin (%)",
              chart: <Line data={opmData} options={options} />,
            })
          }
        />

        <ChartCard
          title="Earnings Per Share (EPS)"
          takeaway="Represents how much profit is earned per share across all available quarters."
          result={epsResult}
          chart={<Line data={epsData} options={options} />}
          insights={epsInsights}
          onFullscreen={() =>
            setFullscreenChart({
              title: "Earnings Per Share (EPS)",
              chart: <Line data={epsData} options={options} />,
            })
          }
        />

        <ChartCard
          title="EPS Growth (Earnings Power Trend)"
          takeaway="Shows quarter-on-quarter EPS growth, reflecting momentum in earnings power over time."
          result={epsGrowthResult}
          chart={<Line data={epsGrowth} options={options} />}
          insights={epsGrowthInsights}
          onFullscreen={() =>
            setFullscreenChart({
              title: "EPS Growth (Earnings Power Trend)",
              chart: <Line data={epsGrowth} options={options} />,
            })
          }
        />

        <ChartCard
          title="Net Profit vs Other Income"
          takeaway="Compares core net profit with other income to highlight the dependence on non-operating items."
          result={npOtherResult}
          chart={<Bar data={profitData} options={options} />}
          insights={npInsights}
          onFullscreen={() =>
            setFullscreenChart({
              title: "Net Profit vs Other Income",
              chart: <Bar data={profitData} options={options} />,
            })
          }
        />

        <ChartCard
          title="Revenue vs Expenses (Core Profitability View)"
          takeaway="Contrasts revenue and expenses to show how core profitability has behaved over the full period."
          result={revExpResult}
          chart={<Bar data={revenueVsExpenses} options={options} />}
          insights={revExpInsights}
          onFullscreen={() =>
            setFullscreenChart({
              title: "Revenue vs Expenses (Core Profitability View)",
              chart: <Bar data={revenueVsExpenses} options={options} />,
            })
          }
        />

        <ChartCard
          title="Operating Profit vs Net Profit"
          takeaway="Highlights how closely reported net profit tracks operating profit over time."
          result={opVsNpResult}
          chart={<Bar data={opVsNetProfit} options={options} />}
          insights={opVsNpInsights}
          onFullscreen={() =>
            setFullscreenChart({
              title: "Operating Profit vs Net Profit",
              chart: <Bar data={opVsNetProfit} options={options} />,
            })
          }
        />
        <ChartCard
          title="CFO vs Net Profit (Earnings Quality)"
          takeaway="Shows how consistently reported net profit is supported by operating cash flows over all quarters."
          result={cfoResult}
          chart={<Bar data={cfoVsNetProfitData} options={options} />}
          insights={cfoInsights}
          onFullscreen={() =>
            setFullscreenChart({
              title: "CFO vs Net Profit (Earnings Quality)",
              chart: <Bar data={cfoVsNetProfitData} options={options} />,
            })
          }
        />
        <ChartCard
          title="Interest Coverage Ratio (Debt Servicing Strength)"
          takeaway="Tracks how many times operating profit covers interest expense across the available quarters."
          result={icResult}
          chart={<Line data={interestCoverageData} options={options} />}
          insights={icInsights}
          onFullscreen={() =>
            setFullscreenChart({
              title: "Interest Coverage Ratio (Debt Servicing Strength)",
              chart: <Line data={interestCoverageData} options={options} />,
            })
          }
        />
        <div>
          <div
            className="bg-white rounded-[10px] border p-4 overflow-x-auto"
            style={{ borderColor: COLORS.border }}
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              📊 Advanced Long-Term Analytics (Optional View)
            </h3>
            <table className="min-w-full text-xs mt-4">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="px-2 py-1">Metric</th>
                  <th className="px-2 py-1 text-right">CAGR (%)</th>
                  <th className="px-2 py-1 text-right">Change (%)</th>
                  <th className="px-2 py-1 text-right">Ups vs Downs</th>
                </tr>
              </thead>
              <tbody>
                {advancedMetrics.map(({ label, stats }) => (
                  <tr key={label}>
                    <td className="px-2 py-1 text-gray-700">{label}</td>
                    <td className="px-2 py-1 text-right text-gray-700">
                      {stats ? stats.cagr.toFixed(1) : "--"}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-700">
                      {stats ? stats.changePct.toFixed(1) : "--"}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-700">
                      {stats
                        ? `${stats.numUp} up / ${stats.numDown} down`
                        : "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Optional advanced section */}


      {/* Fullscreen Modal */}
      {fullscreenChart && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[90vh] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 flex-1">
                {fullscreenChart.title}
              </h2>
              <button
                onClick={() => setFullscreenChart(null)}
                className=" cursor-pointer"
              >
                <RxCross2 />
              </button>
            </div>
            <div className="flex-1">
              <div className="w-full h-full">{fullscreenChart.chart}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ChartCard = ({
  title,
  chart,
  takeaway,
  result,
  insights = [],
  onFullscreen,
}) => (
  <div
    className="bg-white rounded-[10px] border p-4 flex flex-col"
    style={{ borderColor: COLORS.border }}
  >
    <div className="flex items-start justify-between mb-2 gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {takeaway && (
          <p className="text-[11px] text-gray-600 mb-2">{takeaway}</p>
        )}
      </div>
      {onFullscreen && (
        <button
          onClick={onFullscreen}
          className="text-xs p-1 rounded-md border border-gray-300 hover:bg-gray-50 cursor-pointer"
        >
          <MdOpenInFull />

        </button>
      )}
    </div>

    {result && (
      <div
        className="inline-flex items-center text-[11px] font-medium px-2 py-1 rounded-[5px] mb-2"
        style={{
          backgroundColor: result.bgColor,
          color: result.color,
        }}
      >
        {result.text}
      </div>
    )}

    <div className="h-80 mb-2">{chart}</div>

    {insights && insights.length > 0 && (
      <div className="mt-1">
        <div className="text-[11px] font-semibold text-gray-700 mb-1">
          Key observations
        </div>
        <ul className="text-[11px] text-gray-600 list-disc ml-4 space-y-[2px]">
          {insights.slice(0, 4).map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

export default QuarterlyResultsDashboard;
