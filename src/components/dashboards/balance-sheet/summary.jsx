import { COLORS } from "../../../constants";

const SummaryPanel = ({ ai }) => {
    if (!ai) return null;
    const {
        healthScore = 0,
        classification = "N/A",
        summaries = {},
        recommendations = [],
    } = ai;
    const scoreColor =
        healthScore >= 75 ? "#059669" : healthScore >= 50 ? "#f59e0b" : "#ef4444";

    return (
        <div className="p-[2px] rounded-[13px] animation-border">
            <div
                className="bg-white rounded-[12px] p-4"
                style={{ borderColor: COLORS.border }}
            >
                <div className="flex flex-col-reverse md:flex-row">
                    <div>
                        <p
                            className="text-[14px] mt-2"
                            style={{ color: COLORS.secondaryText }}
                        >
                            {summaries?.total_assets}
                        </p>
                        <ul className="mt-3 list-disc ml-5 space-y-1">
                            <li
                                className="text-[14px]"
                                style={{ color: COLORS.secondaryText }}
                            >
                                {summaries?.total_liabilities}
                            </li>
                            <li
                                className="text-[14px]"
                                style={{ color: COLORS.secondaryText }}
                            >
                                {summaries?.equity}
                            </li>
                        </ul>
                    </div>

                    <div className="md:text-right" style={{ minWidth: 160 }}>
                        <div className="text-sm text-gray-500">Health Score</div>
                        <div
                            style={{ fontSize: 28, fontWeight: 700, color: scoreColor }}
                        >{`${healthScore} / 100`}</div>
                        <div
                            className="text-sm mt-1"
                            style={{ color: COLORS.secondaryText }}
                        >
                            {classification}
                        </div>

                        <div className="mt-3 text-xs">
                            <div
                                className="font-semibold text-lg"
                                style={{ color: COLORS.secondaryText }}
                            >
                                Top Recommendations
                            </div>
                            <ul
                                className="md:ml-5 mt-2 text-[14px]"
                                style={{ color: COLORS.secondaryText }}
                            >
                                {(recommendations || []).slice(0, 3).map((r, i) => (
                                    <li key={i}>{r}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default SummaryPanel;