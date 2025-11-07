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

const CompanyDetails = () => {
    const { symbol } = useParams();
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewModeQR, setViewModeQR] = useState("table"); // Quarterly Results
    const [viewModePL, setViewModePL] = useState("table"); // Profit & Loss
    const [viewModeSH, setViewModeSH] = useState("table"); // share holding pattern
    const [viewModeBS, setViewModeBS] = useState("table"); // share holding pattern
    const [shareholdingTab, setShareholdingTab] = useState("quarterly"); // Shareholding Tab

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
        <div>
            <Header hideCount />
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
                    </div></div>

                {/* Quarterly Results (Toggle View) */}
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Quarterly Results</h2>
                    <button
                        className={`text-sm text-${COLORS.titleText} font-medium px-3 py-2 rounded-[5px] border border-[${COLORS.border}] cursor-pointer`}
                        onClick={() =>
                            setViewModeQR((prev) => (prev === "table" ? "chart" : "table"))
                        }
                    >
                        {viewModeQR === "table" ? "📊 Show Chart" : "📋 Show Table"}
                    </button>
                </div>

                {viewModeQR === "table" ? (
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
                            setViewModePL((prev) => (prev === "table" ? "chart" : "table"))
                        }
                    >
                        {viewModePL === "table" ? "📊 Show Chart" : "📋 Show Table"}
                    </button>
                </div>

                {viewModePL === "table" ? (
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
                                setViewModeBS((prev) => (prev === "table" ? "chart" : "table"))
                            }
                        >
                            {viewModePL === "table" ? "📊 Show Chart" : "📋 Show Table"}
                        </button>
                    </div>
                    {viewModeBS === "table" ? (
                        <DataTable data={financials?.balance_sheet} />
                    ) : (
                        <BalanceSheetDashboard balance_sheet={financials?.balance_sheet} />
                    )}
                </div>

                <DataTable title="Cash Flows" data={financials?.cash_flows} />
                <DataTable title="Ratios" data={financials?.ratios} />

                {/* Shareholding Section with Tabs */}
                <div className="mt-8">
                    <h2 className="text-lg font-semibold mb-2">Shareholding</h2>
                    <div className="flex items-center justify-between"> <div className="flex gap-2">
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
                                setViewModeSH((prev) => (prev === "table" ? "chart" : "table"))
                            }
                        >
                            {viewModeSH === "table" ? "📊 Show Chart" : "📋 Show Table"}
                        </button>
                    </div>

                    {shareholdingTab === "quarterly" ? (
                        <div>
                            {viewModeSH === "table" ? (
                                <DataTable data={financials?.shareholding_quarterly} />
                            ) : (

                                <ShareholdingCharts
                                    data={financials?.shareholding_quarterly}
                                />
                            )}

                        </div>
                    ) : (
                        <div>
                            {viewModeSH === "table" ? (
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
                        : "N/A"}
                </p>

            </div>
        </div>
    );
};

export default CompanyDetails;
