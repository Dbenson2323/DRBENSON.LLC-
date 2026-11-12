"use client";

import { useMemo, useState } from "react";
import StoryCard from "./components/StoryCard";
import CapabilityCard from "./components/CapabilityCard";
import LiveResults from "./components/LiveResults";
import { SCORING_GUIDE } from "../../scripts/lib/scoreStory.mjs";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function GuideList({ items }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.label} className="flex gap-2">
          <span
            className={`w-16 shrink-0 text-right font-semibold tabular-nums ${
              item.points.startsWith("−") || item.points.startsWith("up to −")
                ? "text-red-700"
                : item.points.startsWith("+") || item.points.startsWith("up to +")
                ? "text-green-700"
                : "text-gray-700"
            }`}
          >
            {item.points}
          </span>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function ScoreGuideBody() {
  return (
    <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
      <p>
        Each story starts from its source type&apos;s baseline, then gains or loses points for
        what its headline and summary actually contain. Open{" "}
        <span className="font-semibold text-gray-900">Why this score?</span> on any story to see
        its exact math.
      </p>

      <div className="rounded-lg bg-white border border-gray-200 p-3">
        <p className="text-sm font-semibold text-gray-900">Factual %</p>
        <p className="text-gray-500 mb-2">Is it reporting checkable facts, or opinion and speculation?</p>
        <GuideList items={SCORING_GUIDE.factual} />
      </div>

      <div className="rounded-lg bg-white border border-gray-200 p-3">
        <p className="text-sm font-semibold text-gray-900">Quality %</p>
        <p className="text-gray-500 mb-2">How clear, specific and substantive is the write-up?</p>
        <GuideList items={SCORING_GUIDE.quality} />
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-gray-400">
            <th className="pb-1 font-medium">Starting point</th>
            <th className="pb-1 font-medium text-right">Fact.</th>
            <th className="pb-1 font-medium text-right">Qual.</th>
          </tr>
        </thead>
        <tbody>
          {SCORING_GUIDE.sources.map((row) => (
            <tr key={row.key} className="border-t border-gray-200">
              <td className="py-1.5 pr-2 text-gray-900">{row.label}</td>
              <td className="py-1.5 text-right tabular-nums">{row.factual}</td>
              <td className="py-1.5 text-right tabular-nums">{row.quality}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Factual labels</p>
        <ul className="space-y-0.5">
          {SCORING_GUIDE.verdicts.map((v) => (
            <li key={v.label} className="flex justify-between">
              <span>{v.label}</span>
              <span className="tabular-nums text-gray-400">{v.min}%+</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-700" />80%+</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-700" />55–79%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-700" />under 55%</span>
      </div>

      <p className="text-[11px] text-gray-400">
        Overall = 60% factual + 40% quality. Confidence reflects how much text there was to
        analyze. Automated text analysis, applied daily: a trust signal, not a fact-check.
      </p>
    </div>
  );
}

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "factual", label: "Most factual" },
  { key: "quality", label: "Highest quality" },
  { key: "overall", label: "Best overall" },
];

const MIN_FACTUAL = [0, 60, 75, 85];

function average(list, key) {
  if (list.length === 0) return 0;
  return Math.round(list.reduce((sum, s) => sum + (s[key] ?? 0), 0) / list.length);
}

function FeedStats({ stories }) {
  const strong = stories.filter((s) => s.factualScore >= 80).length;
  const speculative = stories.filter((s) => s.factualScore < 60).length;
  const stats = [
    { label: "Stories shown", value: stories.length },
    { label: "Avg. factual", value: `${average(stories, "factualScore")}%` },
    { label: "Avg. quality", value: `${average(stories, "qualityScore")}%` },
    { label: "80%+ factual", value: stories.length ? `${Math.round((strong / stories.length) * 100)}%` : "–" },
    { label: "Under 60% factual", value: speculative },
  ];
  return (
    <dl className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
          <dt className="text-[10px] uppercase tracking-wide text-gray-400">{stat.label}</dt>
          <dd className="text-lg font-semibold tabular-nums text-gray-900">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SourceScorecard({ stories }) {
  const rows = useMemo(() => {
    const bySource = new Map();
    for (const s of stories) {
      if (!bySource.has(s.sourceName)) bySource.set(s.sourceName, []);
      bySource.get(s.sourceName).push(s);
    }
    return [...bySource.entries()]
      .map(([name, list]) => ({
        name,
        count: list.length,
        factual: average(list, "factualScore"),
        quality: average(list, "qualityScore"),
      }))
      .sort((a, b) => b.factual - a.factual || b.count - a.count);
  }, [stories]);

  if (rows.length === 0) return null;

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-wide text-gray-400">
          <th className="pb-1 font-medium">Source</th>
          <th className="pb-1 font-medium text-right">#</th>
          <th className="pb-1 font-medium text-right">Fact.</th>
          <th className="pb-1 font-medium text-right">Qual.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name} className="border-t border-gray-200">
            <td className="py-1.5 pr-2 text-gray-900">{row.name}</td>
            <td className="py-1.5 text-right tabular-nums text-gray-400">{row.count}</td>
            <td className="py-1.5 text-right tabular-nums">{row.factual}</td>
            <td className="py-1.5 text-right tabular-nums">{row.quality}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AiResearchClient({ stories, generatedAt, capabilities }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [tab, setTab] = useState("feed");
  const [sort, setSort] = useState("newest");
  const [minFactual, setMinFactual] = useState(0);
  const [liveQuery, setLiveQuery] = useState("");

  function runLiveSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (q.length >= 2) setLiveQuery(q);
  }

  const categories = useMemo(() => {
    const set = new Set(stories.map((s) => s.category));
    return ["All", ...Array.from(set).sort()];
  }, [stories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = stories.filter((s) => {
      const matchesCategory = activeCategory === "All" || s.category === activeCategory;
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.blurb.toLowerCase().includes(q) ||
        s.sourceName.toLowerCase().includes(q);
      return matchesCategory && matchesQuery && (s.factualScore ?? 0) >= minFactual;
    });
    if (sort === "newest") return list;
    const key = { factual: "factualScore", quality: "qualityScore", overall: "overallScore" }[sort];
    return [...list].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
  }, [stories, query, activeCategory, minFactual, sort]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Hero / search */}
      <header className="pt-14 pb-6 px-6 flex flex-col items-center text-center border-b border-gray-200">
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-gray-900">
          AI Research Feed
        </h1>
        <p className="text-gray-500 text-sm md:text-base max-w-xl mt-3 mb-6">
          Every AI advance worth knowing about, pulled daily from research papers, labs, and
          the community — scored for how factual vs. opinionated it is, and how well it&apos;s written.
        </p>

        <form onSubmit={runLiveSearch} className="w-full max-w-xl relative" role="search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search AI research, models, labs…"
            aria-label="Search"
            className="w-full rounded-full bg-white border border-gray-300 focus:border-gray-900 focus:outline-none pl-6 pr-32 py-3.5 text-sm text-gray-900 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={query.trim().length < 2}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black disabled:bg-gray-300"
          >
            Search live
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-3">
          {query.trim()
            ? `${filtered.length} match${filtered.length === 1 ? "" : "es"} in this feed · press Search live to look beyond it`
            : "Typing filters this feed · Search live checks outside news, papers and GitHub"}
        </p>

        <p className="text-xs text-gray-400 mt-4">
          Last updated {formatDate(generatedAt)} · refreshes automatically every day
        </p>
      </header>

      {liveQuery && <LiveResults query={liveQuery} onClose={() => setLiveQuery("")} />}

      {/* Feed / New Capabilities tabs */}
      <div className="flex justify-center gap-8 border-b border-gray-200 px-4">
        <button
          onClick={() => setTab("feed")}
          className={`py-4 text-sm font-semibold uppercase tracking-wide border-b-2 transition-colors ${
            tab === "feed"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          News Feed
        </button>
        <button
          onClick={() => setTab("capabilities")}
          className={`py-4 text-sm font-semibold uppercase tracking-wide border-b-2 transition-colors ${
            tab === "capabilities"
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          New Capabilities
        </button>
      </div>

      {tab === "feed" ? (
        <>
          {/* Category chips */}
          <div className="sticky top-16 z-10 backdrop-blur-md bg-white/90 border-b border-gray-200 px-4 py-3 overflow-x-auto">
            <div className="flex gap-2 justify-center min-w-max mx-auto max-w-4xl">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Feed */}
          <div className="max-w-5xl mx-auto px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-8">
          <main className="max-w-2xl w-full mx-auto py-4">
            {/* On small screens the score guide collapses above the feed */}
            <details className="group lg:hidden rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mb-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900 flex items-center justify-between">
                How Factual &amp; Quality scores work
                <span className="text-gray-400 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-3">
                <ScoreGuideBody />
              </div>
            </details>
            <details className="group lg:hidden rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mb-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900 flex items-center justify-between">
                Source scorecard
                <span className="text-gray-400 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-3">
                <SourceScorecard stories={stories} />
              </div>
            </details>
            {/* Sort + minimum-factual filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <label className="flex items-center gap-2 text-xs text-gray-500">
                Sort by
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-900 focus:border-gray-900 focus:outline-none"
                >
                  {SORTS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-1.5 text-xs text-gray-500" role="group" aria-label="Minimum factual score">
                <span className="mr-1">Factual</span>
                {MIN_FACTUAL.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setMinFactual(min)}
                    aria-pressed={minFactual === min}
                    className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                      minFactual === min ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {min === 0 ? "Any" : `${min}%+`}
                  </button>
                ))}
              </div>
            </div>
            <FeedStats stories={filtered} />

            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-16">
                No stories match these filters in {activeCategory}.
              </p>
            )}
            {filtered.map((story, i) => (
              <StoryCard key={story.id} story={story} featured={i === 0 && activeCategory === "All" && !query.trim() && sort === "newest" && minFactual === 0} />
            ))}
          </main>

          <aside className="hidden lg:block py-4">
            <div className="sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
                How the scores work
              </p>
              <ScoreGuideBody />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mt-6 mb-2">
                Source scorecard
              </p>
              <p className="text-[11px] text-gray-500 mb-2">Average scores across every story in the feed.</p>
              <SourceScorecard stories={stories} />
            </div>
          </aside>
          </div>
        </>
      ) : (
        <main className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-center text-gray-500 text-sm max-w-2xl mx-auto mb-8">
            Hand-picked, genuinely new things AI agents can do right now — what it is, how it
            works, the real trade-offs, and where to try it yourself.
          </p>
          <div className="grid sm:grid-cols-2 gap-5 items-start">
            {capabilities.map((cap) => (
              <CapabilityCard key={cap.id} capability={cap} />
            ))}
          </div>
        </main>
      )}

      <footer className="text-center text-xs text-gray-400 py-12 px-6">
        Scores are automated text analysis of each story&apos;s source, headline and summary, not a manual fact-check.
        Sources: arXiv, Hacker News, Reddit, GitHub Trending, and official/industry blogs.
      </footer>
    </div>
  );
}
