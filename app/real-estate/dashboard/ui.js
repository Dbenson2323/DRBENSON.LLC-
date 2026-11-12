// Small shared pieces so every dashboard module matches the Real Estate
// page's cream / forest-green / terracotta style.

export function Panel({ title, subtitle, badge, actions, children, id }) {
  return (
    <section id={id} className="rounded-xl border border-[#D8CDB8] bg-white p-5 sm:p-6 break-inside-avoid">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-serif font-bold text-[#1F3A34]">{title}</h3>
          {subtitle && <p className="text-xs text-[#9C927C] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {badge}
          {actions}
        </div>
      </div>
      {children}
    </section>
  );
}

export function ExampleBadge() {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide bg-[#F3E4C8] text-[#8A5A1E] px-2.5 py-1 rounded-full">
      Example data
    </span>
  );
}

export function Kpi({ label, value, note, tone }) {
  const color = tone === "good" ? "text-[#1F6B4A]" : tone === "bad" ? "text-[#B54A32]" : "text-[#1F3A34]";
  return (
    <div className="rounded-xl border border-[#D8CDB8] bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9C927C]">{label}</p>
      <p className={`mt-1 text-2xl font-serif font-bold tabular-nums ${color}`}>{value}</p>
      {note && <p className="mt-0.5 text-[11px] text-[#9C927C]">{note}</p>}
    </div>
  );
}

const STATUS_STYLES = {
  Occupied: "bg-[#E4EFE8] text-[#1F6B4A]",
  Complete: "bg-[#E4EFE8] text-[#1F6B4A]",
  Signed: "bg-[#E4EFE8] text-[#1F6B4A]",
  Pass: "bg-[#E4EFE8] text-[#1F6B4A]",
  "In progress": "bg-[#E6ECF5] text-[#2C4A7A]",
  Negotiating: "bg-[#E6ECF5] text-[#2C4A7A]",
  "LOI out": "bg-[#E6ECF5] text-[#2C4A7A]",
  Upcoming: "bg-[#EDE6D6] text-[#7A6F5A]",
  "Expiring ≤12 mo": "bg-[#F3E4C8] text-[#8A5A1E]",
  Vacant: "bg-[#F6DDD5] text-[#B54A32]",
  Behind: "bg-[#F6DDD5] text-[#B54A32]",
  Fail: "bg-[#F6DDD5] text-[#B54A32]",
};

export function StatusChip({ status }) {
  return (
    <span className={`inline-block whitespace-nowrap text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[status] ?? "bg-[#EDE6D6] text-[#7A6F5A]"}`}>
      {status}
    </span>
  );
}

export function Bar({ pct, color = "#B54A32" }) {
  return (
    <div className="h-2.5 w-full bg-[#EDE6D6] rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} />
    </div>
  );
}

export const th = "py-2 pr-3 text-left text-[10px] font-semibold uppercase tracking-wide text-[#9C927C] whitespace-nowrap";
export const td = "py-2 pr-3 whitespace-nowrap";
