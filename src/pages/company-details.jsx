import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/common/header";
import { rateLimitedFetch, BASE_URL, API_KEY } from "../utils/apiClient";
import DataTable from "../components/common/data-table";
import QuarterlyResultsChart from "../components/quaterly-results";
import { COLORS } from "../constants";
import ProfitLossDashboard from "../components/p&l-dashboard";
import ShareholdingCharts from "../components/share-holding-dashboard";
import BalanceSheetDashboard from "../components/balance-sheet-dashboard";
import CashFlowDashboard from "../components/cashflow-dashboard";
import ROCEDashboard from "../components/roce-dashboard";

const CompanyDetails = () => {
    const { symbol } = useParams();
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewModeQR, setViewModeQR] = useState(true); // Quarterly Results
    const [viewModePL, setViewModePL] = useState(true); // Profit & Loss
    const [viewModeSH, setViewModeSH] = useState(true); // share holding pattern
    const [viewModeBS, setViewModeBS] = useState(true); // Balance Sheet
    const [viewModeCF, setViewModeCF] = useState(true); // Cashflow pattern
    const [viewModeDashboard, setViewModeDashboard] = useState(true); // Cashflow pattern
    const [viewModeRatios, setViewModeRatios] = useState(true); // Cashflow pattern
    const [shareholdingTab, setShareholdingTab] = useState("quarterly"); // Shareholding Tab


    const handleDashboardView = () => {
        setViewModeBS(!viewModeBS);
        setViewModeCF(!viewModeCF);
        setViewModePL(!viewModePL);
        setViewModeQR(!viewModeQR);
        setViewModeRatios(!viewModeRatios);
        setViewModeSH(!viewModeSH);
        setViewModeDashboard(!viewModeDashboard);
    }
    useEffect(() => {
        const loadDetails = async () => {
            try {
                const data = await rateLimitedFetch(
                    `${BASE_URL}/financials/${symbol}?api_key=${API_KEY}`,
                    `company_${symbol}_cache`,
                    "details"
                );
                setCompany(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadDetails();
    }, [symbol]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;
    if (!company || !company.data) return <div>No data found</div>;

    const financials = company.data;
    const importantMetrics = ["Current Price", "Market Cap", "P/E", "High / Low", "ROE", "ROCE"];

    return (
        <div className="pb-6">
            <Header
                hideCount
                children={
                    <div className="flex items-center justify-end">
                        <div onClick={handleDashboardView} className="px-3 py-2 rounded-[10px] border border-[#D1D5DB] cursor-pointer">{`${viewModeDashboard ? "📊 Dashboard Mode" : "📋 Table Mode"}`}</div>
                    </div>
                }
            />
            <div className="px-9 pt-6">
                <div className={`text-2xl text-[${COLORS.titleText}] font-bold pb-5 leading-normal`}>{company.company}</div>
                <p className={`text-sl text-[${COLORS.secondaryText}] leading-normal`}>{financials?.about}</p>
                {/* Top Ratios */}
                <div className="py-6"> <h2 className="text-lg font-semibold mb-2">Top Ratios</h2>
                    <div className="flex flex-wrap w-full gap-4">
                        {Object.entries(financials?.top_ratios || {})
                            .filter(([key]) => importantMetrics.includes(key))
                            .map(([key, value]) => (
                                <div
                                    key={key}
                                    className="flex-1 min-w-[150px] px-6 py-4 border border-[#D1D5DB] rounded-[10px] text-center"
                                >
                                    <div className="text-sm text-gray-500">{key}</div>
                                    <div className="text-lg font-semibold">{value}</div>
                                </div>
                            ))}
                    </div>
                </div>
                {/* Quarterly Results (Toggle View) */}
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Quarterly Results</h2>
                    <button
                        className={`text-sm text-${COLORS.titleText} font-medium px-3 py-2 rounded-[5px] border border-[${COLORS.border}] cursor-pointer`}
                        onClick={() =>
                            setViewModeQR(!viewModeQR)
                        }
                    >
                        {viewModeQR ? "📊 Show Chart" : "📋 Show Table"}
                    </button>
                </div>
                {viewModeQR ? (
                    <DataTable data={financials?.quaterly_results} />
                ) : (
                    <QuarterlyResultsChart quarterlyData={financials?.quaterly_results} />
                )}
                {/* Profit & Loss (Toggle View) */}
                <div className="flex items-center justify-between mb-3 mt-8">
                    <h2 className="text-lg font-semibold">Profit & Loss</h2>
                    <button
                        className={`text-sm text-${COLORS.titleText} font-medium px-3 py-2 rounded-[5px] border border-[${COLORS.border}] cursor-pointer`}
                        onClick={() =>
                            setViewModePL(!viewModePL)
                        }
                    >
                        {viewModePL ? "📊 Show Chart" : "📋 Show Table"}
                    </button>
                </div>
                {viewModePL ? (
                    <DataTable data={financials?.profit_and_loss} />
                ) : (
                    <ProfitLossDashboard profitLossData={financials?.profit_and_loss} />
                )}
                {/* Other Financial Tables */}
                <div>
                    <div className="flex items-center justify-between mb-3 mt-8">
                        <h2 className="text-lg font-semibold">Balance Sheet</h2>
                        <button
                            className={`text-sm text-${COLORS.titleText} font-medium px-3 py-2 rounded-[5px] border border-[${COLORS.border}] cursor-pointer`}
                            onClick={() =>
                                setViewModeBS(!viewModeBS)
                            }
                        >
                            {viewModeBS ? "📊 Show Chart" : "📋 Show Table"}
                        </button>
                    </div>
                    {viewModeBS ? (
                        <DataTable data={financials?.balance_sheet} />
                    ) : (
                        <BalanceSheetDashboard balance_sheet={financials?.balance_sheet} />
                    )}
                </div>
                <div>
                    <div className="flex items-center justify-between mb-3 mt-8">
                        <h2 className="text-lg font-semibold">Cash Flows</h2>
                        <button
                            className={`text-sm text-${COLORS.titleText} font-medium px-3 py-2 rounded-[5px] border border-[${COLORS.border}] cursor-pointer`}
                            onClick={() =>
                                setViewModeCF(!viewModeCF)
                            }
                        >
                            {viewModeCF ? "📊 Show Chart" : "📋 Show Table"}
                        </button>
                    </div>
                    {viewModeCF ? (
                        <DataTable data={financials?.cash_flows} />
                    ) : (
                        <CashFlowDashboard data={financials?.cash_flows} />
                    )}
                </div>
                <div>
                    <div className="flex items-center justify-between mb-3 mt-8">
                        <h2 className="text-lg font-semibold">Ratios</h2>
                        <button
                            className={`text-sm text-${COLORS.titleText} font-medium px-3 py-2 rounded-[5px] border border-[${COLORS.border}] cursor-pointer`}
                            onClick={() =>
                                setViewModeRatios(!viewModeRatios)
                            }
                        >
                            {viewModeRatios ? "📊 Show Chart" : "📋 Show Table"}
                        </button>
                    </div>
                    {viewModeRatios ? (
                        <DataTable data={financials?.ratios} />
                    ) : (
                        <ROCEDashboard ratios={financials?.ratios} />
                    )}
                </div>
                {/* Shareholding Section with Tabs */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold mb-2">Shareholding</h2>
                    <div className="flex items-center justify-between pt-2">
                        <div className="flex gap-2">
                            <button
                                className={`px-4 py-2 text-sm font-medium cursor-pointer ${shareholdingTab === "quarterly"
                                    ? "border-b-2 border-blue-600 text-blue-600"
                                    : "text-gray-600 hover:text-gray-800"
                                    }`}
                                onClick={() => setShareholdingTab("quarterly")}
                            >
                                Quarterly
                            </button>
                            <button
                                className={`px-4 py-2 text-sm font-medium cursor-pointer ${shareholdingTab === "yearly"
                                    ? "border-b-2 border-blue-600 text-blue-600"
                                    : "text-gray-600 hover:text-gray-800"
                                    }`}
                                onClick={() => setShareholdingTab("yearly")}
                            >
                                Yearly
                            </button>
                        </div>
                        <button
                            className={`text-sm text-${COLORS.titleText} font-medium px-3 py-2 rounded-[5px] border border-[${COLORS.border}] cursor-pointer`}
                            onClick={() =>
                                setViewModeSH(!viewModeSH)
                            }
                        >
                            {viewModeSH ? "📊 Show Chart" : "📋 Show Table"}
                        </button>
                    </div>
                    {shareholdingTab === "quarterly" ? (
                        <div>
                            {viewModeSH ? (
                                <DataTable data={financials?.shareholding_quarterly} />
                            ) : (

                                <ShareholdingCharts
                                    data={financials?.shareholding_quarterly}
                                />
                            )}
                        </div>
                    ) : (
                        <div>
                            {viewModeSH ? (
                                <DataTable data={financials?.shareholding_yearly} />
                            ) : (
                                <ShareholdingCharts
                                    data={financials?.shareholding_yearly}
                                />
                            )}

                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-400 mt-4">
                    Last Updated:{" "}
                    {financials?.last_updated_at
                        ? new Date(financials.last_updated_at).toLocaleString()
                        : "N/A"
                    }
                </p>
            </div>
        </div>
    );
};

export default CompanyDetails;
