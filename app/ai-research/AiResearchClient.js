"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StoryCard from "./components/StoryCard";
import CapabilityCard from "./components/CapabilityCard";

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

// Mirrors SOURCE_BASELINE / scoreStory in scripts/fetch-ai-news.mjs — keep in sync.
const SCORE_BASELINES = [
  { type: "Research papers", example: "arXiv", factual: 96, quality: 88 },
  { type: "Lab announcements", example: "OpenAI, Anthropic…", factual: 90, quality: 85 },
  { type: "Open source", example: "GitHub, Hugging Face", factual: 82, quality: 74 },
  { type: "Tech journalism", example: "TechCrunch, MIT TR…", factual: 78, quality: 80 },
  { type: "Aggregators", example: "Hacker News", factual: 62, quality: 65 },
  { type: "Forums", example: "Reddit", factual: 48, quality: 55 },
];

function ScoreGuideBody() {
  return (
    <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
      <div className="rounded-lg bg-white border border-gray-200 p-3">
        <p className="text-sm font-semibold text-gray-900">Factual %</p>
        <p className="text-gray-500 mb-2">Is it reporting facts or opinion?</p>
        <ul className="space-y-1">
          <li><span className="font-semibold text-gray-900">Start:</span> trust level of the source (table below)</li>
          <li><span className="font-semibold text-red-700">−20</span> opinion or rumor words (&ldquo;I think,&rdquo; &ldquo;leaked,&rdquo; &ldquo;allegedly&rdquo;)</li>
          <li><span className="font-semibold text-green-700">+4</span> concrete events (&ldquo;released,&rdquo; &ldquo;launched,&rdquo; &ldquo;study&rdquo;)</li>
        </ul>
      </div>

      <div className="rounded-lg bg-white border border-gray-200 p-3">
        <p className="text-sm font-semibold text-gray-900">Quality %</p>
        <p className="text-gray-500 mb-2">How substantive is the write-up?</p>
        <ul className="space-y-1">
          <li><span className="font-semibold text-gray-900">Start:</span> writing standard of the source (table below)</li>
          <li><span className="font-semibold text-green-700">+5</span> detailed summary (500+ characters)</li>
          <li><span className="font-semibold text-red-700">−8</span> thin summary (under 80 characters)</li>
        </ul>
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
          {SCORE_BASELINES.map((row) => (
            <tr key={row.type} className="border-t border-gray-200">
              <td className="py-1.5 pr-2">
                <span className="text-gray-900">{row.type}</span>
                <span className="block text-[10px] text-gray-400">{row.example}</span>
              </td>
              <td className="py-1.5 text-right tabular-nums">{row.factual}</td>
              <td className="py-1.5 text-right tabular-nums">{row.quality}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-700" />80%+</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-700" />55–79%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-700" />under 55%</span>
      </div>

      <p className="text-[11px] text-gray-400">
        Automated rules applied daily: a quick trust signal, not a fact-check.
      </p>
    </div>
  );
}

export default function AiResearchClient({ stories, generatedAt, capabilities }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [tab, setTab] = useState("feed");

  const categories = useMemo(() => {
    const set = new Set(stories.map((s) => s.category));
    return ["All", ...Array.from(set).sort()];
  }, [stories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories.filter((s) => {
      const matchesCategory = activeCategory === "All" || s.category === activeCategory;
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.blurb.toLowerCase().includes(q) ||
        s.sourceName.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [stories, query, activeCategory]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Hero / search */}
      <header className="pt-14 pb-6 px-6 flex flex-col items-center text-center border-b border-gray-200">
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-900 mb-6 self-start ml-2 sm:ml-8">
          ← Back to home
        </Link>
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-gray-900">
          AI Research Feed
        </h1>
        <p className="text-gray-500 text-sm md:text-base max-w-xl mt-3 mb-6">
          Every AI advance worth knowing about, pulled daily from research papers, labs, and
          the community — scored for how factual vs. opinionated it is, and how well it&apos;s written.
        </p>

        <div className="w-full max-w-xl relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search AI research, models, labs…"
            className="w-full rounded-full bg-white border border-gray-300 focus:border-gray-900 focus:outline-none px-6 py-3.5 text-sm text-gray-900 placeholder-gray-400"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>

        {query.trim() && (
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(query.trim() + " AI")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-600 hover:text-gray-900 underline underline-offset-2 mt-3"
          >
            {filtered.length} result{filtered.length === 1 ? "" : "s"} in this feed for &ldquo;{query.trim()}&rdquo;
            — search the wider web instead ↗
          </a>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Last updated {formatDate(generatedAt)} · refreshes automatically every day
        </p>
      </header>

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
          <div className="sticky top-0 z-10 backdrop-blur-md bg-white/90 border-b border-gray-200 px-4 py-3 overflow-x-auto">
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
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-16">
                No stories match &ldquo;{query}&rdquo; in {activeCategory}.
              </p>
            )}
            {filtered.map((story, i) => (
              <StoryCard key={story.id} story={story} featured={i === 0 && activeCategory === "All" && !query.trim()} />
            ))}
          </main>

          <aside className="hidden lg:block py-4">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
                How the scores work
              </p>
              <ScoreGuideBody />
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
        Scores are automated estimates based on source type and content, not a manual fact-check.
        Sources: arXiv, Hacker News, Reddit, GitHub Trending, and official/industry blogs.
      </footer>
    </div>
  );
}
