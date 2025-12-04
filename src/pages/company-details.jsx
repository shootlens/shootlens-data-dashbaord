import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/common/header";
import { rateLimitedFetch, fetchHistoricalData, BASE_URL, API_KEY } from "../utils/apiClient";
import DataTable from "../components/common/data-table";
import QuarterlyResultsChart from "../components/quaterly-results";
import ProfitLossDashboard from "../components/p&l-dashboard";
import ShareholdingCharts from "../components/share-holding-dashboard";
import BalanceSheetDashboard from "../components/dashboards/balance-sheet/balance-sheet-dashboard";
import CashFlowDashboard from "../components/cashflow-dashboard";
import ROCEDashboard from "../components/roce-dashboard";
import HistoricalDashboard from "../components/dashboards/historical/historicals-dashboard";
import { COLORS } from "../constants";
import { FiTrendingUp, FiBarChart2, FiActivity, FiPieChart, FiLayers } from "react-icons/fi";
import { GiPriceTag } from "react-icons/gi";

/* ---------------------------------------------------
   🔹 Loader Component
----------------------------------------------------*/
const Loader = () => (
  <div>
    <div className="w-full h-20 bg-gray-100 animate-pulse mb-5"></div>
    <div className="flex flex-col gap-1 px-5">
      <div className="w-1/3 h-10 bg-gray-100 animate-pulse mb-3 rounded-md"></div>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="w-full h-3 bg-gray-100 animate-pulse rounded-full"></div>
      ))}
    </div>

    <div className="py-10 px-5">
      <div className="w-1/5 h-9 bg-gray-100 animate-pulse mb-5 rounded-md"></div>
      <div className="flex gap-5 flex-wrap w-full">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex-1 h-30 bg-gray-100 animate-pulse mb-3 rounded-md border" style={{ borderColor: COLORS.border }}></div>
        ))}
      </div>
    </div>

    <div className="bg-gray-100 rounded-md border animate-pulse h-[220px] mb-10 mx-5" style={{ borderColor: COLORS.border }}></div>
    <div className="bg-gray-100 rounded-md border animate-pulse h-90 mx-5" style={{ borderColor: COLORS.border }}></div>
  </div>
);

const Section = ({ title, show, onToggle, table, chart }) => (
  <div className="mt-8">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <button
        onClick={onToggle}
        className="px-[6px] py-[3px] text-[14px] font-medium rounded border cursor-pointer"
        style={{ color: COLORS.secondaryText, borderColor: COLORS.border }}
      >
        {show ? "📊 Show Chart" : "📋 Show Table"}
      </button>
    </div>

    {show ? table : chart}
  </div>
);

/* ---------------------------------------------------
   🔹 Main Component
----------------------------------------------------*/
const importantMetrics = [
  { key: "Current Price", icon: <GiPriceTag size="100%" color={COLORS.icon} /> },
  { key: "Market Cap", icon: <FiBarChart2 size="100%" color={COLORS.icon} /> },
  { key: "P/E", icon: <FiTrendingUp size="100%" color={COLORS.icon} /> },
  { key: "High / Low", icon: <FiActivity size="100%" color={COLORS.icon} /> },
  { key: "ROE", icon: <FiPieChart size="100%" color={COLORS.icon} /> },
  { key: "ROCE", icon: <FiLayers size="100%" color={COLORS.icon} /> },
];

const CompanyDetails = () => {
  const { symbol } = useParams();

  const [company, setCompany] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [view, setView] = useState({
    qr: true,
    pl: true,
    sh: true,
    bs: true,
    cf: true,
    ratios: true,
    dashboard: true,
  });

  const toggle = (key) => setView((prev) => ({ ...prev, [key]: !prev[key] }));

  /* ---------------------------------------------------
     🔥 FIXED COUNTDOWN SYSTEM (timestamp-based)
  ----------------------------------------------------*/
  const COUNTDOWN_SECONDS = 60;

  const [count, setCount] = useState(() => {
    const endTime = localStorage.getItem(`countdown_end_${symbol}`);
    if (endTime) {
      const remaining = Math.floor((Number(endTime) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return COUNTDOWN_SECONDS;
  });

  useEffect(() => {
    let endTime = localStorage.getItem(`countdown_end_${symbol}`);
    let hasRefreshed = localStorage.getItem(`refreshed_once_${symbol}`);

    // If no endTime exists, create one
    if (!endTime) {
      endTime = Date.now() + COUNTDOWN_SECONDS * 1000;
      localStorage.setItem(`countdown_end_${symbol}`, endTime);
    }

    const timer = setInterval(() => {
      const remaining = Math.floor((Number(endTime) - Date.now()) / 1000);
      setCount(remaining > 0 ? remaining : 0);

      if (remaining <= 0) {
        clearInterval(timer);

        // Remove countdown from localStorage
        localStorage.removeItem(`countdown_end_${symbol}`);

        // Refresh only ONE time
        if (!hasRefreshed) {
          localStorage.setItem(`refreshed_once_${symbol}`, "1");
          window.location.reload();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [symbol]);


  /* ---------------------------------------------------
     🔹 Load API
  ----------------------------------------------------*/
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const data = await rateLimitedFetch(
          `${BASE_URL}/financials/${symbol}?api_key=${API_KEY}`,
          `company_${symbol}_cache`,
          "details"
        );
        setCompany(data);

        const historical = await fetchHistoricalData(symbol);
        setHistoricalData(historical?.data || []);
      } catch (err) {
        setError(err?.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [symbol]);

  /* ---------------------------------------------------
     🔹 Error / Limit Handling
  ----------------------------------------------------*/
  if (loading) return <Loader />;
  if (error) return <div className="text-center text-red-600">{error}</div>;

  if (!company?.data)
    return (
      <div className="flex items-center justify-center w-full h-screen text-3xl text-gray-500 flex-wrap">
        API Limit!
        <span className="text-cyan-900 mx-3">
          {count === 0 ? "Refresh Now" : `Refresh After ${count}`}
        </span>
      </div>
    );

  const financials = company.data;
  return (
    <div className="pb-6">
      <Header
        hideCount
        children={
          <button
            onClick={() => {
              const newState = Object.fromEntries(
                Object.entries(view).map(([k, v]) => [k, !v])
              );
              setView(newState);
            }}
            className="px-[6px] py-[3px] text-[14px] font-medium rounded border cursor-pointer"
            style={{ color: COLORS.secondaryText, borderColor: COLORS.border }}
          >
            {view.dashboard ? "📊 Dashboard Mode" : "📋 Table Mode"}
          </button>
        }
      />

      <div className="md:px-6 pt-6 px-3">
        {/* <h1 className="text-2xl font-bold mb-3" style={{ color: COLORS.companyTitle }}>
          {company.company}
        </h1> */}

        {/* <p className="text-sm leading-normal" style={{ color: COLORS.companyDescription }}>
          {financials.about}
        </p> */}

        {/* Top Ratios */}
        <div className="py-6">
          <h2 className="text-lg font-semibold mb-2">Top Ratios</h2>

          <div className="flex flex-wrap gap-4">
            {importantMetrics.map(({ key, icon }) =>
              financials.top_ratios?.[key] ? (
                <div
                  key={key}
                  className="bg-white p-4 rounded-lg border min-w-[260px] flex-1"
                  style={{ borderColor: COLORS.border }}
                >
                  <div className="flex gap-2 mb-1 items-center">
                    <div className="h-6 w-6">{icon}</div>
                    <span className="text-md font-medium">{key}</span>
                  </div>
                  <div className="text-3xl font-semibold text-blue-800">
                    {financials.top_ratios[key]}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>

        {/* Historical */}
        <HistoricalDashboard historicalData={historicalData} />

        {/* Sections */}
        <Section
          title="Quarterly Results"
          show={view.qr}
          onToggle={() => toggle("qr")}
          table={<DataTable data={financials.quaterly_results} />}
          chart={<QuarterlyResultsChart quarterlyData={financials.quaterly_results} />}
        />

        <Section
          title="Profit & Loss"
          show={view.pl}
          onToggle={() => toggle("pl")}
          table={<DataTable data={financials.profit_and_loss} />}
          chart={<ProfitLossDashboard profitLossData={financials.profit_and_loss} />}
        />

        <Section
          title="Balance Sheet"
          show={view.bs}
          onToggle={() => toggle("bs")}
          table={<DataTable data={financials.balance_sheet} />}
          chart={<BalanceSheetDashboard balance_sheet={financials.balance_sheet} />}
        />

        <Section
          title="Cash Flow"
          show={view.cf}
          onToggle={() => toggle("cf")}
          table={<DataTable data={financials.cash_flows} />}
          chart={<CashFlowDashboard data={financials.cash_flows} />}
        />

        <Section
          title="Ratios"
          show={view.ratios}
          onToggle={() => toggle("ratios")}
          table={<DataTable data={financials.ratios} />}
          chart={<ROCEDashboard ratios={financials.ratios} />}
        />

        <Section
          title="Shareholding"
          show={view.sh}
          onToggle={() => toggle("sh")}
          table={<DataTable data={financials.shareholding_quarterly} />}
          chart={<ShareholdingCharts data={financials.shareholding_quarterly} />}
        />

        <p className="text-xs text-gray-400 mt-4">
          Last Updated:{" "}
          {financials.last_updated_at
            ? new Date(financials.last_updated_at).toLocaleString()
            : "N/A"}
        </p>

        <p className="text-[14px] text-[#6B7280] font-medium leading-normal pt-2 pb-3">
          Made With 💚 by Ragava
        </p>
      </div>
    </div>
  );
};

export default CompanyDetails;
