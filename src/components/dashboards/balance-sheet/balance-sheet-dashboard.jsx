import { useMemo, useState } from "react";
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
  RadialLinearScale,
} from "chart.js";
import { Doughnut, Line, Bar, Radar } from "react-chartjs-2";
import { COLORS, getHeatColor } from "../../../constants";
import generateBalanceSheetInsights from "../../../utils/nlpBalanceSheet";
import ChartCard from "./chart-card";
import MetricCards from "./metric-cards";
import "../../../App.css";
import SummaryPanel from "./summary";
import FullScreenModal from "../../common/full-screen-modal";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale
);

const normalizeKey = (str = "") => String(str || "").toLowerCase().trim();

const parseNumber = (val) => {
  if (val == null || val === "") return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val)
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "")
    .trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const extractYear = (label) => {
  const match = String(label).match(/\d{4}/);
  return match ? parseInt(match[0], 10) : null;
};

const ALIASES = {
  "fixed assets": [
    "fixed assets",
    "fixed assets (net)",
    "property, plant & equipment",
    "property plant and equipment",
    "tangible assets",
    "ppe",
  ],
  cwip: ["cwip", "capital work in progress", "capital work-in-progress"],
  investments: [
    "investments",
    "non-current investments",
    "current investments",
    "other investments",
  ],
  "other assets": [
    "other assets",
    "other non-current assets",
    "other current assets",
    "miscellaneous assets",
  ],
  "other liabilities": [
    "other liabilities",
    "other current liabilities",
    "current liabilities",
    "other non-current liabilities",
  ],
  "equity capital": ["equity capital", "share capital", "equity share capital"],
  reserves: ["reserves", "reserves & surplus", "reserves and surplus"],
  borrowings: ["borrowings", "long-term borrowings", "total borrowings"],
};

const buildTrendSummary = (yoySeries, label) => {
  if (!yoySeries || yoySeries.length === 0) return "";
  const vals = yoySeries.filter((v) => isFinite(v));
  if (!vals.length) return "";
  const last = vals[vals.length - 1];
  const max = Math.max(...vals);
  const min = Math.min(...vals);

  if (last > 15) return `${label} grew strongly in the latest year.`;
  if (last < -10) return `${label} dropped sharply in the latest year.`;
  if (max > 20 && min < -10)
    return `${label} shows high volatility over the years.`;
  if (last > 0 && Math.abs(last) < 8)
    return `${label} is growing steadily with mild swings.`;
  if (last < 0 && Math.abs(last) < 8)
    return `${label} declined slightly in the latest year.`;
  return `${label} trend is mixed with moderate changes.`;
};

const BalanceSheetDashboard = ({ balance_sheet }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState(null);

  if (!Array.isArray(balance_sheet) || balance_sheet.length < 2)
    return <div className="p-6">No balance sheet data</div>;

  const headers = balance_sheet[0].slice(1);
  const years = headers;

  const isTTMLabel = (label) =>
    normalizeKey(label) === "ttm" ||
    normalizeKey(label) === "trailing twelve months";

  const hasTTM = years.some((y) => isTTMLabel(y));

  // full-year indices & labels (excluding TTM)
  const fullYearIndices = years
    .map((label, idx) => (!isTTMLabel(label) ? idx : null))
    .filter((v) => v !== null);
  const fullYearLabels = fullYearIndices.map((i) => years[i]);

  // latestIdx: use last full-year if TTM exists
  const latestIdx = hasTTM
    ? fullYearIndices.length > 0
      ? fullYearIndices[fullYearIndices.length - 1]
      : Math.max(0, years.length - 1)
    : Math.max(0, years.length - 1);

  const lastFullYearIdx =
    fullYearIndices.length > 0
      ? fullYearIndices[fullYearIndices.length - 1]
      : latestIdx;
  const prevFullYearIdx =
    fullYearIndices.length > 1
      ? fullYearIndices[fullYearIndices.length - 2]
      : Math.max(0, lastFullYearIdx - 1);

  // build row map
  const rowMap = useMemo(() => {
    const map = {};
    balance_sheet.slice(1).forEach((r) => {
      map[normalizeKey(r[0])] = r.slice(1).map(parseNumber);
    });
    return map;
  }, [balance_sheet]);

  // Flexible getter with alias matching
  const get = (name) => {
    const baseKey = normalizeKey(name);
    const aliasList = ALIASES[baseKey] || [baseKey];

    for (const alias of aliasList) {
      const nk = normalizeKey(alias);
      if (rowMap[nk]) return rowMap[nk];
    }
    return Array(years.length).fill(0);
  };

  // key metrics series (all columns)
  const totalAssetsSeries = get("total assets");
  const totalLiabilitiesSeries = get("total liabilities");
  const equitySeries = get("equity capital");
  const reservesSeries = get("reserves");
  const borrowingsSeries = get("borrowings");
  const otherLiabilitiesSeries = get("other liabilities");

  // full-year series (exclude TTM)
  const fullSeries = (series) =>
    fullYearIndices.map((i) => series[i] || 0);

  const assetsFull = fullSeries(totalAssetsSeries);
  const liabilitiesFull = fullSeries(totalLiabilitiesSeries);
  const equityFull = fullSeries(equitySeries);
  const reservesFull = fullSeries(reservesSeries);
  const borrowingsFull = fullSeries(borrowingsSeries);
  const otherLiabilitiesFull = fullSeries(otherLiabilitiesSeries);

  const totalAssets = totalAssetsSeries[latestIdx] || 0;
  const totalLiabilities = totalLiabilitiesSeries[latestIdx] || 0;
  const borrowings = borrowingsSeries[latestIdx] || 0;

  const netWorthSeries = years.map(
    (_, i) => (equitySeries[i] || 0) + (reservesSeries[i] || 0)
  );
  const netWorthFull = fullSeries(netWorthSeries);
  const netWorthLatest = netWorthSeries[latestIdx] || 0;

  const debtToEquity = borrowings / Math.max(1, netWorthLatest);
  const equityRatio = netWorthLatest / Math.max(1, totalAssets);

  const lastFullAssets =
    assetsFull.length > 0 ? assetsFull[assetsFull.length - 1] : 0;
  const prevFullAssets =
    assetsFull.length > 1 ? assetsFull[assetsFull.length - 2] : lastFullAssets;
  const totalAssetsGrowth =
    prevFullAssets > 0
      ? ((lastFullAssets - prevFullAssets) / prevFullAssets) * 100
      : 0;

  // helper for CAGR (using full-year series only, based on actual year gap)
  const cagr = (seriesFull, labelsFull) => {
    if (!seriesFull || seriesFull.length < 2) return 0;
    const start = seriesFull[0];
    const end = seriesFull[seriesFull.length - 1];
    if (start <= 0 || end <= 0) return 0;

    const yStart = extractYear(labelsFull[0]);
    const yEnd = extractYear(labelsFull[labelsFull.length - 1]);

    let periods = seriesFull.length - 1; // fallback
    if (yStart && yEnd && yEnd > yStart) {
      periods = yEnd - yStart;
    }

    if (periods <= 0) return 0;
    return (Math.pow(end / start, 1 / periods) - 1) * 100;
  };

  const assetsCagr = cagr(assetsFull, fullYearLabels);
  const liabilitiesCagr = cagr(liabilitiesFull, fullYearLabels);
  const netWorthCagr = cagr(netWorthFull, fullYearLabels);
  const borrowingsCagr = cagr(borrowingsFull, fullYearLabels);
  const reservesCagr = cagr(reservesFull, fullYearLabels);

  // YoY helper (full-year only)
  const yoy = (seriesFull) =>
    seriesFull.map((v, i) =>
      i === 0 || seriesFull[i - 1] === 0
        ? 0
        : ((v - seriesFull[i - 1]) / seriesFull[i - 1]) * 100
    );

  const yoyAssets = yoy(assetsFull);
  const yoyLiabilities = yoy(liabilitiesFull);
  const yoyBorrowings = yoy(borrowingsFull);
  const yoyReserves = yoy(reservesFull);

  const lastYoYAssets =
    yoyAssets.length > 0 ? yoyAssets[yoyAssets.length - 1] : 0;
  const lastYoYLiabilities =
    yoyLiabilities.length > 0 ? yoyLiabilities[yoyLiabilities.length - 1] : 0;
  const lastYoYBorrowings =
    yoyBorrowings.length > 0 ? yoyBorrowings[yoyBorrowings.length - 1] : 0;
  const lastYoYNetWorth =
    yoy(netWorthFull).length > 0 ? yoy(netWorthFull).slice(-1)[0] : 0;

  // NLP AI
  const ai = useMemo(
    () => generateBalanceSheetInsights({ balance_sheet }),
    [balance_sheet]
  );
  const pct = {
    total_assets: ai?.meta?.stats?.total_assets?.pct,
    total_liabilities: ai?.meta?.stats?.total_liabilities?.pct,
    borrowings: ai?.meta?.stats?.borrowings?.pct,
  };

  // chart definitions
  const assetsRows = ["fixed assets", "cwip", "investments", "other assets"];
  const liabilitiesRows = [
    "equity capital",
    "reserves",
    "borrowings",
    "other liabilities",
  ];

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "rgba(200,200,200,0.2)" } },
    },
  };
  const stackedOptions = {
    ...baseOptions,
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, grid: { color: "rgba(200,200,200,0.2)" } },
    },
  };

  const chartMainAssetsTrend = {
    labels: years,
    datasets: [
      {
        label: "Total Assets",
        data: totalAssetsSeries,
        borderColor: "#2563eb",
        backgroundColor: "transparent",
        tension: 0.3,
      },
      {
        label: "Net Worth (Equity + Reserves)",
        data: netWorthSeries,
        borderColor: "#16a34a",
        backgroundColor: "transparent",
        tension: 0.3,
      },
    ],
  };

  const chartMainLiabilitiesTrend = {
    labels: years,
    datasets: [
      {
        label: "Total Liabilities",
        data: totalLiabilitiesSeries,
        borderColor: "#ef4444",
        backgroundColor: "transparent",
        tension: 0.3,
      },
      {
        label: "Borrowings",
        data: borrowingsSeries,
        borderColor: "#f97316",
        backgroundColor: "transparent",
        tension: 0.3,
      },
    ],
  };

  const chartAssetsComposition = {
    labels: years,
    datasets: assetsRows.map((n, i) => ({
      label: n,
      data: get(n),
      backgroundColor: ["#059669", "#f59e0b", "#3b82f6", "#9ca3af"][i],
    })),
  };

  const chartLiabilitiesComposition = {
    labels: years,
    datasets: liabilitiesRows.map((n, i) => ({
      label: n,
      data: get(n),
      backgroundColor: ["#2563eb", "#4f46e5", "#ef4444", "#f97316"][i],
    })),
  };

  const chartNetWorthVsBorrowings = {
    labels: years,
    datasets: [
      {
        label: "Net Worth (Equity + Reserves)",
        data: netWorthSeries,
        borderColor: "#16a34a",
        backgroundColor: "transparent",
        tension: 0.3,
      },
      {
        label: "Borrowings",
        data: borrowingsSeries,
        borderColor: "#ef4444",
        backgroundColor: "transparent",
        tension: 0.3,
      },
    ],
  };

  const chartSolvencyGap = {
    labels: fullYearLabels,
    datasets: [
      {
        label: "Gap (Assets - Liabilities)",
        data: assetsFull.map(
          (v, i) => v - (liabilitiesFull[i] != null ? liabilitiesFull[i] : 0)
        ),
        backgroundColor: "rgba(59,130,246,0.7)",
      },
    ],
  };

  const latestIdxForBreakdown = latestIdx;
  const chartLatestAssets = {
    labels: assetsRows,
    datasets: [
      {
        data: assetsRows.map((n) => get(n)[latestIdxForBreakdown] || 0),
        backgroundColor: ["#059669", "#f59e0b", "#3b82f6", "#9ca3af"],
      },
    ],
  };

  const chartLatestLiabilities = {
    labels: liabilitiesRows,
    datasets: [
      {
        data: liabilitiesRows.map((n) => get(n)[latestIdxForBreakdown] || 0),
        backgroundColor: ["#2563eb", "#4f46e5", "#ef4444", "#f97316"],
      },
    ],
  };

  const chartYoY = {
    labels: fullYearLabels,
    datasets: [
      {
        label: "YoY % Change - Total Assets",
        data: yoyAssets,
        backgroundColor: yoyAssets.map((v) =>
          v >= 0 ? "rgba(16,185,129,0.8)" : "rgba(239,68,68,0.8)"
        ),
      },
    ],
  };

  const chartIndexed = {
    labels: fullYearLabels,
    datasets: [
      {
        label: "Assets (Index 100)",
        data: assetsFull.map((v) => (v / (assetsFull[0] || 1)) * 100),
        borderColor: "#2563eb",
        backgroundColor: "transparent",
        tension: 0.3,
      },
      {
        label: "Liabilities (Index 100)",
        data: liabilitiesFull.map(
          (v) => (v / (liabilitiesFull[0] || 1)) * 100
        ),
        borderColor: "#b91c1c",
        backgroundColor: "transparent",
        tension: 0.3,
      },
      {
        label: "Borrowings (Index 100)",
        data: borrowingsFull.map(
          (v) => (v / (borrowingsFull[0] || 1)) * 100
        ),
        borderColor: "#7c3aed",
        backgroundColor: "transparent",
        tension: 0.3,
      },
    ],
  };

  const chartCagr = {
    labels: ["Assets", "Liabilities", "Net Worth", "Borrowings", "Reserves"],
    datasets: [
      {
        label: "CAGR %",
        data: [
          assetsCagr,
          liabilitiesCagr,
          netWorthCagr,
          borrowingsCagr,
          reservesCagr,
        ],
        backgroundColor: [
          "#2563eb",
          "#dc2626",
          "#16a34a",
          "#fb923c",
          "#6d28d9",
        ],
      },
    ],
  };

  const heatmapRows = [
    { label: "Assets", yoy: yoyAssets },
    { label: "Liabilities", yoy: yoyLiabilities },
    { label: "Borrowings", yoy: yoyBorrowings },
    { label: "Reserves", yoy: yoyReserves },
  ];




  const computeRiskScore = () => {
    let score = 100;

    const de = debtToEquity;
    const lastFullAssetsValue =
      assetsFull.length > 0 ? assetsFull[assetsFull.length - 1] : 0;
    const liabilitiesToAssets =
      lastFullAssetsValue > 0
        ? (liabilitiesFull[liabilitiesFull.length - 1] /
          lastFullAssetsValue) *
        100
        : 0;

    if (de > 2.5) score -= 35;
    else if (de > 2) score -= 28;
    else if (de > 1.5) score -= 20;
    else if (de > 1.0) score -= 12;
    else if (de > 0.5) score -= 5;

    if (liabilitiesToAssets > 75) score -= 20;
    else if (liabilitiesToAssets > 60) score -= 10;

    const borrowVsNW = borrowingsCagr - netWorthCagr;
    const borrowVsAssets = borrowingsCagr - assetsCagr;

    if (borrowVsNW > 10) score -= 15;
    if (borrowVsAssets > 10) score -= 12;
    if (borrowingsCagr > 20) score -= 10;

    if (assetsFull.length > 1 && liabilitiesFull.length > 1) {
      const firstGap = (assetsFull[0] || 0) - (liabilitiesFull[0] || 0);
      const lastGap =
        assetsFull[assetsFull.length - 1] -
        liabilitiesFull[liabilitiesFull.length - 1];
      const gapChangePct =
        firstGap !== 0
          ? ((lastGap - firstGap) / Math.abs(firstGap)) * 100
          : 0;

      if (gapChangePct < -20) score -= 15;
      else if (gapChangePct < 0) score -= 8;
      else if (gapChangePct > 20) score += 5;
    }

    const volatility = (() => {
      const all = [...yoyAssets, ...yoyLiabilities, ...yoyBorrowings];
      const vals = all.filter((v) => isFinite(v));
      if (!vals.length) return 0;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance =
        vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
      return Math.sqrt(variance);
    })();

    if (volatility > 30) score -= 18;
    else if (volatility > 20) score -= 10;
    else if (volatility > 12) score -= 5;
    else score += 3;

    if (reservesCagr < 0) score -= 10;
    else if (reservesCagr < 5) score -= 3;
    else score += 2;

    score = Math.max(1, Math.min(100, score));

    let label = "Moderate Risk";
    let color = "#f59e0b";
    let emoji = "🟡";

    if (score >= 75) {
      label = "Low Risk";
      color = "#16a34a";
      emoji = "🟢";
    } else if (score <= 40) {
      label = "High Risk";
      color = "#dc2626";
      emoji = "🔴";
    }

    const reasons = [];

    if (de > 1.5)
      reasons.push("High debt-to-equity reduces solvency strength.");
    if (borrowVsNW > 10)
      reasons.push("Debt is growing faster than net worth.");
    if (borrowVsAssets > 10)
      reasons.push("Borrowings are accelerating faster than assets.");
    if (liabilitiesToAssets > 70)
      reasons.push("Liabilities form a large portion of total assets.");
    if (reservesCagr < 0) reasons.push("Reserves are declining over time.");
    if (volatility > 20) reasons.push("Financial volatility is elevated.");
    if (reasons.length === 0)
      reasons.push(
        "Stable leverage, healthy solvency, and balanced growth across the balance sheet."
      );

    const forecast =
      borrowVsNW > 8
        ? "Risk may rise if borrowings continue to outpace net worth over the next few years."
        : de < 1
          ? "Risk is likely to remain low unless liabilities spike sharply."
          : "Overall risk is moderate; monitor leverage and solvency trends over coming years.";

    return { score, label, color, emoji, reasons, forecast };
  };

  const computeStabilityRating = () => {
    const volatilitySeries = [...yoyAssets, ...yoyLiabilities];
    const vals = volatilitySeries.filter((v) => isFinite(v));
    if (!vals.length) {
      return {
        emoji: "⚪",
        title: "Stability Unknown",
        text: "Not enough data to judge stability.",
      };
    }
    const mean =
      vals.reduce((sum, v) => sum + v, 0) / Math.max(1, vals.length);
    const variance =
      vals.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) /
      Math.max(1, vals.length);
    const std = Math.sqrt(variance);

    if (std < 8) {
      return {
        emoji: "🟢",
        title: "Very Stable",
        text: "Smooth consistent growth with low volatility.",
      };
    }
    if (std < 15) {
      return {
        emoji: "🟡",
        title: "Moderately Stable",
        text: "Some swings, but long-term trend looks positive.",
      };
    }
    if (std < 25) {
      return {
        emoji: "🟠",
        title: "Unstable",
        text: "Large fluctuations; monitor closely before deciding.",
      };
    }
    return {
      emoji: "🔴",
      title: "Risky",
      text: "Highly volatile; debt and assets move sharply.",
    };
  };

  const risk = computeRiskScore();
  const stability = computeStabilityRating();

  const gaugeScore = risk.score;
  const gaugeColor =
    gaugeScore >= 70 ? "#16a34a" : gaugeScore >= 40 ? "#f59e0b" : "#dc2626";
  const chartGauge = {
    labels: ["Score", "Remaining"],
    datasets: [
      {
        data: [gaugeScore, 100 - gaugeScore],
        backgroundColor: [gaugeColor, "#E5E7EB"],
        borderWidth: 0,
      },
    ],
  };
  const gaugeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: 2,
    circumference: 180,
    rotation: -90,
    cutout: "80%",
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  const lastFullAssetsValueForRadar =
    assetsFull.length > 0 ? assetsFull[assetsFull.length - 1] : 0;
  const lastFullBorrowingsValue =
    borrowingsFull.length > 0
      ? borrowingsFull[borrowingsFull.length - 1]
      : 0;
  const lastFullOtherLiabValue =
    otherLiabilitiesFull.length > 0
      ? otherLiabilitiesFull[otherLiabilitiesFull.length - 1]
      : 0;
  const lastFullNetWorthValue =
    netWorthFull.length > 0 ? netWorthFull[netWorthFull.length - 1] : 0;

  const debtPercentAssets =
    lastFullAssetsValueForRadar > 0
      ? (lastFullBorrowingsValue / lastFullAssetsValueForRadar) * 100
      : 0;
  const otherLiabPercentAssets =
    lastFullAssetsValueForRadar > 0
      ? (lastFullOtherLiabValue / lastFullAssetsValueForRadar) * 100
      : 0;
  const netWorthToDebt =
    lastFullBorrowingsValue > 0
      ? lastFullNetWorthValue / lastFullBorrowingsValue
      : lastFullNetWorthValue > 0
        ? 5
        : 0;

  const radarData = {
    labels: [
      "Borrowings",
      "Other Liabilities",
      "Debt % of Assets",
      "Other Liab % of Assets",
      "Net Worth to Debt",
    ],
    datasets: [
      {
        label: "Debt Quality Profile",
        data: [
          lastFullBorrowingsValue,
          lastFullOtherLiabValue,
          debtPercentAssets,
          otherLiabPercentAssets,
          netWorthToDebt,
        ],
        backgroundColor: "rgba(37,99,235,0.15)",
        borderColor: "#2563eb",
        pointBackgroundColor: "#2563eb",
        borderWidth: 1,
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  const ratios = [
    {
      label: "Debt to Equity",
      value: debtToEquity,
      format: (v) => v.toFixed(2),
      hint: "Total debt compared with shareholder funds.",
    },
    {
      label: "Equity Ratio",
      value: equityRatio * 100,
      format: (v) => `${v.toFixed(1)}%`,
      hint: "Portion of assets funded by equity.",
    },
    {
      label: "Borrowings % of Assets",
      value: debtPercentAssets,
      format: (v) => `${v.toFixed(1)}%`,
      hint: "How much of assets are financed via debt.",
    },
    {
      label: "Liabilities % of Assets",
      value:
        lastFullAssetsValueForRadar > 0
          ? (liabilitiesFull[liabilitiesFull.length - 1] /
            lastFullAssetsValueForRadar) *
          100
          : 0,
      format: (v) => `${v.toFixed(1)}%`,
      hint: "Total liabilities as percentage of assets.",
    },
    {
      label: "Net Worth CAGR",
      value: netWorthCagr,
      format: (v) => `${v.toFixed(1)}%`,
      hint: "Long-term compounded growth of net worth.",
    },
    {
      label: "Reserves CAGR",
      value: reservesCagr,
      format: (v) => `${v.toFixed(1)}%`,
      hint: "Long-term growth in reserves.",
    },
  ];

  const yearOptions = fullYearLabels;
  const [compareYearA, setCompareYearA] = useState(
    yearOptions.length >= 2
      ? yearOptions[yearOptions.length - 2]
      : yearOptions[0] || ""
  );
  const [compareYearB, setCompareYearB] = useState(
    yearOptions.length >= 1
      ? yearOptions[yearOptions.length - 1]
      : yearOptions[0] || ""
  );

  const labelToFullYearIndex = fullYearLabels.reduce(
    (acc, label, idx) => {
      acc[label] = fullYearIndices[idx];
      return acc;
    },
    {}
  );

  const idxA = labelToFullYearIndex[compareYearA];
  const idxB = labelToFullYearIndex[compareYearB];

  const diffFor = (series) => {
    if (idxA == null || idxB == null) return null;
    const a = series[idxA] || 0;
    const b = series[idxB] || 0;
    const abs = b - a;
    const pctDiff = a !== 0 ? (abs / a) * 100 : 0;
    return { a, b, abs, pct: pctDiff };
  };

  const diffAssets = diffFor(totalAssetsSeries);
  const diffLiabilities = diffFor(totalLiabilitiesSeries);
  const diffNetWorth = diffFor(netWorthSeries);
  const diffBorrowings = diffFor(borrowingsSeries);
  const diffReserves = diffFor(reservesSeries);

  const formatDiff = (d) => {
    if (!d) return "-";
    const pctStr = `${d.pct >= 0 ? "+" : ""}${d.pct.toFixed(1)}%`;
    const absStr = `${d.abs >= 0 ? "+" : ""}${d.abs.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 2,
      }
    )}`;
    return `${absStr} (${pctStr})`;
  };

  const aiAssetsTrendSummary = buildTrendSummary(yoyAssets, "Assets");
  const aiLiabilitiesTrendSummary = buildTrendSummary(
    yoyLiabilities,
    "Liabilities"
  );
  const aiNetWorthBorrowSummary = buildTrendSummary(
    yoyBorrowings,
    "Debt vs Net Worth"
  );
  const aiGapSummary = (() => {
    if (assetsFull.length < 2 || liabilitiesFull.length < 2) return "";
    const firstGap = (assetsFull[0] || 0) - (liabilitiesFull[0] || 0);
    const lastGap =
      assetsFull[assetsFull.length - 1] -
      liabilitiesFull[liabilitiesFull.length - 1];
    if (lastGap > firstGap * 1.2)
      return "Solvency gap has widened, improving safety.";
    if (lastGap < firstGap * 0.8)
      return "Solvency gap has shrunk, risk creeping up.";
    return "Solvency gap is broadly stable over time.";
  })();

  const aiAssetsCompositionSummary =
    ai?.summaries?.assets_composition &&
    buildTrendSummary(yoyAssets, "Asset mix");

  const aiLiabilitiesCompositionSummary =
    ai?.summaries?.liabilities_composition &&
    buildTrendSummary(yoyLiabilities, "Liability mix");

  const metricsAsOfLabel =
    fullYearLabels.length > 0
      ? fullYearLabels[fullYearLabels.length - 1]
      : years[years.length - 1];

  const arrowInfo = (change, isGoodWhenHigher = true) => {
    if (!isFinite(change)) return { symbol: "→", color: "text-gray-400" };
    if (Math.abs(change) < 0.5)
      return { symbol: "→", color: "text-gray-400" };
    const positive = change > 0;
    const good = isGoodWhenHigher ? positive : !positive;
    return {
      symbol: positive ? "↑" : "↓",
      color: good ? "text-green-600" : "text-red-600",
    };
  };

  const arrowAssets = arrowInfo(lastYoYAssets, true);
  const arrowNetWorth = arrowInfo(lastYoYNetWorth, true);
  const arrowLiabilities = arrowInfo(lastYoYLiabilities, false);
  const arrowBorrowings = arrowInfo(lastYoYBorrowings, false);

  return (
    <div className="space-y-6">

      {/* <div className="mt-2 text-sm font-semibold text-gray-700">
        📊 Key Balance Sheet Metrics
      </div> */}
      <MetricCards
        metricsAsOfLabel={metricsAsOfLabel}
        equityRatioYoy={netWorthCagr - assetsCagr}
        arrowEquityRatio={arrowInfo(netWorthCagr - assetsCagr, true)}
        totalAssetsGrowth={totalAssetsGrowth}
        equityRatioValue={equityRatio * 100}
        arrowdeptToEquity={arrowInfo(borrowingsCagr - netWorthCagr, false)}
        deptToEquityYoy={borrowingsCagr - netWorthCagr}
        debtToEquity={debtToEquity}
        arrowAssets={arrowAssets}
        arrowBorrowings={arrowBorrowings}
        arrowLiabilities={arrowLiabilities}
        arrowNetWorth={arrowNetWorth}
        borrowings={borrowings}
        lastYoYAssets={lastYoYAssets}
        lastYoYBorrowings={lastYoYBorrowings}
        lastYoYLiabilities={lastYoYLiabilities}
        lastYoYNetWorth={lastYoYNetWorth}
        netWorthLatest={netWorthLatest}
        totalLiabilities={totalLiabilities}
        totalAssets={totalAssets}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="bg-white rounded-lg border p-4 flex flex-col justify-between"
          style={{ borderColor: COLORS.border }}
        >
          <div className="text-sm font-semibold mb-1">
            🚦 Risk Score & Classification
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div
              className="text-2xl font-bold"
              style={{ color: risk.color }}
            >{`${risk.score}/100`}</div>
            <span
              className="px-2 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: `${risk.color}22`, color: risk.color }}
            >
              {risk.emoji} {risk.label}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            AI-based risk score blends leverage, solvency gap, debt growth and
            volatility patterns to estimate overall balance-sheet risk.
          </p>

          <ul className="mt-2 text-xs text-gray-600 list-disc ml-4">
            {risk.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          <p className="mt-2 text-[11px] text-gray-500 italic">
            📌 {risk.forecast}
          </p>
        </div>
        <div
          className="bg-white rounded-lg border p-4"
          style={{ borderColor: COLORS.border }}
        >
          <div className="text-sm font-semibold mb-1">
            💪 Financial Strength Gauge
          </div>
          <div className="h-24 mt-[10%] relative">
            <Doughnut data={chartGauge} options={gaugeOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
              <div
                className="text-lg font-semibold"
                style={{ color: gaugeColor }}
              >
                {gaugeScore.toFixed(0)}/100
              </div>
              <div className="text-[11px] text-gray-500">
                {gaugeScore >= 70
                  ? "Strong"
                  : gaugeScore >= 40
                    ? "Moderate"
                    : "Weak"}
              </div>
            </div>
          </div>
        </div>
        <div
          className="bg-white rounded-lg border p-4 flex flex-col justify-between"
          style={{ borderColor: COLORS.border }}
        >
          <div className="text-sm font-semibold mb-1">📉 Stability Rating</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl">{stability.emoji}</span>
            <span className="font-semibold text-sm">{stability.title}</span>
          </div>
          <p className="mt-2 text-xs text-gray-600">{stability.text}</p>
        </div>
      </div>
      {fullYearLabels.length >= 2 && (
        <div
          className="bg-white rounded-lg border p-4"
          style={{ borderColor: COLORS.border }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold mb-1">
                📌 What Changed Between Years?
              </div>
              <p className="text-xs text-gray-600">
                Compare balance sheet change between any two full financial
                years.
              </p>
            </div>
            <div className="flex gap-2 items-center text-xs justify-between">
              <select
                className="border rounded px-2 py-1 text-xs"
                value={compareYearA}
                onChange={(e) => setCompareYearA(e.target.value)}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span>vs</span>
              <select
                className="border rounded px-2 py-1 text-xs"
                value={compareYearB}
                onChange={(e) => setCompareYearB(e.target.value)}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="px-2 py-1">Metric</th>
                  <th className="px-2 py-1 text-right">{compareYearA}</th>
                  <th className="px-2 py-1 text-right">{compareYearB}</th>
                  <th className="px-2 py-1 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Total Assets", diff: diffAssets },
                  { label: "Total Liabilities", diff: diffLiabilities },
                  { label: "Net Worth", diff: diffNetWorth },
                  { label: "Borrowings", diff: diffBorrowings },
                  { label: "Reserves", diff: diffReserves },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="px-2 py-1 text-gray-700">{row.label}</td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {row.diff
                        ? row.diff.a.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                        : "-"}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-600">
                      {row.diff
                        ? row.diff.b.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                        : "-"}
                    </td>
                    <td className="px-2 py-1 text-right text-gray-800">
                      {formatDiff(row.diff)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div>
        <h2
          className="text-xl font-semibold mb-3"
          style={{ color: "#69b830" }}
        >
          Balance Sheet Summary
        </h2>
        <SummaryPanel ai={ai} />
      </div>
      <div className="mt-4 text-sm font-semibold text-gray-700">
        📊 Main Trends Overview
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard
          title="Total Assets & Net Worth Trend"
          result={ai?.summaries?.total_assets}
          pct={pct.total_assets}
          takeaway="Shows how total assets and shareholder net worth evolved over time."
          chart={<Line data={chartMainAssetsTrend} options={baseOptions} />}
          insights={ai?.perMetric?.total_assets}
          aiSummary={aiAssetsTrendSummary}
          onFullscreen={() =>
            setFullscreenChart({
              title: "Total Assets & Net Worth Trend",
              chart: (
                <Line
                  data={chartMainAssetsTrend}
                  options={{ ...baseOptions }}
                />
              ),
            })
          }
        />

        <ChartCard
          title="Liabilities & Borrowings Trend"
          result={ai?.summaries?.total_liabilities}
          pct={pct.total_liabilities}
          takeaway="Tracks total liabilities and debt build-up or reduction over the years."
          chart={
            <Line data={chartMainLiabilitiesTrend} options={baseOptions} />
          }
          insights={ai?.perMetric?.total_liabilities}
          aiSummary={aiLiabilitiesTrendSummary}
          onFullscreen={() =>
            setFullscreenChart({
              title: "Liabilities & Borrowings Trend",
              chart: (
                <Line
                  data={chartMainLiabilitiesTrend}
                  options={{ ...baseOptions }}
                />
              ),
            })
          }
        />
        <div className="md:col-span-2 text-sm font-semibold text-gray-700 mt-3">
          📘 Composition Breakdown
        </div>
        <ChartCard
          title="Assets Composition (Stacked)"
          result={ai?.summaries?.assets_composition}
          pct={null}
          takeaway="Breakdown of fixed assets, CWIP, investments and other assets over the years."
          chart={<Bar data={chartAssetsComposition} options={stackedOptions} />}
          insights={ai?.perMetric?.fixed_assets}
          aiSummary={aiAssetsCompositionSummary}
          onFullscreen={() =>
            setFullscreenChart({
              title: "Assets Composition (Stacked)",
              chart: (
                <Bar
                  data={chartAssetsComposition}
                  options={{ ...stackedOptions }}
                />
              ),
            })
          }
        />
        <ChartCard
          title="Liabilities Composition (Stacked)"
          result={ai?.summaries?.liabilities_composition}
          pct={pct.total_liabilities}
          takeaway="Shows mix of equity, reserves, borrowings and other liabilities."
          chart={
            <Bar data={chartLiabilitiesComposition} options={stackedOptions} />
          }
          insights={ai?.perMetric?.borrowings}
          aiSummary={aiLiabilitiesCompositionSummary}
          onFullscreen={() =>
            setFullscreenChart({
              title: "Liabilities Composition (Stacked)",
              chart: (
                <Bar
                  data={chartLiabilitiesComposition}
                  options={{ ...stackedOptions }}
                />
              ),
            })
          }
        />
        <div className="md:col-span-2 text-sm font-semibold text-gray-700 mt-3">
          💰 Solvency & Leverage Analysis
        </div>
        <ChartCard
          title="Net Worth vs Borrowings"
          result="Tracks long-term solvency strength and leverage control."
          pct={null}
          takeaway="If net worth grows faster than borrowings, company is financially strong."
          chart={
            <Line data={chartNetWorthVsBorrowings} options={baseOptions} />
          }
          insights={[
            "Compare whether equity + reserves growth is outpacing debt increase.",
            "If borrowings fall while net worth rises → excellent solvency.",
            "If borrowings rise faster than net worth → rising leverage risk.",
          ]}
          aiSummary={aiNetWorthBorrowSummary}
          onFullscreen={() =>
            setFullscreenChart({
              title: "Net Worth vs Borrowings",
              chart: (
                <Line
                  data={chartNetWorthVsBorrowings}
                  options={{ ...baseOptions }}
                />
              ),
            })
          }
        />
        <ChartCard
          title="Solvency Gap (Assets – Liabilities)"
          result="Shows how much assets exceed liabilities."
          pct={pct.total_assets}
          takeaway="Positive and increasing gap indicates comfortable solvency; shrinking gap can signal rising risk."
          chart={<Bar data={chartSolvencyGap} options={baseOptions} />}
          insights={[
            "A growing gap means improving solvency buffer.",
            "A shrinking gap means liabilities are catching up with assets.",
            "Negative gap would be a serious red flag.",
          ]}
          aiSummary={aiGapSummary}
          onFullscreen={() =>
            setFullscreenChart({
              title: "Solvency Gap (Assets – Liabilities)",
              chart: (
                <Bar data={chartSolvencyGap} options={{ ...baseOptions }} />
              ),
            })
          }
        />
      </div>
      <div className="mt-4 text-sm font-semibold text-gray-700">
        📈 Key Financial Ratios
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ratios.map((r) => (
          <div
            key={r.label}
            className="bg-white rounded-lg border p-4 transition-transform hover:shadow-md hover:-translate-y-[1px] hover:scale-[1.01]"
            style={{ borderColor: COLORS.border }}
          >
            <div className="text-xs font-semibold text-gray-700">
              {r.label}
            </div>
            <div
              className="text-xl font-semibold mt-1"
              style={{ color: COLORS.primary }}
            >
              {isFinite(r.value) ? r.format(r.value) : "--"}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">{r.hint}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-sm font-semibold text-gray-700">
        🧭 Debt Quality Radar
      </div>
      <div
        className="bg-white rounded-lg border p-2"
        style={{ borderColor: COLORS.border }}
      >
        <div style={{ height: "calc(100vh - 63vh)" }}>
          <Radar data={radarData} options={radarOptions} />
        </div>
        <p className="mt-2 text-[11px] text-gray-600 px-4">
          Higher net worth-to-debt and lower debt percentages vs assets
          indicate healthier leverage quality.
        </p>
      </div>
      {!showAdvanced && <div className="flex items-center w-full justify-center border border-[#D1D5DB] rounded-[5px] mt-4 hover:bg-gray-50 cursor-pointer" onClick={() => setShowAdvanced((s) => !s)}>
        <div className="flex items-center gap-2">
          <div
            className="py-1.5 text-sm"
          >
            Show Advanced Insights ▼
          </div>
        </div>
      </div>}
      {showAdvanced && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <ChartCard
              title="YoY Assets Change"
              result={ai?.summaries?.yoy_assets}
              pct={pct.total_assets}
              takeaway="Yearly percentage growth/decline in total assets (full years only)."
              chart={<Bar data={chartYoY} options={baseOptions} />}
              insights={ai?.perMetric?.total_assets}
              aiSummary={aiAssetsTrendSummary}
              onFullscreen={() =>
                setFullscreenChart({
                  title: "YoY Assets Change",
                  chart: <Bar data={chartYoY} options={{ ...baseOptions }} />,
                })
              }
            />
            <ChartCard
              title="Assets Breakdown (Latest Period)"
              result={ai?.summaries?.assets_breakdown}
              pct={null}
              takeaway="Contribution of each asset class in the latest reported period."
              chart={
                <Doughnut
                  data={chartLatestAssets}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              }
              insights={ai?.perMetric?.fixed_assets}
              aiSummary={aiAssetsCompositionSummary}
              onFullscreen={() =>
                setFullscreenChart({
                  title: "Assets Breakdown (Latest Period)",
                  chart: (
                    <Doughnut
                      data={chartLatestAssets}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: "bottom" } },
                      }}
                    />
                  ),
                })
              }
            />
            <ChartCard
              title="Liabilities Breakdown (Latest Period)"
              result={ai?.summaries?.liabilities_breakdown}
              pct={null}
              takeaway="Latest period split between equity, reserves, debt and other liabilities."
              chart={
                <Doughnut
                  data={chartLatestLiabilities}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              }
              insights={ai?.perMetric?.borrowings}
              aiSummary={aiLiabilitiesCompositionSummary}
              onFullscreen={() =>
                setFullscreenChart({
                  title: "Liabilities Breakdown (Latest Period)",
                  chart: (
                    <Doughnut
                      data={chartLatestLiabilities}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: "bottom" } },
                      }}
                    />
                  ),
                })
              }
            />
            <ChartCard
              title="Indexed (Base-100) Assets vs Liabilities vs Borrowings"
              result="Normalizes all metrics to compare growth direction."
              pct={null}
              takeaway="See whether debt is growing faster or slower than assets and net worth."
              chart={<Line data={chartIndexed} options={baseOptions} />}
              insights={[
                "If borrowings index rises faster than assets → leverage increasing.",
                "If assets index outruns liabilities → strong asset-led growth.",
              ]}
              aiSummary={buildTrendSummary(
                yoyBorrowings,
                "Indexed assets vs debt"
              )}
              onFullscreen={() =>
                setFullscreenChart({
                  title: "Indexed Comparison",
                  chart: (
                    <Line data={chartIndexed} options={{ ...baseOptions }} />
                  ),
                })
              }
            />
            <ChartCard
              title="CAGR Comparison (Long-Term Growth)"
              result="Compound annual growth of key financial metrics."
              pct={null}
              takeaway="Highlights which parts of the balance sheet grew fastest over the entire period."
              chart={<Bar data={chartCagr} options={baseOptions} />}
              insights={[
                "High Assets CAGR but low Net Worth CAGR → debt-fuelled expansion.",
                "Strong Net Worth and Reserves CAGR is a very positive sign.",
              ]}
              aiSummary={buildTrendSummary(
                yoyAssets,
                "Long-term growth profile"
              )}
              onFullscreen={() =>
                setFullscreenChart({
                  title: "CAGR Comparison",
                  chart: <Bar data={chartCagr} options={{ ...baseOptions }} />,
                })
              }
            />
            <div className="animation-border p-[2.2px]">
              <div className="border border-[#D1D5DB] rounded-[10px] p-[20px] h-full w-full bg-white">
                <div className="mb-3 text-lg font-medium text-gray-700">
                  🧩 Comprehensive AI Signals
                </div>
                <div
                  className="bg-white rounded-[10px]"
                  style={{ borderColor: COLORS.border }}
                >
                  <p
                    className="text-[14px] text-gray-700 mb-2"
                    style={{ color: COLORS.secondaryText }}
                  >
                    {ai?.relationships?.[0]}
                  </p>
                  <ul
                    className="text-[14px] list-disc ml-5"
                    style={{ color: COLORS.secondaryText }}
                  >
                    {(ai?.recommendations || []).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="mt-4 text-sm font-semibold text-gray-700">
              🔥 YoY % Change Heatmap (Growth Only)
            </div>
            <div
              className="bg-white rounded-lg border p-4"
              style={{ borderColor: COLORS.border }}
            >
              <div className="overflow-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="px-2 py-1">Metric</th>
                      {fullYearLabels.map((y) => (
                        <th className="px-2 py-1 text-center" key={y}>
                          {y}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapRows.map((row) => (
                      <tr key={row.label}>
                        <td className="px-2 py-1 font-medium text-gray-700">
                          {row.label}
                        </td>
                        {row.yoy.map((pctVal, i) =>
                          i === 0 ? (
                            <td
                              key={i}
                              className="px-2 py-1 text-gray-400 text-center"
                            >
                              —
                            </td>
                          ) : (
                            <td key={i} className="px-1 py-1">
                              <div
                                className={`rounded text-center px-1 py-[2px] ${getHeatColor(
                                  pctVal
                                )}`}
                              >
                                {pctVal.toFixed(1)}%
                              </div>
                            </td>
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {showAdvanced && <div className="flex items-center w-full justify-center border border-[#D1D5DB] rounded-[5px] mt-4 hover:bg-gray-50 cursor-pointer" onClick={() => setShowAdvanced((s) => !s)}>
            <div className="flex items-center gap-2">
              <div
                className="py-1.5 text-sm"
              >
                Hide Advanced Insights ▲
              </div>
            </div>
          </div>}
        </>
      )}
      {fullscreenChart && (
        <FullScreenModal
          title={fullscreenChart.title}
          onClose={() => setFullscreenChart(null)}
          chart={fullscreenChart.chart}
        />
      )}
    </div>
  );
};

export default BalanceSheetDashboard;
