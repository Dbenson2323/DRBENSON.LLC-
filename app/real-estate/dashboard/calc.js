// Pure calculation helpers for the Dashboard & Development tab. All "today"
// math uses the data file's `asOf` date, so the static page always shows the
// same numbers the data was prepared for.

const DAY = 24 * 60 * 60 * 1000;

export function toDate(iso) {
  return iso ? new Date(`${iso}T00:00:00Z`) : null;
}

export function monthsBetween(a, b) {
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) + (b.getUTCDate() - a.getUTCDate()) / 30;
}

export function daysBetween(a, b) {
  return Math.round((b - a) / DAY);
}

// --- formatting -----------------------------------------------------------

export const fmt = {
  usd: (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
  usd2: (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  musd: (n) => `$${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M`,
  num: (n) => Math.round(n).toLocaleString("en-US"),
  pct: (n, d = 1) => `${n.toFixed(d)}%`,
  date: (iso) =>
    iso ? toDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—",
};

// --- rent roll ------------------------------------------------------------

export function rentRollRows(asset, asOf) {
  const today = toDate(asOf);
  return asset.rentRoll.map((r) => {
    const vacant = !r.tenant;
    const end = toDate(r.leaseEnd);
    const monthsLeft = end ? Math.max(0, monthsBetween(today, end)) : 0;
    const annualRent = vacant ? 0 : r.sf * r.rentPSF;
    let status = "Occupied";
    if (vacant) status = "Vacant";
    else if (monthsLeft <= 12) status = "Expiring ≤12 mo";
    return { ...r, vacant, annualRent, monthsLeft, status, pctOfGBA: (r.sf / asset.totalSF) * 100 };
  });
}

export function rentRollSummary(rows, asset) {
  const leased = rows.filter((r) => !r.vacant);
  const leasedSF = leased.reduce((s, r) => s + r.sf, 0);
  const annualRent = leased.reduce((s, r) => s + r.annualRent, 0);
  // WALT weighted by rent: how long, on average, each rent dollar is locked in.
  const walt = annualRent ? leased.reduce((s, r) => s + r.annualRent * r.monthsLeft, 0) / annualRent / 12 : 0;
  const expiring12 = rows.filter((r) => r.status === "Expiring ≤12 mo");
  const vacantSF = asset.totalSF - leasedSF;
  const lossToVacancy = rows.filter((r) => r.vacant).reduce((s, r) => s + r.sf * (r.marketRentPSF ?? 0), 0);
  return {
    leasedSF,
    occupancyPct: (leasedSF / asset.totalSF) * 100,
    annualRent,
    avgRentPSF: leasedSF ? annualRent / leasedSF : 0,
    walt,
    expiringSF: expiring12.reduce((s, r) => s + r.sf, 0),
    expiringRent: expiring12.reduce((s, r) => s + r.annualRent, 0),
    vacantSF,
    lossToVacancy,
    noi: annualRent - asset.nonRecoverableExpenses,
  };
}

export function expirationSchedule(rows, asset, asOf, years = 7) {
  const startYear = toDate(asOf).getUTCFullYear();
  return Array.from({ length: years }, (_, i) => {
    const year = startYear + i;
    const expiring = rows.filter((r) => !r.vacant && toDate(r.leaseEnd).getUTCFullYear() === year);
    const sf = expiring.reduce((s, r) => s + r.sf, 0);
    return { year, sf, pct: (sf / asset.totalSF) * 100, tenants: expiring.map((r) => r.tenant) };
  });
}

// --- leasing --------------------------------------------------------------

// Net effective rent per SF per year: total rent over the term (with annual
// escalations), minus free rent and TI, spread back over the term.
export function netEffectiveRent(deal) {
  const months = deal.termMonths;
  let total = 0;
  for (let m = 0; m < months; m++) {
    const year = Math.floor(m / 12);
    const psf = deal.startRentPSF * (1 + deal.escalationPct / 100) ** year;
    if (m >= deal.freeRentMonths) total += psf / 12;
  }
  total -= deal.tiPSF;
  return total / (months / 12);
}

// --- debt -----------------------------------------------------------------

export function monthlyPayment(principal, ratePct, amortYears) {
  const r = ratePct / 100 / 12;
  const n = amortYears * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - (1 + r) ** -n);
}

export function balanceAfter(principal, ratePct, amortYears, monthsPaid) {
  const r = ratePct / 100 / 12;
  const pmt = monthlyPayment(principal, ratePct, amortYears);
  if (r === 0) return principal - pmt * monthsPaid;
  return principal * (1 + r) ** monthsPaid - pmt * (((1 + r) ** monthsPaid - 1) / r);
}

export function loanStatus(loan, asOf, overrides = {}) {
  const ratePct = overrides.ratePct ?? loan.ratePct;
  const amortYears = overrides.amortYears ?? loan.amortYears;
  const today = toDate(asOf);
  const paid = Math.max(0, Math.floor(monthsBetween(toDate(loan.originated), today)));
  const pmt = monthlyPayment(loan.originalAmount, ratePct, amortYears);
  const balance = balanceAfter(loan.originalAmount, ratePct, amortYears, paid);
  const next12Balance = balanceAfter(loan.originalAmount, ratePct, amortYears, paid + 12);
  const principalNext12 = balance - next12Balance;
  const termMonths = Math.round(monthsBetween(toDate(loan.originated), toDate(loan.maturity)));
  const balloon = balanceAfter(loan.originalAmount, ratePct, amortYears, termMonths);
  const nextPayment = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + (today.getUTCDate() > 1 ? 1 : 0), 1));
  return {
    ratePct,
    amortYears,
    paymentsMade: paid,
    monthlyPayment: pmt,
    annualDebtService: pmt * 12,
    balance,
    principalNext12,
    interestNext12: pmt * 12 - principalNext12,
    balloon,
    monthsToMaturity: Math.max(0, termMonths - paid),
    nextPaymentDate: nextPayment.toISOString().slice(0, 10),
  };
}

// --- construction ---------------------------------------------------------

export function milestoneRows(milestones, asOf) {
  const today = toDate(asOf);
  return milestones.map((m) => {
    const target = toDate(m.target);
    let status;
    let pct;
    if (m.actual) {
      status = "Complete";
      pct = 100;
    } else {
      pct = m.pctComplete ?? 0;
      if (target < today) status = "Behind";
      else if (pct > 0) status = "In progress";
      else status = "Upcoming";
    }
    const varianceDays = m.actual ? daysBetween(target, toDate(m.actual)) : target < today ? daysBetween(target, today) : null;
    return { ...m, status, pct, varianceDays };
  });
}

export function constructionSummary(dev, rows) {
  const totalWeight = rows.reduce((s, r) => s + r.weight, 0);
  const pctComplete = rows.reduce((s, r) => s + r.weight * r.pct, 0) / totalWeight;
  const budget = dev.budget.reduce((s, b) => s + b.budget, 0);
  const spent = dev.budget.reduce((s, b) => s + b.spent, 0);
  const done = rows.filter((r) => r.actual);
  const avgSlip = done.length ? done.reduce((s, r) => s + r.varianceDays, 0) / done.length : 0;
  return { pctComplete, budget, spent, spentPct: (spent / budget) * 100, avgSlip, behind: rows.filter((r) => r.status === "Behind").length };
}

// --- export ---------------------------------------------------------------

export function downloadCsv(filename, header, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
