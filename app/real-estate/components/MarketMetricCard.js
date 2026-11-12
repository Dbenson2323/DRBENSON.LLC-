const FIELD_LABELS = {
  netAbsorptionUnits: "Net Absorption (units)",
  underConstructionUnits: "Under Construction (units)",
  netAbsorptionSF: "Net Absorption (SF)",
  underConstructionSF: "Under Construction (SF)",
  vacancyRatePct: "Vacancy Rate",
  revparGrowthPct: "RevPAR Growth",
  occupancyPct: "Occupancy",
  pipelineRooms: "Pipeline (rooms)",
  streetRateGrowthPct: "Street Rate Growth",
};

const DELTA_FIELDS = new Set(["revparGrowthPct", "streetRateGrowthPct"]);

function formatValue(key, value) {
  if (key.endsWith("Pct")) {
    const sign = DELTA_FIELDS.has(key) && value > 0 ? "+" : "";
    return `${sign}${value}%`;
  }
  if (typeof value === "number") return value.toLocaleString();
  return value;
}

export default function MarketMetricCard({ assetClassLabel, metrics }) {
  if (!metrics) {
    return (
      <div className="rounded-xl border border-[#D8CDB8] bg-white/60 p-6 text-center text-[#9C927C]">
        No data configured for {assetClassLabel} yet.
      </div>
    );
  }

  const fields = Object.keys(metrics).filter((k) => k in FIELD_LABELS);

  return (
    <div className="rounded-xl border border-[#D8CDB8] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-serif font-bold text-[#1F3A34]">{assetClassLabel}</h3>
        {metrics.example && (
          <span className="text-[10px] font-semibold uppercase tracking-wide bg-[#F3E4C8] text-[#8A5A1E] px-2.5 py-1 rounded-full">
            Example data
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-4">
        {fields.map((key) => (
          <div key={key}>
            <dt className="text-xs text-[#9C927C] uppercase tracking-wide">{FIELD_LABELS[key]}</dt>
            <dd className="text-lg font-semibold text-[#2A241C]">{formatValue(key, metrics[key])}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-[#9C927C] italic">Source: {metrics.source}</p>
    </div>
  );
}
