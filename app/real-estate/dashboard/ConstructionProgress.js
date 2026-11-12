import { Panel, ExampleBadge, StatusChip, Bar, Kpi } from "./ui";
import { fmt } from "./calc";

function Variance({ days }) {
  if (days === null || days === undefined) return <span className="text-[#9C927C]">—</span>;
  if (days <= 0) return <span className="text-[#1F6B4A]">{days === 0 ? "On time" : `${-days}d early`}</span>;
  return <span className="text-[#B54A32]">{days}d late</span>;
}

export default function ConstructionProgress({ dev, rows, summary }) {
  const loan = dev.constructionLoan;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Overall complete" value={fmt.pct(summary.pctComplete, 0)} note="Weighted by milestone" />
        <Kpi label="Budget spent" value={fmt.pct(summary.spentPct, 0)} note={`${fmt.musd(summary.spent)} of ${fmt.musd(summary.budget)}`} />
        <Kpi
          label="Avg. milestone slip"
          value={`${Math.round(summary.avgSlip)}d`}
          note="Completed milestones vs. target"
          tone={summary.avgSlip > 14 ? "bad" : "good"}
        />
        <Kpi
          label="Construction loan"
          value={fmt.pct((loan.drawn / loan.commitment) * 100, 0)}
          note={`${fmt.musd(loan.drawn)} of ${fmt.musd(loan.commitment)} drawn · ${loan.ratePct}%`}
        />
      </div>

      <Panel
        title="Construction Progress Report"
        subtitle={`${dev.name} · ${dev.location} · ${dev.description}`}
        badge={dev.example && <ExampleBadge />}
      >
        <div className="mb-5">
          <div className="flex justify-between text-xs text-[#5C5443] mb-1">
            <span>Schedule progress</span>
            <span className="font-semibold tabular-nums">{fmt.pct(summary.pctComplete, 0)}</span>
          </div>
          <Bar pct={summary.pctComplete} color="#1F3A34" />
          <div className="flex justify-between text-xs text-[#5C5443] mt-3 mb-1">
            <span>Budget spent</span>
            <span className="font-semibold tabular-nums">{fmt.pct(summary.spentPct, 0)}</span>
          </div>
          <Bar pct={summary.spentPct} />
          {summary.spentPct > summary.pctComplete + 5 && (
            <p className="mt-2 text-[11px] text-[#B54A32]">Spending is running ahead of physical progress; check for cost overruns.</p>
          )}
        </div>

        <ol className="relative border-l-2 border-[#EDE6D6] ml-2 space-y-4">
          {rows.map((m) => (
            <li key={m.name} className="ml-5">
              <span
                className={`absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-white ${
                  m.status === "Complete" ? "bg-[#1F6B4A]" : m.status === "Behind" ? "bg-[#B54A32]" : m.status === "In progress" ? "bg-[#2C4A7A]" : "bg-[#D8CDB8]"
                }`}
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-[#2A241C]">{m.name}</span>
                <StatusChip status={m.status} />
                {m.status !== "Complete" && m.pct > 0 && <span className="text-xs text-[#5C5443]">{m.pct}% done</span>}
              </div>
              <p className="text-xs text-[#5C5443] mt-0.5">
                Target {fmt.date(m.target)}
                {m.actual && <> · Actual {fmt.date(m.actual)}</>} · <Variance days={m.varianceDays} />
              </p>
              {m.status !== "Complete" && m.pct > 0 && (
                <div className="mt-1.5 max-w-xs">
                  <Bar pct={m.pct} color="#2C4A7A" />
                </div>
              )}
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Budget vs. Spent" subtitle="Development budget by category" badge={dev.example && <ExampleBadge />}>
        <div className="space-y-3">
          {dev.budget.map((b) => {
            const pct = (b.spent / b.budget) * 100;
            return (
              <div key={b.category}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#2A241C] font-semibold">{b.category}</span>
                  <span className="tabular-nums text-[#5C5443]">
                    {fmt.usd(b.spent)} / {fmt.usd(b.budget)} · {fmt.pct(pct, 0)}
                  </span>
                </div>
                <Bar pct={pct} color={pct > 100 ? "#B54A32" : "#1F3A34"} />
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
