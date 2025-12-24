import { COLORS } from "../../../constants";
import ResultPanel from "./result-panel";
import { MdOpenInFull } from "react-icons/md"

const ChartCard = ({
  title,
  result,
  pct,
  takeaway,
  chart,
  insights,
  aiSummary,
  onFullscreen,
}) => {
  const InsightList = ({ list = [] }) => {
    const hasInsights = list && list.length > 0;
    return (
      <div
        className="rounded-md border p-2 mt-3"
        style={{ borderColor: COLORS.border }}
      >
        <div className="text-sm font-semibold">🧠 Insights</div>
        <ul className="text-xs mt-2 ml-4 list-disc text-gray-800">
          {hasInsights ? (
            list.map((t, i) => <li key={i}>{t}</li>)
          ) : (
            <li>No major anomalies detected in this chart.</li>
          )}
        </ul>
      </div>
    );
  };
  const Takeaway = ({ text }) => (
    <div
      // className="rounded-md border p-2 bg-white"
      style={{ borderColor: COLORS.border }}
    >
      {/* <div className="text-sm font-medium">User Takeaway</div> */}
      <p className="text-[14px] mt-1 mb-2" style={{ color: COLORS.secondaryText }}>{text}</p>
    </div>
  );
  return (
    <div
      className="bg-white rounded-lg border p-4 flex flex-col"
      style={{ borderColor: COLORS.border }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-md font-medium leading-none" style={{ color: COLORS.titleText }}>{title}</div>
          <Takeaway text={takeaway} />
        </div>

        {onFullscreen && (
          <div
            onClick={onFullscreen}
            className="border rounded-[5px] p-1 hover:bg-gray-50 text-gray-600 cursor-pointer"
          >
            <MdOpenInFull size="11px" />
          </div>
        )}
      </div>
      <ResultPanel title={title} text={result} pct={pct} />

      {aiSummary && (
        <p className="mt-2 text-[11px] text-gray-600 italic">
          🧠 AI Summary: {aiSummary}
        </p>
      )}
      <div className="mt-3 h-56">{chart}</div>
      <InsightList list={insights} />
    </div>
  )
};

export default ChartCard