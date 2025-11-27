import { useMemo } from "react";
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
import { COLORS } from "../constants";
import generateBalanceSheetInsights from "../utils/nlpBalanceSheet";
import { PiBankThin, PiCreditCardLight, PiMathOperationsThin, PiPiggyBankThin, PiScalesLight, PiTrendUpThin } from "react-icons/pi";
import { FcComboChart } from "react-icons/fc";

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

// Helpers
const normalizeKey = (str = "") => String(str || "").toLowerCase().trim();
const parseNumber = (val) => {
    if (val == null || val === "") return 0;
    if (typeof val === "number") return val;
    const cleaned = String(val).replace(/,/g, "").replace(/[^0-9.-]/g, "").trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
};

const getColorClass = (pct) => {
    if (pct == null) return { bg: "bg-gray-50", text: "text-gray-700", border: "#D1D5DB" };
    if (pct > 5) return { bg: "bg-green-50", text: "text-green-700", border: "green" };
    if (pct < -5) return { bg: "bg-red-50", text: "text-red-700", border: "red" };
    return { bg: "bg-yellow-50", text: "text-yellow-700", border: "yellow" };
};

const ResultPanel = ({ title, text, pct }) => {
    const cls = getColorClass(pct);
    return (
        <div className={`rounded-md border p-3 ${cls.bg}`} style={{ borderColor: cls.border }}>
            <div className="text-sm font-semibold">{title}</div>
            <p className="text-sm mt-1 text-gray-700">{text || "—"}</p>
        </div>
    );
};

const Takeaway = ({ text }) => (
    <div className="rounded-md border p-2 bg-white" style={{ borderColor: COLORS.border }}>
        <div className="text-sm font-medium">User Takeaway</div>
        <p className="text-sm text-gray-700 mt-1">{text}</p>
    </div>
);

const InsightList = ({ list = [] }) => (
    <div className="rounded-md border p-2 mt-3" style={{ borderColor: COLORS.border }}>
        <div className="text-sm font-semibold">🧠 Insights</div>
        <ul className="text-xs mt-2 ml-4 list-disc text-gray-800">
            {list && list.length ? list.map((t, i) => <li key={i}>{t}</li>) : <li>No insights available</li>}
        </ul>
    </div>
);

const SummaryPanel = ({ ai }) => {
    if (!ai) return null;
    const { healthScore = 0, classification = 'N/A', summaries = {}, recommendations = [] } = ai;
    const scoreColor = healthScore >= 75 ? '#059669' : (healthScore >= 50 ? '#f59e0b' : '#ef4444');

    return (
        <div className="bg-linear-90 from-[#f38ca8] via-[#fab387] to-[#a8e2a1] p-[2.5px] rounded-[13px]">
            <div className="bg-white rounded-[10px] p-4" style={{ borderColor: COLORS.border }}>
                <div className="flex flex-col md:flex-row">
                    <div>
                        <h2 className="text-xl font-semibold mb-3" style={{ color: COLORS.companyTitle }}>Balance Sheet Summary</h2>
                        <p className="text-[16px]  mt-2" style={{ color: COLORS.secondaryText }}>{summaries?.total_assets}</p>
                        <ul className="mt-3 list-disc ml-5 space-y-1">
                            <li className="text-[16px]" style={{ color: COLORS.secondaryText }}>{summaries?.total_liabilities}</li>
                            <li className="text-[16px]" style={{ color: COLORS.secondaryText }}>{summaries?.equity}</li>
                        </ul>
                    </div>

                    <div className="text-right" style={{ minWidth: 160 }}>
                        <div className="text-sm text-gray-500">Health Score</div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor }}>{healthScore} / 100</div>
                        <div className="text-sm mt-1" style={{ color: COLORS.secondaryText }}>{classification}</div>

                        <div className="mt-3 text-xs">
                            <div className="font-semibold text-lg" style={{ color: COLORS.secondaryText }}>Top Recommendations</div>
                            <ul className="ml-5 mt-2 text-[14px]" style={{ color: COLORS.secondaryText }}>
                                {(recommendations || []).slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

// ChartCard
const ChartCard = ({ title, result, pct, takeaway, chart, insights }) => (
    <div className="bg-white rounded-lg border p-4 flex flex-col" style={{ borderColor: COLORS.border }}>
        <ResultPanel title={title} text={result} pct={pct} />
        <div className="mt-2"><Takeaway text={takeaway} /></div>
        <div className="mt-3 h-56">{chart}</div>
        <InsightList list={insights} />
    </div>
);

const BalanceSheetDashboard = ({ balance_sheet }) => {
    if (!Array.isArray(balance_sheet) || balance_sheet.length < 2) return <div className="p-6">No balance sheet data</div>;

    const headers = balance_sheet[0].slice(1);
    const years = headers;
    const latestIdx = Math.max(0, years.length - 1);
    const prevIdx = Math.max(0, latestIdx - 1);

    // build row map
    const rowMap = useMemo(() => {
        const map = {};
        balance_sheet.slice(1).forEach((r) => { map[normalizeKey(r[0])] = r.slice(1).map(parseNumber); });
        return map;
    }, [balance_sheet]);

    const get = (name) => rowMap[normalizeKey(name)] || Array(years.length).fill(0);

    // key metrics
    const totalAssetsSeries = get('total assets');
    const totalLiabilitiesSeries = get('total liabilities');
    const totalAssets = totalAssetsSeries[latestIdx] || 0;
    const totalLiabilities = totalLiabilitiesSeries[latestIdx] || 0;
    const equityCapital = get('equity capital')[latestIdx] || 0;
    const reserves = get('reserves')[latestIdx] || 0;
    const borrowings = get('borrowings')[latestIdx] || 0;
    const otherLiabilities = get('other liabilities')[latestIdx] || 0;

    const debtToEquity = (borrowings + otherLiabilities) / Math.max(1, equityCapital + reserves);
    const equityRatio = (equityCapital + reserves) / Math.max(1, totalAssets);
    const totalAssetsPrev = totalAssetsSeries[prevIdx] || 0;
    const totalAssetsGrowth = totalAssetsPrev > 0 ? ((totalAssets - totalAssetsPrev) / totalAssetsPrev) * 100 : 0;

    // NLP AI
    const ai = useMemo(() => generateBalanceSheetInsights({ balance_sheet }), [balance_sheet]);
    const pct = {
        total_assets: ai?.meta?.stats?.total_assets?.pct,
        total_liabilities: ai?.meta?.stats?.total_liabilities?.pct,
        borrowings: ai?.meta?.stats?.borrowings?.pct,
    };

    // chart definitions
    const assetsRows = ['fixed assets', 'cwip', 'investments', 'other assets'];
    const liabilitiesRows = ['equity capital', 'reserves', 'borrowings', 'other liabilities'];

    const baseOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(200,200,200,0.2)' } } } };
    const stackedOptions = { ...baseOptions, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: 'rgba(200,200,200,0.2)' } } } };

    const chartAssetsTrend = { labels: years, datasets: assetsRows.map((n, i) => ({ label: n, data: get(n), borderColor: ['#10b981', '#f59e0b', '#3b82f6', '#6b7280'][i], backgroundColor: 'transparent', tension: 0.3 })) };
    const chartLiabilitiesTrend = { labels: years, datasets: liabilitiesRows.map((n, i) => ({ label: n, data: get(n), borderColor: ['#2563eb', '#4f46e5', '#ef4444', '#f97316'][i], backgroundColor: 'transparent', tension: 0.3 })) };
    const chartAssetsComposition = { labels: years, datasets: assetsRows.map((n, i) => ({ label: n, data: get(n), backgroundColor: ['#059669', '#f59e0b', '#3b82f6', '#9ca3af'][i] })) };
    const chartLiabilitiesComposition = { labels: years, datasets: liabilitiesRows.map((n, i) => ({ label: n, data: get(n), backgroundColor: ['#2563eb', '#4f46e5', '#ef4444', '#f97316'][i] })) };

    const chartLatestAssets = { labels: assetsRows, datasets: [{ data: assetsRows.map(n => get(n)[latestIdx] || 0), backgroundColor: ['#059669', '#f59e0b', '#3b82f6', '#9ca3af'] }] };
    const chartLatestLiabilities = { labels: liabilitiesRows, datasets: [{ data: liabilitiesRows.map(n => get(n)[latestIdx] || 0), backgroundColor: ['#2563eb', '#4f46e5', '#ef4444', '#f97316'] }] };

    const chartAssetsVsLiabilities = { labels: years, datasets: [{ label: 'Total Assets', data: totalAssetsSeries, backgroundColor: 'rgba(37,99,235,0.6)' }, { label: 'Total Liabilities', data: totalLiabilitiesSeries, backgroundColor: 'rgba(239,68,68,0.6)' }] };

    const yoyChange = years.map((_, i) => i === 0 ? 0 : Math.round(((totalAssetsSeries[i] - totalAssetsSeries[i - 1]) / Math.max(1, totalAssetsSeries[i - 1])) * 100));
    const chartYoY = { labels: years, datasets: [{ label: 'YoY % Change - Total Assets', data: yoyChange, backgroundColor: yoyChange.map(v => v >= 0 ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)') }] };

    // layout
    return (
        <div className="space-y-6">
            <SummaryPanel ai={ai} />

            <div className="flex flex-wrap gap-4">
                {[
                    { label: "Total Assets", value: totalAssets, icon: <PiBankThin size="100%" /> },
                    { label: "Total Liabilities", value: totalLiabilities, icon: < PiCreditCardLight size="100%" /> },
                    { label: "Equity + Reserves", value: equityCapital + reserves, icon: <PiTrendUpThin size="100%" /> },
                    { label: "Borrowings", value: borrowings, icon: <PiPiggyBankThin size="100%" /> },
                    { label: "Debt to Equity", value: debtToEquity.toFixed(2), icon: <PiCreditCardLight size="100%" /> },
                    { label: "Equity Ratio", value: `${(equityRatio * 100).toFixed(1)}%`, icon: <PiMathOperationsThin size="100%" /> },
                    { label: "Assets Growth", value: `${totalAssetsGrowth.toFixed(1)}%`, icon: <FcComboChart size="100%" /> },
                ].map((c, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border min-w-[220px] flex-1" style={{ borderColor: COLORS.border }}>
                        <div className="flex items-center gap-[10px]">
                            <div className="h-7 w-7">{c.icon}</div>
                            <div className="text-sm text-gray-500">{c.label}</div>
                        </div>
                        <div className="text-2xl font-semibold" style={{ color: COLORS.primary }}>{c.value}</div>
                        <div className="text-xs text-gray-500 mt-1">As of {years[latestIdx]}</div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChartCard
                    title="Assets Trend Result"
                    result={ai?.summaries?.total_assets}
                    pct={pct.total_assets}
                    takeaway="Shows how company assets evolved over time."
                    chart={<Line data={chartAssetsTrend} options={baseOptions} />}
                    insights={ai?.perMetric?.total_assets}
                />

                <ChartCard
                    title="Liabilities & Equity Result"
                    result={ai?.summaries?.total_liabilities}
                    pct={pct.total_liabilities}
                    takeaway="Shows long-term liabilities, debt & equity build-up."
                    chart={<Line data={chartLiabilitiesTrend} options={baseOptions} />}
                    insights={ai?.perMetric?.total_liabilities}
                />

                <ChartCard
                    title="Assets Composition"
                    result={ai?.summaries?.assets_composition}
                    pct={null}
                    takeaway="Breakdown of major asset classes."
                    chart={<Bar data={chartAssetsComposition} options={stackedOptions} />}
                    insights={ai?.perMetric?.fixed_assets}
                />

                <ChartCard
                    title="Liabilities Composition"
                    result={ai?.summaries?.liabilities_composition}
                    pct={pct.total_liabilities}
                    takeaway="Equity, reserves, debt and other liabilities."
                    chart={<Bar data={chartLiabilitiesComposition} options={stackedOptions} />}
                    insights={ai?.perMetric?.borrowings}
                />

                <ChartCard
                    title="Assets Breakdown (Latest)"
                    result={ai?.summaries?.assets_breakdown}
                    pct={null}
                    takeaway="Contribution of each asset segment."
                    chart={<Doughnut data={chartLatestAssets} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />}
                    insights={ai?.perMetric?.fixed_assets}
                />

                <ChartCard
                    title="Liabilities Breakdown (Latest)"
                    result={ai?.summaries?.liabilities_breakdown}
                    pct={null}
                    takeaway="Latest year debt vs equity composition."
                    chart={<Doughnut data={chartLatestLiabilities} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />}
                    insights={ai?.perMetric?.borrowings}
                />

                <ChartCard
                    title="Assets vs Liabilities"
                    result={ai?.summaries?.assets_vs_liabilities}
                    pct={pct.total_assets}
                    takeaway="Absolute solvency comparison."
                    chart={<Bar data={chartAssetsVsLiabilities} options={baseOptions} />}
                    insights={[...(ai?.perMetric?.total_assets || []), ...(ai?.perMetric?.total_liabilities || [])]}
                />

                <ChartCard
                    title="YoY Assets Change"
                    result={ai?.summaries?.yoy_assets}
                    pct={pct.total_assets}
                    takeaway="Yearly % growth/decline in total assets."
                    chart={<Bar data={chartYoY} options={baseOptions} />}
                    insights={ai?.perMetric?.total_assets}
                />
            </div>
            <div className="bg-linear-90 from-[#f38ca8] via-[#fab387] to-[#a8e2a1] p-[2.5px] rounded-[13px]">
                <div className="bg-white p-4 rounded-[10px]" style={{ borderColor: COLORS.border }}>
                    <h3 className="text-xl font-semibold mb-4" style={{color:COLORS.titleText}}>Balance Sheet Signals & Recommendations</h3>
                    <p className="text-[15px] text-gray-700 mb-2" style={{color:COLORS.secondaryText}}>{ai?.relationships?.[0]}</p>
                    <ul className="text-[15px] list-disc ml-5" style={{color:COLORS.secondaryText}}>
                        {(ai?.recommendations || []).map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default BalanceSheetDashboard;
