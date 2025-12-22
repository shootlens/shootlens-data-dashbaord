// src/utils/nlpCashflow.js – AI NLP Engine for Cash Flow Analysis (Hybrid tone)
function sum(arr) { return arr.reduce((s, v) => s + (v || 0), 0); }
function mean(arr) { return arr.length ? sum(arr) / arr.length : 0; }
function std(arr) { const m = mean(arr); return Math.sqrt(arr.reduce((s, x) => s + Math.pow((x - m), 2), 0) / (arr.length || 1)); }
function first(arr) { return arr?.length ? arr[0] : 0; }
function last(arr) { return arr?.length ? arr[arr.length - 1] : 0; }
function pct(start, end) { if (start === 0) return end > 0 ? 100 : end < 0 ? -100 : 0; return ((end - start) / Math.abs(start)) * 100; }
function cagr(start, end, periods) { if (periods <= 0 || start <= 0) return null; return (Math.pow(end / start, 1 / periods) - 1) * 100; }
function trend(arr) { const p = pct(first(arr), last(arr)); if (Math.abs(p) < 5) return "flat"; if (p > 5) return "uptrend"; return "downtrend"; }
function risk(arr) { const r = std(arr) / Math.abs(mean(arr) || 1); if (r > 1) return { level: "high", msg: "High volatility in this cashflow" }; if (r > 0.5) return { level: "medium", msg: "Moderate volatility" }; return { level: "low", msg: "Stable cashflow" }; }
function fmt(n) { return `₹${Number(n).toLocaleString()}`; }

function summarize(label, arr, stats) {
  const pctLabel = stats.pct >= 0 ? `${stats.pct.toFixed(1)}% increase` : `${Math.abs(stats.pct).toFixed(1)}% decrease`;
  const cagrText = stats.cagr !== null ? ` CAGR ${stats.cagr.toFixed(1)}%` : "";
  return `${label} moved from ${fmt(stats.start)} to ${fmt(stats.end)} (${pctLabel})${cagrText}. Trend: ${stats.trend}.`;
}

// create two hybrid-style recommendations for a metric
function buildPerMetricRecs(key, stats) {
  const recs = [];
  const pct = stats.pct;
  const meanVal = stats.mean;
  const vol = stats.std;
  // recommendation 1: action-oriented
  if (key === "ocf") {
    if (meanVal > 0 && pct > 5) recs.push("OCF is healthy and rising — maintain focus on core operational efficiency.");
    else if (meanVal > 0 && pct <= 5) recs.push("OCF is positive but relatively flat — look for small operational optimizations.");
    else recs.push("OCF is weak or negative — investigate working capital and core margins.");
    // rec2: volatility or warning
    if (stats.volSignal.level === "high") recs.push("High OCF volatility — examine one-off items and receivables/payables timing.");
    else recs.push("Monitor OCF seasonality and cash conversion cycles.");
  } else if (key === "icf") {
    if (pct < -10) recs.push("Investing outflow is substantial — confirm these are strategic capex or acquisitions.");
    else if (pct < 0) recs.push("ICF is modestly negative — likely ongoing reinvestment.");
    else recs.push("Positive ICF suggests asset sales or disinvestments — check if recurring.");
    if (stats.volSignal.level === "high") recs.push("ICF volatility high — verify one-time asset disposals or timing effects.");
    else recs.push("Assess ROI timelines for current investments.");
  } else if (key === "fcf") {
    if (pct > 10) recs.push("Financing inflows increased — check for new borrowings or equity issuance and impact on leverage.");
    else if (pct < -10) recs.push("Financing outflow increased — may indicate repayments or higher dividend payouts.");
    else recs.push("Financing activity stable — monitor debt servicing capacity if borrowing grows.");
    if (stats.volSignal.level === "high") recs.push("High financing volatility — review capital structure changes.");
    else recs.push("Consider trend vs. strategic funding needs.");
  } else if (key === "ncf") {
    if (pct > 5) recs.push("Net cash is improving — stronger liquidity position.");
    else if (pct < -5) recs.push("Net cash is weakening — identify which activity (ICF/FCF) is the driver.");
    else recs.push("Net cash is relatively stable — monitor for shifts from investing/financing moves.");
    if (stats.volSignal.level === "high") recs.push("Net cash volatile — keep an eye on large one-time flows.");
    else recs.push("Maintain cash buffer for operational needs.");
  } else if (key === "combined") {
    if (pct > 5) recs.push("Overall liquidity improving — operations and funding appear aligned.");
    else if (pct < -5) recs.push("Overall liquidity declining — review investments and financing for sustainability.");
    else recs.push("Overall liquidity flat — no immediate concerns but monitor active investments.");
    recs.push("Compare cash metrics with balance sheet changes (debt, reserves) for a full picture.");
  } else {
    recs.push("No specific recommendation.");
    recs.push("Monitor trends and volatility.");
  }

  // ensure exactly 2, but keep them meaningful
  return recs.slice(0, 2);
}

export default function generateCashflowInsights({ series = {}, labels = [] } = {}) {
  const { ocf = [], icf = [], fcf = [], ncf = [] } = series;
  const periods = Math.max(0, labels.length - 1);

  const stats = {
    ocf: { start: first(ocf), end: last(ocf) },
    icf: { start: first(icf), end: last(icf) },
    fcf: { start: first(fcf), end: last(fcf) },
    ncf: { start: first(ncf), end: last(ncf) },
  };

  for (const k of Object.keys(stats)) {
    const s = stats[k];
    s.pct = pct(s.start, s.end);
    s.trend = trend(series[k] || []);
    s.cagr = cagr(s.start, s.end, periods);
    s.std = std(series[k] || []);
    s.mean = mean(series[k] || []);
    s.volSignal = risk(series[k] || []);
  }

  const relations = [];
  if (stats.ocf.pct > 5 && stats.ncf.pct < 0) relations.push("Operating CF rising while Net CF falling — investments or financing outflows are consuming liquidity.");
  if (stats.icf.pct < -10 && stats.ocf.pct > 0) relations.push("Negative ICF with strong OCF suggests capex-driven growth.");
  if (stats.fcf.pct > 20 && stats.ocf.pct < 0) relations.push("Financing inflows high while OCF weak — company may be funding operations through debt/equity.");
  if (relations.length === 0) relations.push("Cashflow components behave within normal expected ranges.");

  const recommendations = [];
  if (stats.ocf.mean < 0) recommendations.push("Operating cashflow is negative on average — review core profitability and working capital.");
  if (stats.icf.pct < -15) recommendations.push("High negative investing cashflow — confirm capital expenditure is strategic and tracked for returns.");
  if (stats.fcf.pct > 20) recommendations.push("Significant financing inflow — verify leverage and repayment plans.");
  if (recommendations.length === 0) recommendations.push("No immediate red flags detected.");

  // perMetric: top-2 actionable, hybrid-tone recs for each metric
  const perMetric = {
    ocf: buildPerMetricRecs("ocf", stats.ocf),
    icf: buildPerMetricRecs("icf", stats.icf),
    fcf: buildPerMetricRecs("fcf", stats.fcf),
    ncf: buildPerMetricRecs("ncf", stats.ncf),
    combined: buildPerMetricRecs("combined", stats.ncf),
  };

  return {
    meta: { labels, periods, stats },
    ocf: summarize("Operating Cash Flow", ocf, stats.ocf),
    icf: summarize("Investing Cash Flow", icf, stats.icf),
    fcf: summarize("Financing Cash Flow", fcf, stats.fcf),
    ncf: summarize("Net Cash Flow", ncf, stats.ncf),
    overall: summarize("Net Cash Flow", ncf, stats.ncf) + " " + relations[0],
    relationships: relations,
    signals: { ocf: stats.ocf.volSignal, icf: stats.icf.volSignal, fcf: stats.fcf.volSignal, ncf: stats.ncf.volSignal },
    recommendations,
    perMetric
  };
}
