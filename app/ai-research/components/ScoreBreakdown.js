// The "why this score" panel under each story: the starting point for the
// source type, every plus/minus factor that applied, and the final total.

function FactorRow({ points, label, detail }) {
  const positive = points > 0;
  return (
    <li className="flex items-start gap-2 py-1">
      <span
        className={`w-9 shrink-0 text-right font-semibold tabular-nums ${
          positive ? "text-green-700" : "text-red-700"
        }`}
      >
        {positive ? "+" : "−"}
        {Math.abs(points)}
      </span>
      <span className="min-w-0">
        <span className="text-gray-900">{label}</span>
        {detail && <span className="block text-[11px] text-gray-500">{detail}</span>}
      </span>
    </li>
  );
}

function Column({ title, start, sourceLabel, factors, total }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{title}</p>
      <ul className="text-xs divide-y divide-gray-100">
        <li className="flex items-start gap-2 py-1">
          <span className="w-9 shrink-0 text-right font-semibold tabular-nums text-gray-900">{start}</span>
          <span className="text-gray-600">Start: {sourceLabel}</span>
        </li>
        {factors.length === 0 && (
          <li className="py-1 pl-11 text-gray-400">No adjustments</li>
        )}
        {factors.map((f) => (
          <FactorRow key={f.label} {...f} />
        ))}
        <li className="flex items-center gap-2 pt-2 mt-1 border-t border-gray-300">
          <span className="w-9 shrink-0 text-right font-bold tabular-nums text-gray-900">{total}%</span>
          <span className="font-semibold text-gray-900">Final score</span>
        </li>
      </ul>
    </div>
  );
}

export default function ScoreBreakdown({ story }) {
  const s = story.scoring;
  if (!s) return null;

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="grid gap-5 sm:grid-cols-2">
        <Column
          title="Factual"
          start={s.factualStart}
          sourceLabel={s.sourceLabel}
          factors={s.factual}
          total={story.factualScore}
        />
        <Column
          title="Quality"
          start={s.qualityStart}
          sourceLabel={s.sourceLabel}
          factors={s.quality}
          total={story.qualityScore}
        />
      </div>
      <p className="mt-4 text-[11px] text-gray-500 leading-relaxed">
        <span className="font-semibold text-gray-700">Overall {story.overallScore}%</span> (60% factual,
        40% quality) · <span className="font-semibold text-gray-700">{story.confidence} confidence</span>,
        based on {s.wordsAnalyzed} words of headline and summary. Automated text analysis, not a
        fact-check of the claims themselves.
      </p>
    </div>
  );
}
