// The one section on this page that's pure personal opinion, not
// automated data or a heuristic — so it's edited by hand in
// data/real-estate-personal-notes.json rather than fetched or generated.
export default function MyTake({ marketLabel, notes }) {
  const overview = notes?.overview?.trim();
  const headwinds = notes?.headwinds ?? [];
  const tailwinds = notes?.tailwinds ?? [];
  const sourceReport = notes?.sourceReport;
  const isEmpty = !overview && headwinds.length === 0 && tailwinds.length === 0;

  return (
    <div className="rounded-xl border border-[#D8CDB8] bg-white p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-serif font-bold text-[#1F3A34]">My Take on {marketLabel}</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wide bg-[#F3E4C8] text-[#8A5A1E] px-2.5 py-1 rounded-full">
          Personal opinion
        </span>
      </div>

      {isEmpty ? (
        <p className="text-sm text-[#9C927C] italic">
          Not filled in yet — add your overview, headwinds, and tailwinds for {marketLabel} in
          data/real-estate-personal-notes.json.
        </p>
      ) : (
        <>
          {overview && <p className="text-sm text-[#5C5443] leading-relaxed mb-5">{overview}</p>}
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#B54A32] mb-2">
                Headwinds
              </p>
              {headwinds.length > 0 ? (
                <ul className="space-y-1.5 text-sm text-[#5C5443]">
                  {headwinds.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#B54A32]">−</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#9C927C] italic">None added yet.</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1F7A4D] mb-2">
                Tailwinds
              </p>
              {tailwinds.length > 0 ? (
                <ul className="space-y-1.5 text-sm text-[#5C5443]">
                  {tailwinds.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-[#1F7A4D]">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#9C927C] italic">None added yet.</p>
              )}
            </div>
          </div>
        </>
      )}

      {sourceReport && (
        <div className="mt-5 pt-4 border-t border-[#EDE6D6]">
          <a
            href={sourceReport.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-[#5C5443] underline underline-offset-2 hover:text-[#1F3A34]"
          >
            Source: {sourceReport.label} ↓
          </a>
        </div>
      )}
    </div>
  );
}
