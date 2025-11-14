import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/common/header";
import { rateLimitedFetch, fetchHistoricalData, BASE_URL, API_KEY } from "../utils/apiClient";
import DataTable from "../components/common/data-table";
import QuarterlyResultsChart from "../components/quaterly-results";
import { COLORS } from "../constants";
import ProfitLossDashboard from "../components/p&l-dashboard";
import ShareholdingCharts from "../components/share-holding-dashboard";
import BalanceSheetDashboard from "../components/balance-sheet-dashboard";
import CashFlowDashboard from "../components/cashflow-dashboard";
import ROCEDashboard from "../components/roce-dashboard";
import HistoricalDashboard from "../components/historicals-dashboard";
import { FiTrendingUp, FiBarChart2, FiActivity, FiPieChart, FiLayers } from "react-icons/fi";
import { GiPriceTag } from "react-icons/gi";

const CompanyDetails = () => {
  const { symbol } = useParams();
  const [company, setCompany] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [viewModeQR, setViewModeQR] = useState(true);
  const [viewModePL, setViewModePL] = useState(true);
  const [viewModeSH, setViewModeSH] = useState(true);
  const [viewModeBS, setViewModeBS] = useState(true);
  const [viewModeCF, setViewModeCF] = useState(true);
  const [viewModeDashboard, setViewModeDashboard] = useState(true);
  const [viewModeRatios, setViewModeRatios] = useState(true);
  const [shareholdingTab, setShareholdingTab] = useState("quarterly");
  const [count, setCount] = useState(60);

  const handleDashboardView = () => {
    setViewModeBS(!viewModeBS);
    setViewModeCF(!viewModeCF);
    setViewModePL(!viewModePL);
    setViewModeQR(!viewModeQR);
    setViewModeRatios(!viewModeRatios);
    setViewModeSH(!viewModeSH);
    setViewModeDashboard(!viewModeDashboard);
  };

  useEffect(() => {
    if (count === 0) return;

    const timer = setInterval(() => {
      setCount(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [count]);


  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        const data = await rateLimitedFetch(
          `${BASE_URL}/financials/${symbol}?api_key=${API_KEY}`,
          `company_${symbol}_cache`,
          "details"
        );
        setCompany(data);

        // Load historicals separately
        const historical = await fetchHistoricalData(symbol);
        setHistoricalData(historical?.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [symbol]);

  if (loading) return <div>
    <div>
      <div className="w-full h-20 bg-gray-100 animate-pulse mb-5"></div>
      <div className="flex flex-col gap-1 px-5">
        <div className="w-1/3 h-10 bg-gray-100 animate-pulse mb-3 rounded-md"></div>
        <div className="w-full h-3 bg-gray-100 animate-pulse rounded-full"></div>
        <div className="w-full h-3 bg-gray-100 animate-pulse rounded-full"></div>
        <div className="w-full h-3 bg-gray-100 animate-pulse rounded-full"></div>
        <div className="w-full h-3 bg-gray-100 animate-pulse rounded-full"></div>
        <div className="w-full h-3 bg-gray-100 animate-pulse rounded-full"></div>
      </div>
      <div className="py-10 px-5">
        <div className="w-1/5 h-9 bg-gray-100 animate-pulse mb-5 rounded-md"></div>
        <div className="flex gap-5 flex-wrap w-full">
          <div className="flex-1 h-30 bg-gray-100 animate-pulse mb-3 rounded-md border border-[#D1D5DB]"></div>
          <div className="flex-1 h-30 bg-gray-100 animate-pulse mb-3 rounded-md border border-[#D1D5DB]"></div>
          <div className="flex-1 h-30 bg-gray-100 animate-pulse mb-3 rounded-md border border-[#D1D5DB]"></div>
          <div className="flex-1 h-30 bg-gray-100 animate-pulse mb-3 rounded-md border border-[#D1D5DB]"></div>
          <div className="flex-1 h-30 bg-gray-100 animate-pulse mb-3 rounded-md border border-[#D1D5DB]"></div>
        </div>
      </div>
      <div className="bg-gray-100 rounded-md border border-[#D1D5DB] animate-pulse h-[220px] mb-10 mx-5"></div>
      <div className="bg-gray-100 rounded-md border border-[#D1D5DB] animate-pulse h-90 mx-5"></div>

    </div>
  </div>;
  if (error) return <div>{error}</div>;
  if (!company || !company.data) return <div className="flex items-center justify-center w-full h-screen text-3xl text-[#6B7280]">
    We have API Limit...! Please <span className="text-3xl font-semibold text-cyan-900 mx-3"> {count === 0 ? "Refresh Now" :`Refresh After ${count}`}</span>
  </div>;

  const financials = company.data;

  const importantMetrics = [
    { key: "Current Price", icon: <GiPriceTag size="100%" color={COLORS.icon} /> },
    { key: "Market Cap", icon: <FiBarChart2 size="100%" color={COLORS.icon} /> },
    { key: "P/E", icon: <FiTrendingUp size="100%" color={COLORS.icon} /> },
    { key: "High / Low", icon: <FiActivity size="100%" color={COLORS.icon} /> },
    { key: "ROE", icon: <FiPieChart size="100%" color={COLORS.icon} /> },
    { key: "ROCE", icon: <FiLayers size="100%" color={COLORS.icon} /> },
  ];

  const TopRatioCard = ({ title, value, hint, icon }) => (
    <div className={`bg-white p-4 rounded-[10px] border border-[${COLORS.border}] min-w-[280px] flex-1`}>
      <div className="flex items-center gap-1.5 pb-1">
        <div className="h-6 w-6">{icon || ""}</div>
        <div style={{ color: COLORS.titleText }} className="text-md font-medium line-clamp-1">{title}</div>
      </div>
      <div style={{ color: COLORS.primary }} className="text-3xl font-semibold pb-1">{value || ""}</div>
      <div style={{ color: COLORS.success }} className="text-sm font-normal">{hint || ""}</div>
    </div>
  );

  return (
    <div className="pb-6">
      <Header
        hideCount
        children={
          <div className="flex items-center justify-end">
            <div
              onClick={handleDashboardView}
              className="px-3 py-2 rounded-[10px] border border-[#D1D5DB] cursor-pointer"
            >
              {viewModeDashboard ? "📊 Dashboard Mode" : "📋 Table Mode"}
            </div>
          </div>
        }
      />
      <div className="px-9 pt-6">
        <div style={{ color: COLORS.companyTitle }} className={`text-2xl font-bold pb-5 leading-normal`}>{company.company}</div>
        <p style={{ color: COLORS.companyDescription }} className={`text-sm text-[${COLORS.secondaryText}] leading-normal`}>{financials?.about}</p>

        {/* Top Ratios */}
        <div className="py-6">
          <h2 className="text-lg font-semibold mb-2">Top Ratios</h2>
          <div className="flex flex-wrap w-full gap-4">
            {importantMetrics.map(({ key, icon }) =>
              financials?.top_ratios?.[key] && (
                <TopRatioCard key={key} title={key} value={financials.top_ratios[key]} icon={icon} />
              )
            )}
          </div>
        </div>

        {/* Historical Data */}
        <HistoricalDashboard historicalData={historicalData} />

        {/* Quarterly Results */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Quarterly Results</h2>
          <button
            className={`text-sm text-${COLORS.titleText} font-medium px-3 py-2 rounded-[5px] border border-[${COLORS.border}] cursor-pointer`}
            onClick={() => setViewModeQR(!viewModeQR)}
          >
            {viewModeQR ? "📊 Show Chart" : "📋 Show Table"}
          </button>
        </div>
        {viewModeQR ? (
          <DataTable data={financials?.quaterly_results} />
        ) : (
          <QuarterlyResultsChart quarterlyData={financials?.quaterly_results} />
        )}

        {/* Profit & Loss */}
        <div className="flex items-center justify-between mb-3 mt-8">
          <h2 className="text-lg font-semibold">Profit & Loss</h2>
          <button
            className={`text-sm text-${COLORS.titleText} font-medium px-3 py-2 rounded-[5px] border border-[${COLORS.border}] cursor-pointer`}
            onClick={() => setViewModePL(!viewModePL)}
          >
            {viewModePL ? "📊 Show Chart" : "📋 Show Table"}
          </button>
        </div>
        {viewModePL ? (
          <DataTable data={financials?.profit_and_loss} />
        ) : (
          <ProfitLossDashboard profitLossData={financials?.profit_and_loss} />
        )}

        {/* Balance Sheet */}
        <div className="flex items-center justify-between mb-3 mt-8">
          <h2 className="text-lg font-semibold">Balance Sheet</h2>
          <button
            className={`text-sm text-${COLORS.titleText} font-medium px-3 py-2 rounded-[5px] border border-[${COLORS.border}] cursor-pointer`}
            onClick={() => setViewModeBS(!viewModeBS)}
          >
            {viewModeBS ? "📊 Show Chart" : "📋 Show Table"}
          </button>
        </div>
        {viewModeBS ? (
          <DataTable data={financials?.balance_sheet} />
        ) : (
          <BalanceSheetDashboard balance_sheet={financials?.balance_sheet} />
        )}

        {/* Cash Flows */}
        <div className="flex items-center justify-between mb-3 mt-8">
          <h2 className="text-lg font-semibold">Cash Flows</h2>
          <button
            className={`text-sm text-${COLORS.titleText} font-medium px-3 py-2 rounded-[5px] border border-[${COLORS.border}] cursor-pointer`}
            onClick={() => setViewModeCF(!viewModeCF)}
          >
            {viewModeCF ? "📊 Show Chart" : "📋 Show Table"}
          </button>
        </div>
        {viewModeCF ? (
          <DataTable data={financials?.cash_flows} />
        ) : (
          <CashFlowDashboard data={financials?.cash_flows} />
        )}

        {/* Ratios */}
        <div className="flex items-center justify-between mb-3 mt-8">
          <h2 className="text-lg font-semibold">Ratios</h2>
          <button
            className={`text-sm text-${COLORS.titleText} font-medium px-3 py-2 rounded-[5px] border border-[${COLORS.border}] cursor-pointer`}
            onClick={() => setViewModeRatios(!viewModeRatios)}
          >
            {viewModeRatios ? "📊 Show Chart" : "📋 Show Table"}
          </button>
        </div>
        {viewModeRatios ? (
          <DataTable data={financials?.ratios} />
        ) : (
          <ROCEDashboard ratios={financials?.ratios} />
        )}

        {/* Shareholding */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">Shareholding</h2>
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 text-sm font-medium cursor-pointer ${shareholdingTab === "quarterly" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-gray-800"
                  }`}
                onClick={() => setShareholdingTab("quarterly")}
              >
                Quarterly
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium cursor-pointer ${shareholdingTab === "yearly" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-gray-800"
                  }`}
                onClick={() => setShareholdingTab("yearly")}
              >
                Yearly
              </button>
            </div>
            <button
              className={`text-sm text-${COLORS.titleText} font-medium px-3 py-2 rounded-[5px] border border-[${COLORS.border}] cursor-pointer`}
              onClick={() => setViewModeSH(!viewModeSH)}
            >
              {viewModeSH ? "📊 Show Chart" : "📋 Show Table"}
            </button>
          </div>
          {shareholdingTab === "quarterly" ? (
            viewModeSH ? <DataTable data={financials?.shareholding_quarterly} /> : <ShareholdingCharts data={financials?.shareholding_quarterly} />
          ) : (
            viewModeSH ? <DataTable data={financials?.shareholding_yearly} /> : <ShareholdingCharts data={financials?.shareholding_yearly} />
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Last Updated: {financials?.last_updated_at ? new Date(financials.last_updated_at).toLocaleString() : "N/A"}
        </p>
      </div>
    </div>
  );
};

export default CompanyDetails;
