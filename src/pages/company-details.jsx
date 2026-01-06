import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/common/header";
import {
  rateLimitedFetch,
  fetchHistoricalData,
  BASE_URL,
  API_KEY,
} from "../utils/apiClient";
import DataTable from "../components/common/data-table";
import QuarterlyResultsChart from "../components/quaterly-results";
import ProfitLossDashboard from "../components/p&l-dashboard";
import ShareholdingCharts from "../components/share-holding-dashboard";
import BalanceSheetDashboard from "../components/dashboards/balance-sheet/balance-sheet-dashboard";
import CashFlowDashboard from "../components/cashflow-dashboard";
import ROCEDashboard from "../components/roce-dashboard";
import HistoricalDashboard from "../components/dashboards/historical/historicals-dashboard";
import { COLORS } from "../constants";
import {
  FiTrendingUp,
  FiBarChart2,
  FiActivity,
  FiPieChart,
  FiLayers,
} from "react-icons/fi";
import { GiPriceTag } from "react-icons/gi";
import { motion } from "framer-motion";
import Animate from "../components/common/animate";
import SplashCursor from "../components/SplashCursor"
/* =====================================================
   Loader
===================================================== */
const Loader = () => (
  <div>
    <div className="w-full h-20 bg-gray-100 animate-pulse mb-5"></div>
    <div className="flex flex-col gap-1 px-5">
      <div className="w-1/3 h-10 bg-gray-100 animate-pulse mb-3 rounded-md"></div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-full h-3 bg-gray-100 animate-pulse rounded-full"
        />
      ))}
    </div>
  </div>
);

/* =====================================================
   Section Toggle
===================================================== */
const Section = ({ title, show, onToggle, table, chart }) => (
  <Animate>
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

      <motion.div
        key={show ? "table" : "chart"}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {show ? table : chart}
      </motion.div>
    </div>
  </Animate>
);

/* =====================================================
   Constants
===================================================== */
const COUNTDOWN_SECONDS = 60;
const importantMetrics = [
  { key: "Current Price", icon: <GiPriceTag color={COLORS.icon} /> },
  { key: "Market Cap", icon: <FiBarChart2 color={COLORS.icon} /> },
  { key: "P/E", icon: <FiTrendingUp color={COLORS.icon} /> },
  { key: "High / Low", icon: <FiActivity color={COLORS.icon} /> },
  { key: "ROE", icon: <FiPieChart color={COLORS.icon} /> },
  { key: "ROCE", icon: <FiLayers color={COLORS.icon} /> },
];

/* =====================================================
   MAIN COMPONENT
===================================================== */
const CompanyDetails = () => {
  const { symbol } = useParams();

  const [company, setCompany] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getRemainingSeconds = (endTime) => {
    if (!endTime) return COUNTDOWN_SECONDS;
    const remaining = Math.floor((Number(endTime) - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  };
  const [count, setCount] = useState(() => {
    const savedEndTime = localStorage.getItem(`countdown_end_${symbol}`);
    return getRemainingSeconds(savedEndTime);
  });

  const [view, setView] = useState({
    qr: true,
    pl: true,
    sh: true,
    bs: true,
    cf: true,
    ratios: true,
  });
    const [isDashboardMode, setIsDashboardMode] = useState(true);

  const toggle = (key) =>
    setView((prev) => ({ ...prev, [key]: !prev[key] }));

  /* ---------------- Load Data ---------------- */
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


  const isApiLimited =
    !loading && company && company.data === undefined;

  useEffect(() => {
    if (!loading && company?.data) {
      localStorage.removeItem(`countdown_end_${symbol}`);
      localStorage.removeItem(`refreshed_once_${symbol}`);
      setCount(COUNTDOWN_SECONDS);
      return;
    }

    if (!isApiLimited) return;

    let endTime = localStorage.getItem(`countdown_end_${symbol}`);

    if (!endTime) {
      endTime = Date.now() + COUNTDOWN_SECONDS * 1000;
      localStorage.setItem(`countdown_end_${symbol}`, endTime);
    }

    setCount(getRemainingSeconds(endTime));

    const timer = setInterval(() => {
      const remaining = getRemainingSeconds(endTime);
      setCount(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        localStorage.removeItem(`countdown_end_${symbol}`);

        const refreshed = localStorage.getItem(`refreshed_once_${symbol}`);
        if (!refreshed) {
          localStorage.setItem(`refreshed_once_${symbol}`, "1");
          window.location.reload();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [symbol, loading, company, isApiLimited]);
  if (loading) return <Loader />;
  if (error)
    return <div className="text-center text-red-600">{error}</div>;

  if (!company?.data) {
    const progress =
      ((COUNTDOWN_SECONDS - count) / COUNTDOWN_SECONDS) * 100;

    return (
      <div className="flex flex-col items-center justify-center w-full h-screen px-6">
        <h1 className="text-3xl font-semibold text-gray-600 mb-4">
          API Limit Reached
        </h1>

        <div className="w-full max-w-md bg-gray-200 rounded-full h-3 overflow-hidden mb-3">
          <div
            className="h-3 bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-lg text-gray-500">
          Refreshing in <b>{count}s</b>
        </p>
      </div>
    );
  }
  if (!company?.data) return null;

  const financials = company.data;


  return (
    <div className="pb-6">
      <SplashCursor/>
      <Header hideCount
        children={
          <button
            onClick={() => {
              setIsDashboardMode(!isDashboardMode)
              const newState = Object.fromEntries(
                Object.entries(view).map(([k, v]) => [k, !v])
              );
              setView(newState);

            }}
            className="px-[6px] py-[3px] text-[14px] font-medium rounded border cursor-pointer"
            style={{
              color: COLORS.secondaryText,
              borderColor: COLORS.border,
            }}
          >
            {isDashboardMode ? "📊 Dashboard Mode" : "📋 Table Mode"}
          </button>
        } />

      <div className="md:px-6 pt-6 px-3">
        <Animate>
          <h1
            className="text-2xl font-bold mb-3"
            style={{ color: COLORS.companyTitle }}
          >
            {company.company}
          </h1>

          <p
            className="text-sm leading-normal"
            style={{ color: COLORS.companyDescription }}
          >
            {financials.about}
          </p>
        </Animate>
        <div className="pt-4">
          <div
            className="sm:flex flex-wrap gap-4 sm:justify-around rounded-[10px] mt-2 border"
            style={{ borderColor: COLORS.border }}
          >
            {importantMetrics.map(({ key, icon }, i) =>
              financials.top_ratios?.[key] ? (
                <Animate key={key} delay={i * 0.06}>
                  <div className="p-6">
                    <div className="flex gap-2 mb-1 items-center">
                      {icon}
                      <span className="text-md font-medium">{key}</span>
                    </div>
                    <div className="text-3xl font-semibold text-blue-800">
                      {financials.top_ratios[key]}
                    </div>
                  </div>
                </Animate>
              ) : null
            )}
          </div>
        </div>
        <Section
          title="Balance Sheet"
          show={view.bs}
          onToggle={() => toggle("bs")}
          table={<DataTable data={financials.balance_sheet} />}
          chart={
            <BalanceSheetDashboard
              balance_sheet={financials.balance_sheet}
            />
          }
        />

        <Animate className="mt-4">
          <HistoricalDashboard historicalData={historicalData} />
        </Animate>

        <Section
          title="Quarterly Results"
          show={view.qr}
          onToggle={() => toggle("qr")}
          table={<DataTable data={financials.quaterly_results} />}
          chart={
            <QuarterlyResultsChart
              quarterlyData={financials.quaterly_results}
            />
          }
        />

        <Section
          title="Profit & Loss"
          show={view.pl}
          onToggle={() => toggle("pl")}
          table={<DataTable data={financials.profit_and_loss} />}
          chart={
            <ProfitLossDashboard
              profitLossData={financials.profit_and_loss}
            />
          }
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
          chart={
            <ShareholdingCharts
              data={financials.shareholding_quarterly}
            />
          }
        />
        <Animate>
          <p className="text-xs text-gray-400 mt-4">
            Last Updated:{" "}
            {financials.last_updated_at
              ? new Date(financials.last_updated_at).toLocaleString()
              : "N/A"}
          </p>

          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#6B7280] pt-3">
              Educational project with standalone data.
            </p>
            <p className="text-[14px] text-[#6B7280] pt-3">
              Made With 💚 by Raghavendra
            </p>
          </div>
        </Animate>
      </div>
    </div>
  );
};

export default CompanyDetails;
