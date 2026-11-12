function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const days = Math.round((Date.now() - then) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

const ASSET_LABELS = {
  multifamily: "Multifamily",
  industrial: "Industrial",
  office: "Office",
  retail: "Retail",
  hospitality: "Hospitality",
  selfStorage: "Self-Storage",
  seniorHousing: "Senior Housing",
};

// Principals first, then the people who financed, built or brokered it.
const ROLE_ORDER = ["Buyer", "Seller", "Borrower", "Lender", "Developer", "Owner", "Tenant", "Broker", "Architect", "Contractor"];

const TYPE_STYLES = {
  Sale: "bg-[#1F3A34] text-white",
  Financing: "bg-[#2C4A7A] text-white",
  Refinancing: "bg-[#2C4A7A] text-white",
  Lease: "bg-[#8A5A1E] text-white",
  Development: "bg-[#B54A32] text-white",
  Conversion: "bg-[#B54A32] text-white",
  Renovation: "bg-[#B54A32] text-white",
  Expansion: "bg-[#8A5A1E] text-white",
  Merger: "bg-[#5C5443] text-white",
  Commentary: "bg-[#EDE6D6] text-[#7A6F5A]",
};

function groupParties(parties = []) {
  const byRole = new Map();
  for (const p of parties) {
    if (!byRole.has(p.role)) byRole.set(p.role, []);
    byRole.get(p.role).push(p.name);
  }
  return ROLE_ORDER.filter((r) => byRole.has(r)).map((role) => ({ role, names: byRole.get(role) }));
}

function DealSnapshot({ deal, assetClass }) {
  if (!deal) return null;
  const parties = groupParties(deal.parties);
  const asset = ASSET_LABELS[assetClass];
  const facts = [
    deal.amount && ["Deal value", deal.amount],
    deal.size && ["Size", deal.size],
    deal.pricePerUnit && ["Price", deal.pricePerUnit],
    asset && ["Asset", asset],
  ].filter(Boolean);

  if (deal.type === "Commentary") {
    return (
      <aside className="sm:w-60 shrink-0 border-t sm:border-t-0 sm:border-l border-[#EDE6D6] pt-3 sm:pt-0 sm:pl-4">
        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${TYPE_STYLES.Commentary}`}>
          Market commentary
        </span>
      </aside>
    );
  }
  if (!deal.type && facts.length === 0 && parties.length === 0) return null;

  return (
    <aside className="sm:w-60 shrink-0 border-t sm:border-t-0 sm:border-l border-[#EDE6D6] pt-3 sm:pt-0 sm:pl-4 text-xs">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9C927C]">Deal snapshot</span>
        {deal.type && (
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${TYPE_STYLES[deal.type] ?? TYPE_STYLES.Commentary}`}>
            {deal.type}
          </span>
        )}
      </div>

      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[10px] uppercase tracking-wide text-[#9C927C]">{label}</dt>
              <dd className="font-semibold text-[#2A241C] tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {parties.length > 0 && (
        <div className="border-t border-[#EDE6D6] pt-2">
          <p className="text-[10px] uppercase tracking-wide text-[#9C927C] mb-1">Involved parties</p>
          <dl className="space-y-1">
            {parties.map(({ role, names }) => (
              <div key={role} className="flex gap-2">
                <dt className="w-16 shrink-0 text-[#9C927C]">{role}</dt>
                <dd className="font-semibold text-[#1F3A34]">{names.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </aside>
  );
}

export default function NewsList({ items }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#D8CDB8] bg-white/50 p-8 text-center text-[#9C927C]">
        No deal news for this market yet — this list updates automatically every day from
        commercial real estate trade press.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <a
          key={item.url}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-lg border border-[#D8CDB8] bg-white p-4 hover:border-[#B54A32] transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-[#9C927C] mb-1.5">
              <span className="font-semibold text-[#B54A32]">{item.sourceName}</span>
              <span>·</span>
              <span>{timeAgo(item.publishedAt)}</span>
            </div>
            <h4 className="font-semibold text-[#2A241C] leading-snug">{item.title}</h4>
            <p className="text-sm text-[#5C5443] mt-1 leading-relaxed line-clamp-3">{item.blurb}</p>
          </div>
          <DealSnapshot deal={item.deal} assetClass={item.assetClass} />
        </a>
      ))}
      <p className="text-[11px] text-[#9C927C]">
        Deal snapshots are pulled automatically from each article&apos;s text; check the article for
        full terms.
      </p>
    </div>
  );
}
