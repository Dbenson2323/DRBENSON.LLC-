"use client";

import { useMemo } from "react";
import { Kpi, Panel } from "./ui";
import { RentRoll, LeaseExpirations, LeasingActivity, DebtSummary } from "./AssetSections";
import ConstructionProgress from "./ConstructionProgress";
import {
  fmt,
  rentRollRows,
  rentRollSummary,
  expirationSchedule,
  loanStatus,
  milestoneRows,
  constructionSummary,
  netEffectiveRent,
  downloadCsv,
} from "./calc";

// Modules planned for later build-out. Shown as disabled buttons so the
// roadmap is visible on the page.
const PLANNED = [
  { title: "Argus-style cash flow", desc: "10-year projection from the rent roll: rollover, downtime, TI/LC, reversion, IRR and NPV.", next: true },
  { title: "Upload your rent roll", desc: "Import a CSV or Excel rent roll and have every module recalculate from it." },
  { title: "Budget vs. actual (operations)", desc: "Monthly operating statement with variance flags against budget." },
  { title: "CapEx & TI tracker", desc: "Capital projects and tenant improvements: committed, spent and remaining." },
  { title: "Draw requests & lien waivers", desc: "Construction draw log with lender approvals and waiver checklist." },
  { title: "Lease abstracts", desc: "Key clauses per tenant: options, renewals, CAM caps, co-tenancy, notice dates." },
  { title: "Investor reporting", desc: "Quarterly report and distribution waterfall by investor class." },
  { title: "Market comps", desc: "Pull rent and sale comps from the Market Research tab into underwriting." },
];

function SectionHeading({ children, note }) {
  return (
    <div className="mb-4">
      <h2 className="text-2xl font-serif font-bold text-[#1F3A34]">{children}</h2>
      {note && <p className="text-sm text-[#5C5443] mt-1">{note}</p>}
    </div>
  );
}

const JUMP_LINKS = [
  { href: "#asset-management", label: "Asset management" },
  { href: "#development", label: "Development" },
  { href: "#reports", label: "Reports" },
  { href: "#build-out", label: "Coming soon" },
];

export default function DevDashboard({ data }) {
  const { asset, development: dev, asOf } = data;

  const rows = useMemo(() => rentRollRows(asset, asOf), [asset, asOf]);
  const summary = useMemo(() => rentRollSummary(rows, asset), [rows, asset]);
  const schedule = useMemo(() => expirationSchedule(rows, asset, asOf), [rows, asset, asOf]);
  const loan = useMemo(() => loanStatus(asset.loan, asOf), [asset.loan, asOf]);
  const milestones = useMemo(() => milestoneRows(dev.milestones, asOf), [dev.milestones, asOf]);
  const devSummary = useMemo(() => constructionSummary(dev, milestones), [dev, milestones]);

  const dscr = summary.noi / loan.annualDebtService;

  function exportRentRoll() {
    downloadCsv(
      `rent-roll-${asOf}.csv`,
      ["Suite", "Tenant", "SF", "% of GBA", "Lease start", "Lease end", "Rent PSF", "Annual rent", "Months remaining", "Status"],
      rows.map((r) => [
        r.suite,
        r.tenant ?? "Vacant",
        r.sf,
        r.pctOfGBA.toFixed(1),
        r.leaseStart ?? "",
        r.leaseEnd ?? "",
        r.rentPSF ?? r.marketRentPSF,
        Math.round(r.annualRent),
        r.vacant ? "" : r.monthsLeft.toFixed(1),
        r.status,
      ])
    );
  }

  function exportLeasing() {
    downloadCsv(
      `leasing-activity-${asOf}.csv`,
      ["Tenant", "Suite", "Type", "Status", "SF", "Term (mo)", "Start rent PSF", "Escalation %", "Free rent (mo)", "TI PSF", "Net effective rent PSF", "Date"],
      asset.leasing.map((d) => [d.tenant, d.suite, d.dealType, d.status, d.sf, d.termMonths, d.startRentPSF, d.escalationPct, d.freeRentMonths, d.tiPSF, netEffectiveRent(d).toFixed(2), d.date])
    );
  }

  function exportConstruction() {
    downloadCsv(
      `construction-progress-${asOf}.csv`,
      ["Milestone", "Target", "Actual", "Status", "% complete", "Variance (days)", "Weight"],
      milestones.map((m) => [m.name, m.target, m.actual ?? "", m.status, m.pct, m.varianceDays ?? "", m.weight])
    );
  }

  function exportSummary() {
    downloadCsv(`asset-summary-${asOf}.csv`, ["Metric", "Value"], [
      ["Property", asset.name],
      ["As of", asOf],
      ["Total SF", asset.totalSF],
      ["Occupancy %", summary.occupancyPct.toFixed(1)],
      ["Annual base rent", Math.round(summary.annualRent)],
      ["Avg rent PSF", summary.avgRentPSF.toFixed(2)],
      ["WALT (yrs)", summary.walt.toFixed(2)],
      ["NOI", Math.round(summary.noi)],
      ["Loan balance", Math.round(loan.balance)],
      ["Annual debt service", Math.round(loan.annualDebtService)],
      ["DSCR", dscr.toFixed(2)],
      ["Development % complete", devSummary.pctComplete.toFixed(1)],
      ["Development budget spent %", devSummary.spentPct.toFixed(1)],
    ]);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="rounded-xl border border-dashed border-[#D8CDB8] bg-[#FBF8F0] p-4 text-sm text-[#5C5443] mb-6">
        <span className="font-semibold text-[#1F3A34]">Early build.</span> Asset management and development
        tools for tracking a property after acquisition. Everything below runs on <span className="font-semibold">example data</span>{" "}
        (as of {fmt.date(asOf)}) until real figures are loaded.
      </div>

      <nav className="flex flex-wrap gap-2 mb-8 print:hidden" aria-label="Dashboard sections">
        {JUMP_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white border border-[#D8CDB8] text-[#5C5443] hover:border-[#1F3A34] hover:text-[#1F3A34]"
          >
            {l.label}
          </a>
        ))}
      </nav>

      {/* Asset management */}
      <div id="asset-management" className="scroll-mt-32">
        <SectionHeading note={`${asset.name} · ${asset.location} · ${asset.propertyType}`}>Asset Management</SectionHeading>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          <Kpi label="Occupancy" value={fmt.pct(summary.occupancyPct)} note={`${fmt.num(summary.vacantSF)} SF vacant`} />
          <Kpi label="Annual base rent" value={fmt.musd(summary.annualRent)} note={`${fmt.usd2(summary.avgRentPSF)} / SF avg`} />
          <Kpi label="WALT" value={`${summary.walt.toFixed(1)} yrs`} note="Weighted by rent" />
          <Kpi label="NOI" value={fmt.musd(summary.noi)} note="Base rent less non-recoverables" />
          <Kpi label="DSCR" value={`${dscr.toFixed(2)}x`} note={`Covenant ${asset.loan.covenants.minDSCR.toFixed(2)}x`} tone={dscr >= asset.loan.covenants.minDSCR ? "good" : "bad"} />
          <Kpi
            label="Rolling ≤12 mo"
            value={fmt.pct((summary.expiringSF / asset.totalSF) * 100, 0)}
            note={`${fmt.usd(summary.expiringRent)} of rent`}
            tone={summary.expiringSF / asset.totalSF > 0.15 ? "bad" : undefined}
          />
        </div>
        <div className="space-y-5">
          <RentRoll rows={rows} summary={summary} asset={asset} />
          <div className="grid gap-5 lg:grid-cols-2">
            <LeaseExpirations schedule={schedule} asset={asset} />
            <DebtSummary loan={asset.loan} noi={summary.noi} asOf={asOf} example={asset.example} />
          </div>
          <LeasingActivity deals={asset.leasing} asset={asset} />
        </div>
      </div>

      {/* Development */}
      <div id="development" className="scroll-mt-32 mt-14">
        <SectionHeading note="Ground-up projects: milestones, schedule slip, budget and construction loan draws">
          Development
        </SectionHeading>
        <ConstructionProgress dev={dev} rows={milestones} summary={devSummary} />
      </div>

      {/* Reports */}
      <div id="reports" className="scroll-mt-32 mt-14">
        <SectionHeading note="Download what's on this page. CSV files open in Excel.">Reports</SectionHeading>
        <Panel title="Download a report">
          <div className="flex flex-wrap gap-3 print:hidden">
            {[
              ["Asset summary (CSV)", exportSummary],
              ["Rent roll (CSV)", exportRentRoll],
              ["Leasing activity (CSV)", exportLeasing],
              ["Construction progress (CSV)", exportConstruction],
            ].map(([label, fn]) => (
              <button
                key={label}
                type="button"
                onClick={fn}
                className="px-4 py-2 rounded-lg bg-[#1F3A34] text-white text-sm font-semibold hover:bg-[#16302A]"
              >
                ↓ {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg border border-[#1F3A34] text-[#1F3A34] text-sm font-semibold hover:bg-[#EDE6D6]"
            >
              Print / save as PDF
            </button>
          </div>
        </Panel>
      </div>

      {/* Planned */}
      <div id="build-out" className="scroll-mt-32 mt-14 print:hidden">
        <SectionHeading note="Modules planned for this dashboard. Not built yet.">Coming Soon</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANNED.map((p) => (
            <button
              key={p.title}
              type="button"
              disabled
              className="text-left rounded-xl border border-dashed border-[#D8CDB8] bg-white/60 p-4 cursor-not-allowed"
            >
              <span
                className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  p.next ? "bg-[#1F3A34] text-white" : "bg-[#EDE6D6] text-[#7A6F5A]"
                }`}
              >
                {p.next ? "Next up" : "Coming soon"}
              </span>
              <span className="block mt-2 font-serif font-bold text-[#1F3A34]">{p.title}</span>
              <span className="block mt-1 text-xs text-[#5C5443] leading-relaxed">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
