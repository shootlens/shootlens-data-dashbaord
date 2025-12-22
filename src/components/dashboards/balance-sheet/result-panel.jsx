const ResultPanel = ({ text, pct }) => {

    const getColorClass = (pct) => {
      if (pct == null)
        return { bg: "bg-gray-50", text: "text-gray-700", border: "#D1D5DB" };
      if (pct > 5)
        return { bg: "bg-green-50", text: "text-green-700", border: "#89e289" };
      if (pct < -5) return { bg: "bg-red-50", text: "text-red-700", border: "red" };
      return { bg: "bg-yellow-50", text: "text-yellow-700", border: "yellow" };
    };

    const getResultIconMeta = (pct) => {
      if (pct == null || !isFinite(pct)) {
        return { emoji: "⚪", label: "Neutral" };
      }
      if (pct > 15) return { emoji: "📈", label: "Strongly Improving" };
      if (pct > 5) return { emoji: "⬆️", label: "Improving" };
      if (pct > 0) return { emoji: "↗️", label: "Slightly Improving" };
      if (pct < -15) return { emoji: "📉", label: "Sharp Decline" };
      if (pct < -5) return { emoji: "⬇️", label: "Declining" };
      if (pct < 0) return { emoji: "↘️", label: "Slightly Declining" };
      return { emoji: "⏸️", label: "Flat / Stable" };
    };
    const getConfidenceMeta = (pct) => {
      if (pct == null || !isFinite(pct)) {
        return { label: "Medium", score: 70 };
      }
      const abs = Math.abs(pct);
      if (abs >= 20) return { label: "High", score: 92 };
      if (abs >= 10) return { label: "Medium", score: 82 };
      if (abs >= 3) return { label: "Medium", score: 75 };
      return { label: "Low", score: 64 };
    };
    const cls = getColorClass(pct);
    const { emoji, label } = getResultIconMeta(pct);
    const confidence = getConfidenceMeta(pct);

    const bullets = (text || "")
      .split(/[\.\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);

    return (
      <div
        className={`rounded-md border p-3 ${cls.bg}`}
        style={{ borderColor: cls.border }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none mt-[2px]">{emoji}</span>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-gray-500">
                Result — {label}
              </div>
            </div>
          </div>
          <div className="text-[11px] px-2 py-[2px] rounded-full border border-gray-300 bg-white/70 text-gray-700 whitespace-nowrap">
            Confidence:
            <span className="font-semibold">
              {confidence.label} ({confidence.score}%)
            </span>
          </div>
        </div>

        <div className="mt-2 text-sm text-gray-700">
          {bullets.length > 1 ? (
            <ul className="list-disc ml-4 space-y-[2px]">
              {bullets.map((b, i) => (
                <li key={i} className="text-[12px]">{b}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px]">{bullets[0] || "—"}</p>
          )}
        </div>
      </div>
    );
  };
  export default ResultPanel