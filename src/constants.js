export const COLORS = {
  primary: "#2563EB",
  secondary: "#9333ea",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#facc15",
  titleText: "#111827",
  background: "#f9fafb",
  border: "#D1D5DB",
  secondaryText:"#6B7280",
  icon: "#94A3B8",
  yellow: "yellow",
  companyTitle: "#62929a",
  companyDescription:"#5c5757"
};

 export const getHeatColor = (pctVal) => {
    if (!isFinite(pctVal)) return "bg-gray-100";
    if (pctVal > 15) return "bg-green-600 text-white";
    if (pctVal > 0) return "bg-green-200 text-green-800";
    if (pctVal < -15) return "bg-red-600 text-white";
    if (pctVal < 0) return "bg-red-200 text-red-800";
    return "bg-gray-100";
  };
