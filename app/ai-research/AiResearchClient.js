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
  { type: "Research papers", sources: "arXiv", factual: 96, quality: 88 },
  { type: "Official lab blogs", sources: "OpenAI, Anthropic, DeepMind, Meta AI, NVIDIA…", factual: 90, quality: 85 },
  { type: "Open source", sources: "GitHub Trending, Hugging Face", factual: 82, quality: 74 },
  { type: "Tech journalism", sources: "MIT Tech Review, TechCrunch, VentureBeat…", factual: 78, quality: 80 },
  { type: "Link aggregators", sources: "Hacker News", factual: 62, quality: 65 },
  { type: "Community forums", sources: "Reddit", factual: 48, quality: 55 },
];

function ScoreExplainer() {
  return (
    <details className="group rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 mb-4 text-sm text-gray-600">
      <summary className="cursor-pointer list-none font-semibold text-gray-900 flex items-center justify-between">
        How are the Factual and Quality scores calculated?
        <span className="text-gray-400 transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-3 space-y-3 leading-relaxed">
        <p>
          Every story is scored automatically when the feed refreshes each day. The scores are
          estimates of how much to trust a story at a glance, not a claim-by-claim fact-check.
        </p>
        <p>
          <span className="font-semibold text-gray-900">1. Source baseline.</span> Each story
          starts from a baseline set by the kind of source it comes from. Research papers and
          official lab announcements start high; open forums start low.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-1 pr-3 font-medium">Source type</th>
                <th className="py-1 pr-3 font-medium">Factual</th>
                <th className="py-1 font-medium">Quality</th>
              </tr>
            </thead>
            <tbody>
              {SCORE_BASELINES.map((row) => (
                <tr key={row.type} className="border-t border-gray-200">
                  <td className="py-1.5 pr-3">
                    <span className="text-gray-900">{row.type}</span>
                    <span className="block text-gray-400">{row.sources}</span>
                  </td>
                  <td className="py-1.5 pr-3">{row.factual}%</td>
                  <td className="py-1.5">{row.quality}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          <span className="font-semibold text-gray-900">2. Factual adjustments.</span> The
          headline and summary are scanned for wording. Opinion or speculation signals
          (&ldquo;opinion,&rdquo; &ldquo;I think,&rdquo; &ldquo;rumor,&rdquo; &ldquo;leaked,&rdquo;
          &ldquo;allegedly,&rdquo; &ldquo;hot take&rdquo;) subtract 20 points. Concrete-event
          signals (&ldquo;announced,&rdquo; &ldquo;released,&rdquo; &ldquo;launched,&rdquo;
          &ldquo;study,&rdquo; &ldquo;paper&rdquo;) add 4.
        </p>
        <p>
          <span className="font-semibold text-gray-900">3. Quality adjustments.</span> Longer,
          more substantive summaries (500+ characters) add 5 points; very thin ones (under 80
          characters) lose 8.
        </p>
        <p>
          Scores are capped between 0 and 100%. Colors:{" "}
          <span className="font-semibold text-green-700">80%+ green</span>,{" "}
          <span className="font-semibold text-yellow-700">55–79% amber</span>,{" "}
          <span className="font-semibold text-red-700">below 55% red</span>.
        </p>
      </div>
    </details>
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
          <main className="max-w-2xl mx-auto px-4 py-4">
            <ScoreExplainer />
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-16">
                No stories match &ldquo;{query}&rdquo; in {activeCategory}.
              </p>
            )}
            {filtered.map((story, i) => (
              <StoryCard key={story.id} story={story} featured={i === 0 && activeCategory === "All" && !query.trim()} />
            ))}
          </main>
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
