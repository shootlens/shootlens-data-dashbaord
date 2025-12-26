import { COLORS } from "../../../constants";
import {
  PiCreditCardLight,
  PiPiggyBankThin,
  PiBankThin,
  PiTrendUpThin,
  PiMathOperationsThin
} from "react-icons/pi";
import { FcComboChart } from "react-icons/fc";
import Animate from "../../common/animate";

const MetricCards = ({
  totalAssets,
  totalLiabilities,
  netWorthLatest,
  borrowings,
  lastYoYAssets,
  lastYoYLiabilities,
  lastYoYBorrowings,
  lastYoYNetWorth,
  arrowAssets,
  arrowBorrowings,
  arrowLiabilities,
  arrowNetWorth,
  debtToEquity,
  arrowdeptToEquity,
  deptToEquityYoy,
  equityRatioValue,
  arrowEquityRatio,
  equityRatioYoy,
  totalAssetsGrowth,
  metricsAsOfLabel
}) => {

  return (

    <div className="flex flex-wrap gap-4">
      {[
        {
          label: "Total Assets",
          value: totalAssets,
          icon: <PiBankThin size="100%" />,
          arrow: arrowAssets,
          yoy: lastYoYAssets,
        },
        {
          label: "Total Liabilities",
          value: totalLiabilities,
          icon: <PiCreditCardLight size="100%" />,
          arrow: arrowLiabilities,
          yoy: lastYoYLiabilities,
        },
        {
          label: "Equity + Reserves",
          value: netWorthLatest,
          icon: <PiTrendUpThin size="100%" />,
          arrow: arrowNetWorth,
          yoy: lastYoYNetWorth,
        },
        {
          label: "Borrowings",
          value: borrowings,
          icon: <PiPiggyBankThin size="100%" />,
          arrow: arrowBorrowings,
          yoy: lastYoYBorrowings,
        },
        {
          label: "Debt to Equity",
          value: debtToEquity,
          icon: <PiCreditCardLight size="100%" />,
          arrow: arrowdeptToEquity,
          // arrow: arrowInfo(borrowingsCagr - netWorthCagr, false),
          // yoy: borrowingsCagr - netWorthCagr,
          yoy: deptToEquityYoy,
          format: (v) => v.toFixed(2),
        },
        {
          label: "Equity Ratio",
          value: equityRatioValue,
          icon: <PiMathOperationsThin size="100%" />,
          // arrow: arrowInfo(netWorthCagr - assetsCagr, true),
          arrow: arrowEquityRatio,
          // yoy: netWorthCagr - assetsCagr,
          yoy: equityRatioYoy,
          format: (v) => `${v.toFixed(1)}%`,
        },
        {
          label: "Assets Growth (YoY)",
          value: totalAssetsGrowth,
          icon: <FcComboChart size="100%" />,
          arrow: arrowAssets,
          yoy: lastYoYAssets,
          format: (v) => `${v.toFixed(1)}%`,
        },
      ].map((c, i) => (

        <div
          key={i}
          className="bg-white p-4 rounded-xl border min-w-[220px] flex-1 transition-transform transition-shadow hover:shadow-md hover:-translate-y-[1px] hover:scale-[1.01]"
          style={{ borderColor: COLORS.border }}
        >
          <Animate>
            <div className="flex items-center justify-between gap-[10px]">
              <div className="flex items-center gap-[8px]">
                <div className="h-7 w-7">{c.icon}</div>
                <div className="text-sm text-gray-500">{c.label}</div>
              </div>
              {c.arrow && (
                <div
                  className={`flex items-center text-[11px] font-semibold ${c.arrow.color}`}
                >
                  {c.arrow.symbol}{" "}
                  <span className="ml-1">
                    {isFinite(c.yoy)
                      ? `${c.yoy >= 0 ? "+" : ""}${c.yoy.toFixed(1)}%`
                      : "--"}
                  </span>
                </div>
              )}
            </div>
            <div
              className="text-2xl font-semibold mt-1"
              style={{ color: COLORS.primary }}
            >
              {typeof c.value === "number"
                ? c.format
                  ? c.format(c.value)
                  : c.value.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : c.value}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              As of {metricsAsOfLabel}
            </div>
          </Animate>
        </div>


      ))}
    </div>
  );
};

export default MetricCards;
