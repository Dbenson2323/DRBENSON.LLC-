"use client";

import { useState } from "react";
import { Panel, ExampleBadge, StatusChip, Bar, th, td } from "./ui";
import { fmt, netEffectiveRent, loanStatus, monthlyPayment } from "./calc";

export function RentRoll({ rows, summary, asset }) {
  return (
    <Panel
      id="rent-roll"
      title="Rent Roll"
      subtitle={`${asset.name} · ${fmt.num(asset.totalSF)} SF · ${asset.leaseType}`}
      badge={asset.example && <ExampleBadge />}
    >
      <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D8CDB8]">
              <th className={th}>Suite</th>
              <th className={th}>Tenant</th>
              <th className={`${th} text-right`}>SF</th>
              <th className={`${th} text-right`}>% GBA</th>
              <th className={th}>Lease start</th>
              <th className={th}>Lease end</th>
              <th className={`${th} text-right`}>Rent / SF</th>
              <th className={`${th} text-right`}>Annual rent</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody className="text-[#2A241C]">
            {rows.map((r) => (
              <tr key={r.suite} className="border-b border-[#EDE6D6]">
                <td className={`${td} font-semibold`}>{r.suite}</td>
                <td className={td}>{r.vacant ? <span className="text-[#9C927C] italic">Vacant</span> : r.tenant}</td>
                <td className={`${td} text-right tabular-nums`}>{fmt.num(r.sf)}</td>
                <td className={`${td} text-right tabular-nums`}>{fmt.pct(r.pctOfGBA)}</td>
                <td className={td}>{fmt.date(r.leaseStart)}</td>
                <td className={td}>{fmt.date(r.leaseEnd)}</td>
                <td className={`${td} text-right tabular-nums`}>
                  {r.vacant ? <span className="text-[#9C927C]">{fmt.usd2(r.marketRentPSF)} mkt</span> : fmt.usd2(r.rentPSF)}
                </td>
                <td className={`${td} text-right tabular-nums`}>{r.vacant ? "—" : fmt.usd(r.annualRent)}</td>
                <td className={td}>
                  <StatusChip status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold text-[#1F3A34]">
              <td className={td} colSpan={2}>
                Total ({fmt.pct(summary.occupancyPct)} leased)
              </td>
              <td className={`${td} text-right tabular-nums`}>{fmt.num(asset.totalSF)}</td>
              <td className={`${td} text-right tabular-nums`}>100%</td>
              <td className={td} colSpan={2} />
              <td className={`${td} text-right tabular-nums`}>{fmt.usd2(summary.avgRentPSF)}</td>
              <td className={`${td} text-right tabular-nums`}>{fmt.usd(summary.annualRent)}</td>
              <td className={td} />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-[#9C927C]">
        Vacant space at market rent represents {fmt.usd(summary.lossToVacancy)} / yr of potential rent.
      </p>
    </Panel>
  );
}

export function LeaseExpirations({ schedule, asset }) {
  const max = Math.max(25, ...schedule.map((y) => y.pct));
  return (
    <Panel title="Lease Expiration Schedule" subtitle="Share of building SF rolling each year" badge={asset.example && <ExampleBadge />}>
      <div className="space-y-2.5">
        {schedule.map((y) => (
          <div key={y.year} className="flex items-center gap-3" title={y.tenants.join(", ")}>
            <span className="w-10 shrink-0 text-xs text-[#5C5443]">{y.year}</span>
            <div className="flex-1">
              <Bar pct={(y.pct / max) * 100} color={y.pct >= 20 ? "#B54A32" : "#1F3A34"} />
            </div>
            <span className="w-28 shrink-0 text-right text-xs tabular-nums text-[#2A241C]">
              {y.sf ? `${fmt.num(y.sf)} SF · ${fmt.pct(y.pct, 0)}` : "—"}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-[#9C927C]">Red bars flag years with 20%+ of the building rolling (concentration risk).</p>
    </Panel>
  );
}

export function LeasingActivity({ deals, asset }) {
  return (
    <Panel title="Leasing Activity" subtitle="New leases, renewals and live proposals" badge={asset.example && <ExampleBadge />}>
      <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D8CDB8]">
              <th className={th}>Tenant</th>
              <th className={th}>Suite</th>
              <th className={th}>Type</th>
              <th className={th}>Status</th>
              <th className={`${th} text-right`}>SF</th>
              <th className={`${th} text-right`}>Term</th>
              <th className={`${th} text-right`}>Start rent</th>
              <th className={`${th} text-right`}>Free</th>
              <th className={`${th} text-right`}>TI / SF</th>
              <th className={`${th} text-right`}>Net effective</th>
              <th className={th}>Date</th>
            </tr>
          </thead>
          <tbody className="text-[#2A241C]">
            {deals.map((d) => {
              const ner = netEffectiveRent(d);
              return (
                <tr key={`${d.tenant}-${d.date}`} className="border-b border-[#EDE6D6]">
                  <td className={`${td} font-semibold`}>{d.tenant}</td>
                  <td className={td}>{d.suite}</td>
                  <td className={td}>{d.dealType}</td>
                  <td className={td}>
                    <StatusChip status={d.status} />
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{fmt.num(d.sf)}</td>
                  <td className={`${td} text-right tabular-nums`}>{d.termMonths} mo</td>
                  <td className={`${td} text-right tabular-nums`}>{fmt.usd2(d.startRentPSF)}</td>
                  <td className={`${td} text-right tabular-nums`}>{d.freeRentMonths} mo</td>
                  <td className={`${td} text-right tabular-nums`}>{fmt.usd2(d.tiPSF)}</td>
                  <td className={`${td} text-right tabular-nums font-semibold`}>{fmt.usd2(ner)}</td>
                  <td className={td}>{fmt.date(d.date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-[#9C927C]">
        Net effective rent = total rent over the term with annual escalations, minus free rent and TI,
        per SF per year.
      </p>
    </Panel>
  );
}

export function DebtSummary({ loan, noi, asOf, example }) {
  const [rate, setRate] = useState(loan.ratePct);
  const [amort, setAmort] = useState(loan.amortYears);
  const s = loanStatus(loan, asOf);
  const changed = Number(rate) !== loan.ratePct || Number(amort) !== loan.amortYears;
  // What-if = refinance today's actual balance at the new rate / amortization.
  const whatIfPayment = monthlyPayment(s.balance, Number(rate) || 0, Math.max(1, Number(amort) || 1));
  const annualDebtService = changed ? whatIfPayment * 12 : s.annualDebtService;
  const dscr = noi / annualDebtService;
  const ltv = (s.balance / loan.currentValue) * 100;
  const debtYield = (noi / s.balance) * 100;
  const c = loan.covenants;
  const tests = [
    { label: "DSCR", value: `${dscr.toFixed(2)}x`, limit: `min ${c.minDSCR.toFixed(2)}x`, pass: dscr >= c.minDSCR },
    { label: "LTV", value: fmt.pct(ltv), limit: `max ${c.maxLTV}%`, pass: ltv <= c.maxLTV },
    { label: "Debt yield", value: fmt.pct(debtYield), limit: `min ${c.minDebtYieldPct}%`, pass: debtYield >= c.minDebtYieldPct },
  ];

  const rows = [
    ["Lender", loan.lender],
    ["Original amount", fmt.usd(loan.originalAmount)],
    ["Current balance", fmt.usd(s.balance)],
    ["Monthly payment", fmt.usd2(s.monthlyPayment)],
    ["Next payment due", fmt.date(s.nextPaymentDate)],
    ["Payments made", `${s.paymentsMade} of ${s.paymentsMade + s.monthsToMaturity} to maturity`],
    ["Next 12 mo: interest", fmt.usd(s.interestNext12)],
    ["Next 12 mo: principal", fmt.usd(s.principalNext12)],
    ["Maturity", `${fmt.date(loan.maturity)} · balloon ${fmt.usd(s.balloon)}`],
  ];

  return (
    <Panel title="Debt & Loan Payments" subtitle="Permanent loan, amortization and covenant tests" badge={example && <ExampleBadge />}>
      <div className="grid gap-6 lg:grid-cols-2">
        <dl className="text-sm divide-y divide-[#EDE6D6]">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-1.5">
              <dt className="text-[#5C5443]">{k}</dt>
              <dd className="text-right font-semibold tabular-nums text-[#2A241C]">{v}</dd>
            </div>
          ))}
        </dl>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9C927C] mb-2">Covenant tests{changed ? " (what-if)" : ""}</p>
          <div className="space-y-2">
            {tests.map((t) => (
              <div key={t.label} className="flex items-center justify-between rounded-lg border border-[#EDE6D6] px-3 py-2">
                <span className="text-sm text-[#2A241C]">
                  <span className="font-semibold">{t.label}</span> {t.value}
                  <span className="text-xs text-[#9C927C]"> ({t.limit})</span>
                </span>
                <StatusChip status={t.pass ? "Pass" : "Fail"} />
              </div>
            ))}
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9C927C] mt-5 mb-2">What-if: refinance</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-[#5C5443]">
              Rate %
              <input
                type="number"
                step="0.05"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="mt-1 block w-24 rounded-lg border border-[#D8CDB8] bg-white px-2 py-1.5 text-sm tabular-nums focus:border-[#1F3A34] focus:outline-none"
              />
            </label>
            <label className="text-xs text-[#5C5443]">
              Amortization (yrs)
              <input
                type="number"
                step="1"
                min="1"
                value={amort}
                onChange={(e) => setAmort(e.target.value)}
                className="mt-1 block w-24 rounded-lg border border-[#D8CDB8] bg-white px-2 py-1.5 text-sm tabular-nums focus:border-[#1F3A34] focus:outline-none"
              />
            </label>
            {changed && (
              <button
                type="button"
                onClick={() => {
                  setRate(loan.ratePct);
                  setAmort(loan.amortYears);
                }}
                className="text-xs font-semibold text-[#B54A32] underline underline-offset-2"
              >
                Reset
              </button>
            )}
          </div>
          {changed ? (
            <p className="mt-3 text-sm text-[#2A241C]">
              Refinanced payment <span className="font-semibold tabular-nums">{fmt.usd2(whatIfPayment)}</span>/mo
              <span className="text-[#9C927C]"> vs. {fmt.usd2(s.monthlyPayment)} today</span> · DSCR{" "}
              <span className="font-semibold tabular-nums">{dscr.toFixed(2)}x</span>
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-[#9C927C]">
              Try a different rate or amortization to see what refinancing today&apos;s balance would
              cost, and whether it would still pass the covenants.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}
