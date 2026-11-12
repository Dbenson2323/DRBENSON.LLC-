// Single-series bar chart (one metric, one bar per asset class) — per dataviz spec:
// one consistent hue (no per-bar rainbow, since there's only one series),
// thin bars with a rounded data-end, direct value label at the tip, no
// legend needed. Occupancy is used instead of vacancy so hospitality,
// self-storage, and senior housing (which report occupancy) sit on the
// same comparable scale as the asset classes that report vacancy.
const BAR_COLOR = "#B54A32";

function getOccupancyPct(metrics) {
  if (!metrics) return null;
  if (typeof metrics.occupancyPct === "number") return metrics.occupancyPct;
  if (typeof metrics.vacancyRatePct === "number") return Math.round((100 - metrics.vacancyRatePct) * 10) / 10;
  return null;
}

export default function OccupancyChart({ assetClasses, marketMetrics }) {
  const rows = assetClasses
    .map((a) => ({ label: a.label, value: getOccupancyPct(marketMetrics?.assetClasses?.[a.key]) }))
    .filter((r) => r.value !== null);

  if (rows.length === 0) {
    return <p className="text-sm text-[#9C927C]">No comparable occupancy data configured yet.</p>;
  }

  const max = 100; // occupancy is a 0-100% scale, so anchor the axis at a clean 100

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3" title={`${row.label}: ${row.value}% occupied`}>
            <span className="w-28 shrink-0 text-xs text-[#5C5443] text-right">{row.label}</span>
            <div className="flex-1 h-4 bg-[#EDE6D6] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(row.value / max) * 100}%`, backgroundColor: BAR_COLOR }}
              />
            </div>
            <span className="w-12 shrink-0 text-xs font-semibold text-[#2A241C]">{row.value}%</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[10px] text-[#9C927C]">
        Occupancy shown for comparability (100% − vacancy rate for Multifamily/Industrial/Office/Retail;
        reported occupancy for Hospitality/Self-Storage/Senior Housing). Example data — see each card below for its source.
      </p>
    </div>
  );
}
