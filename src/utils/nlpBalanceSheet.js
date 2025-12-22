function sum(arr = []) { return arr.reduce((s, v) => s + (v || 0), 0); }
function mean(arr = []) { return arr.length ? sum(arr) / arr.length : 0; }
function std(arr = []) { if (!arr.length) return 0; const m = mean(arr); return Math.sqrt(arr.reduce((s, x) => s + Math.pow((x - m), 2), 0) / arr.length); }
const first = (arr) => (arr && arr.length ? arr[0] : 0);
const last = (arr) => (arr && arr.length ? arr[arr.length - 1] : 0);
function pct(start, end) { if (start === 0) return end > 0 ? 100 : end < 0 ? -100 : 0; return ((end - start) / Math.abs(start)) * 100; }
function cagr(start, end, periods) { if (periods <= 0 || start <= 0) return null; return (Math.pow(end / start, 1 / periods) - 1) * 100; }
function safeDiv(a, b) { if (b == null || b === 0) return null; return a / b; }
function fmtCurrency(n) { if (n == null || Number.isNaN(n)) return 'N/A'; try { return `₹${Math.round(n).toLocaleString()}`; } catch (e) { return `₹${Math.round(n)}`; } }
function fmtPercent(n, digits = 1) { if (n == null || Number.isNaN(n)) return 'N/A'; return `${n.toFixed(digits)}%`; }
function trendLabel(arr = []) { const p = pct(first(arr), last(arr)); if (Math.abs(p) < 5) return 'flat'; return p > 5 ? 'uptrend' : 'downtrend'; }
function volSignal(arr = []) { const s = std(arr); const m = Math.abs(mean(arr) || 1); const rel = s / m; if (rel > 1) return { level: 'high', msg: 'High volatility' }; if (rel > 0.5) return { level: 'medium', msg: 'Moderate volatility' }; return { level: 'low', msg: 'Low volatility' }; }

function buildPerMetricRecs(metric, stats = {}) {
  const recs = [];
  const p = stats.pct || 0;
  const vol = stats.std || 0;
  const push = (s) => { if (s && !recs.includes(s)) recs.push(s); };

  switch (metric) {
    case 'total_assets':
      if (p > 10) push('Assets grew strongly — verify capex ROI and utilisation.');
      else if (p < -5) push('Assets declined — check for disposals or impairments.');
      else push('Assets are relatively stable.');
      push(vol > 0.5 ? 'Asset movements are volatile — review one-off items.' : 'Asset changes are consistent.');
      break;
    case 'total_liabilities':
      if (p > 8) push('Liabilities increased noticeably — identify funding purpose.');
      else if (p < -5) push('Liabilities fell — positive for solvency.');
      else push('Liabilities are stable.');
      push('Compare liability growth to assets to assess leverage.');
      break;
    case 'borrowings':
      if (p > 10) push('Borrowings rose markedly — confirm use of funds.');
      else if (p < -5) push('Borrowings reduced — suggests deleveraging.');
      else push('Borrowings relatively unchanged.');
      push(vol > 0.5 ? 'Debt profile volatile — monitor refinancing risk.' : 'Debt profile stable.');
      break;
    case 'equity':
      if (p > 5) push('Equity increased — may reflect retained earnings or issuance.');
      else if (p < -5) push('Equity decreased — check for losses or payouts.');
      else push('Equity stable.');
      push('Compare equity change with reserves for quality.');
      break;
    case 'reserves':
      if (p > 5) push('Reserves rising — internal buffer increasing.');
      else if (p < -5) push('Reserves falling — investigate dividends or write-downs.');
      else push('Reserves steady.');
      push('Healthy reserves improve shock absorption.');
      break;
    case 'fixed_assets':
    case 'investments':
    case 'cwip':
      if (p > 8) push(`${metric.replace('_', ' ')} increased — active investment/capex.`);
      else if (p < -5) push(`${metric.replace('_', ' ')} decreased — disposals or lower spend.`);
      else push(`${metric.replace('_', ' ')} steady.`);
      push('Check expected returns and depreciation impact.');
      break;
    case 'de_ratio':
    case 'debt_equity':
      {
        const val = stats.end;
        if (val == null) push('Insufficient data for debt-equity.');
        else {
          if (val > 3) push('High debt-equity — leverage risk, review interest coverage.');
          else if (val > 1.5) push('Moderate leverage — watch refinancing timelines.');
          else push('Low leverage — conservative capital structure.');
          push('Monitor covenant & refinancing needs.');
        }
      }
      break;
    default:
      push('Monitor trend & volatility for this metric.');
      push('Cross-check with cashflow and profitability.');
  }

  return recs.slice(0, 2);
}

function computeHealthScore(meta) {
  const s = meta.stats || {};
  const weights = { leverage: 0.35, solvency: 0.25, growth: 0.2, stability: 0.2 };
  const totalAssetsPct = s.total_assets?.pct || 0;
  const equityRatio = meta.equityRatio || 0;
  const assetsVol = s.total_assets?.std || 0;
  const borrowingsVol = s.borrowings?.std || 0;
  const borrowingsPct = s.borrowings?.pct || 0;
  const de = meta.debtEquity;

  const leverageScore = (() => {
    if (de == null) return 70;
    if (de > 3) return 20;
    if (de > 2) return 35;
    if (de > 1) return 55;
    return 80;
  })();

  const solvencyScore = (() => {
    if (equityRatio == null) return 60;
    const r = equityRatio;
    if (r < 0.1) return 25;
    if (r < 0.2) return 45;
    if (r < 0.35) return 65;
    return Math.min(95, 80 + Math.round((r - 0.35) * 100));
  })();

  const growthScore = (() => {
    const p = totalAssetsPct;
    if (p > 20) return 80;
    if (p > 5) return 70;
    if (p > -5) return 55;
    if (p > -15) return 40;
    return 25;
  })();

  const stabilityScore = (() => {
    const vol = (assetsVol + borrowingsVol) / 2;
    if (vol < 0.1) return 85;
    if (vol < 0.5) return 70;
    if (vol < 1) return 50;
    return 30;
  })();

  const total = Math.round(
    leverageScore * weights.leverage +
    solvencyScore * weights.solvency +
    growthScore * weights.growth +
    stabilityScore * weights.stability
  );

  return Math.max(0, Math.min(100, total));
}

export default function generateBalanceSheetInsights({ balance_sheet = [] } = {}) {
  if (!Array.isArray(balance_sheet) || balance_sheet.length < 2) {
    return { error: 'Insufficient data' };
  }

  const years = balance_sheet[0].slice(1);
  const nPeriods = Math.max(0, years.length - 1);

  // normalized row map
  const rowMap = {};
  balance_sheet.slice(1).forEach(row => {
    const key = String(row[0] || '').toLowerCase().trim();
    rowMap[key] = row.slice(1).map(v => {
      if (v == null || v === '') return 0;
      const cleaned = String(v).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    });
  });

  const findSeries = (candidates = []) => { for (const k of candidates) if (rowMap[k]) return rowMap[k]; return Array(years.length).fill(0); };

  // primary series
  const totalAssets = findSeries(['total assets', 'assets']);
  const totalLiabilities = findSeries(['total liabilities', 'liabilities']);
  const equity = findSeries(['equity capital', 'equity', 'share capital']);
  const reserves = findSeries(['reserves', 'reserves and surplus', 'retained earnings']);
  const borrowings = findSeries(['borrowings', 'debt', 'total borrowings']);
  const fixedAssets = findSeries(['fixed assets', 'property plant equipment', 'ppe']);
  const cwip = findSeries(['cwip', 'capital work in progress']);
  const investments = findSeries(['investments']);
  const otherAssets = findSeries(['other assets']);
  const otherLiabilities = findSeries(['other liabilities']);

  const metrics = {
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    equity,
    reserves,
    borrowings,
    fixed_assets: fixedAssets,
    cwip,
    investments,
    other_assets: otherAssets,
    other_liabilities: otherLiabilities
  };


  const stats = {};
  for (const k of Object.keys(metrics)) {
    const s = metrics[k];
    stats[k] = {
      series: s,
      start: first(s),
      end: last(s),
      mean: mean(s),
      std: std(s),
      pct: pct(first(s), last(s)),
      trend: trendLabel(s),
      cagr: cagr(first(s), last(s), nPeriods),
      volSignal: volSignal(s)
    };
  }

  const latestIdx = Math.max(0, years.length - 1);
  const totalAssetsLatest = stats.total_assets.end || 0;
  const totalLiabilitiesLatest = stats.total_liabilities.end || 0;
  const borrowingsLatest = stats.borrowings.end || 0;
  const equityLatest = stats.equity.end || 0;
  const reservesLatest = stats.reserves.end || 0;

  const debtEquity = safeDiv(borrowingsLatest, (equityLatest + reservesLatest) || null);
  const equityRatio = safeDiv((equityLatest + reservesLatest), totalAssetsLatest);

  // compositions (latest)
  const assetsComponentsLatest = {
    fixed_assets: stats.fixed_assets.end || 0,
    cwip: stats.cwip.end || 0,
    investments: stats.investments.end || 0,
    other_assets: stats.other_assets.end || 0
  };
  const compTotal = sum(Object.values(assetsComponentsLatest)) || 1;
  const assetsCompositionPct = Object.fromEntries(Object.entries(assetsComponentsLatest).map(([k, v]) => [k, (v / compTotal) * 100]));

  const liabilitiesComponentsLatest = {
    equity_plus_reserves: (equityLatest + reservesLatest) || 0,
    borrowings: borrowingsLatest || 0,
    other_liabilities: (stats.other_liabilities.end || 0)
  };
  const liabTotal = sum(Object.values(liabilitiesComponentsLatest)) || 1;
  const liabilitiesCompositionPct = Object.fromEntries(Object.entries(liabilitiesComponentsLatest).map(([k, v]) => [k, (v / liabTotal) * 100]));

  // relationships & recs
  const relationships = [];
  if (stats.borrowings.pct > 10 && stats.total_assets.pct < 5) relationships.push('Borrowings grew faster than assets — leverage rising without proportional asset backing.');
  if (stats.reserves.pct > 5 && stats.total_assets.pct > 5) relationships.push('Reserves and assets both growing — internal funding for growth.');
  if (stats.fixed_assets.pct > 10 && stats.borrowings.pct > 10) relationships.push('Capex appears funded by debt — review repayment capacity and project returns.');
  if (!relationships.length) relationships.push('No major cross-item anomalies detected in the balance sheet.');

  const recommendations = [];
  if (stats.total_assets.pct < -5) recommendations.push('Total assets are contracting — confirm asset sales or impairments and their impact on earnings.');
  if (stats.borrowings.pct > 10) recommendations.push('Borrowings are rising — validate funding purpose and assess interest coverage.');
  if (stats.equity.pct < -5) recommendations.push('Equity weakened — investigate retained earnings and shareholder payouts.');
  if (!recommendations.length) recommendations.push('Balance sheet appears structurally consistent; continue monitoring leverage and liquidity.');

  const perMetric = {};
  for (const m of Object.keys(stats)) perMetric[m] = buildPerMetricRecs(m, stats[m]);
  perMetric['de_ratio'] = buildPerMetricRecs('de_ratio', { end: debtEquity });
  perMetric['equity_ratio'] = buildPerMetricRecs('equity_ratio', { end: equityRatio });

  // summarizers (Tone C: 3 sentences)
  function summarizeMetric(label, s) {
    const startFmt = fmtCurrency(s.start);
    const endFmt = fmtCurrency(s.end);
    const changePct = s.pct || 0;
    const dir = changePct > 0 ? 'increased' : (changePct < 0 ? 'decreased' : 'remained roughly flat');
    const s1 = `${label} ${dir} by ${Math.abs(changePct).toFixed(1)}% over the period, from ${startFmt} to ${endFmt}.`;
    const s2 = (changePct > 0) ? `This indicates growth in the company's scale or asset base.` : (changePct < 0) ? `This may reflect asset sales, impairments, or consolidation.` : `This indicates stability without major changes.`;
    const s3 = (changePct > 0) ? `Investors usually view steady asset growth positively if returns follow.` : (changePct < 0) ? `Investors should verify if the change affects future revenue or cash generation.` : `For investors, flat changes indicate no immediate concern but continue monitoring.`;
    return `${s1} ${s2} ${s3}`;
  }

  const summaries = {
    total_assets: summarizeMetric('Total assets', stats.total_assets),
    total_liabilities: summarizeMetric('Total liabilities', stats.total_liabilities),
    equity: summarizeMetric('Equity', stats.equity),
    borrowings: summarizeMetric('Borrowings', stats.borrowings),
    assets_composition: (() => {
      const parts = Object.entries(assetsCompositionPct).map(([k, v]) => `${k.replace('_', ' ')} ${v.toFixed(1)}%`);
      return `Fixed/major asset split: ${parts.join(' • ')}. A heavier fixed-asset base suggests capital intensity; check depreciation and capex ROI. For investors, stable productive assets are a positive sign.`;
    })(),
    liabilities_composition: (() => {
      const parts = Object.entries(liabilitiesCompositionPct).map(([k, v]) => `${k.replace('_', ' ')} ${v.toFixed(1)}%`);
      return `Liabilities split: ${parts.join(' • ')}. A high borrowings share increases leverage risk; check interest coverage. Investors should prefer stronger equity cushions for stability.`;
    })(),
    assets_breakdown: (() => {
      const keys = Object.keys(assetsCompositionPct);
      const top = keys.sort((a, b) => assetsCompositionPct[b] - assetsCompositionPct[a]).slice(0, 3);
      const text = top.map(k => `${k.replace('_', ' ')} ${assetsCompositionPct[k].toFixed(1)}%`).join(', ');
      return `Latest year breakdown — ${text}. Verify whether the top components are income-generating. Investors should prefer assets that support cashflow growth.`;
    })(),
    liabilities_breakdown: (() => {
      const keys = Object.keys(liabilitiesCompositionPct);
      const top = keys.sort((a, b) => liabilitiesCompositionPct[b] - liabilitiesCompositionPct[a]).slice(0, 3);
      const text = top.map(k => `${k.replace('_', ' ')} ${liabilitiesCompositionPct[k].toFixed(1)}%`).join(', ');
      return `Latest year liabilities breakdown — ${text}. If borrowings are large, assess repayment schedule. For investors, balanced liabilities are preferable.`;
    })(),
    assets_vs_liabilities: (() => {
      const diff = totalAssetsLatest - totalLiabilitiesLatest;
      const diffTxt = diff >= 0 ? `Assets exceed liabilities by ${fmtCurrency(diff)}` : `Liabilities exceed assets by ${fmtCurrency(Math.abs(diff))}`;
      const s1 = `Assets vs liabilities (latest): ${fmtCurrency(totalAssetsLatest)} vs ${fmtCurrency(totalLiabilitiesLatest)} — ${diffTxt}.`;
      const s2 = diff >= 0 ? `This shows solvency cushion is present.` : `This indicates potential solvency pressure that requires further investigation.`;
      const s3 = diff >= 0 ? `Investors generally view a clear assets cushion positively.` : `Investors should be cautious and check cashflows and covenants.`;
      return `${s1} ${s2} ${s3}`;
    })(),
    yoy_assets: (() => {
      const change = stats.total_assets.pct;
      const s1 = `Total assets ${change >= 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% over the period.`;
      const s2 = change >= 0 ? `This indicates the company is expanding its asset base.` : `This may indicate consolidation or disposals.`;
      const s3 = change >= 0 ? `Investors see steady YoY asset growth as supportive for scaling revenue.` : `Investors should verify whether the decline affects future earnings.`;
      return `${s1} ${s2} ${s3}`;
    })()
  };

  const meta = { stats, debtEquity, equityRatio, assetsCompositionPct, liabilitiesCompositionPct, years, debtEquityRaw: debtEquity };

  const healthScore = computeHealthScore(meta);
  const classification = healthScore >= 75 ? 'Healthy' : (healthScore >= 50 ? 'Monitor' : 'Risk');

  return {
    meta,
    summaries,
    ratios: { debtEquity, equityRatio },
    relationships,
    recommendations,
    perMetric,
    healthScore,
    classification
  };
}
