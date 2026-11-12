"use client";

import { useEffect, useMemo, useState } from "react";
import StoryCard from "./StoryCard";
import { LIVE_SOURCES, runSource } from "../liveSearch";

const SORTS = [
  { key: "relevance", label: "Most relevant" },
  { key: "factual", label: "Most factual" },
  { key: "quality", label: "Highest quality" },
  { key: "newest", label: "Newest" },
];

export default function LiveResults({ query, onClose }) {
  const [status, setStatus] = useState({});
  const [results, setResults] = useState([]);
  const [sort, setSort] = useState("relevance");
  const [source, setSource] = useState("all");

  useEffect(() => {
    const controller = new AbortController();
    setResults([]);
    setSource("all");
    setStatus(Object.fromEntries(LIVE_SOURCES.map((s) => [s.key, { state: "loading" }])));

    for (const s of LIVE_SOURCES) {
      runSource(s.key, query, controller.signal)
        .then((items) => {
          if (controller.signal.aborted) return;
          setResults((prev) => [...prev, ...items]);
          setStatus((prev) => ({ ...prev, [s.key]: { state: "ok", count: items.length } }));
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setStatus((prev) => ({ ...prev, [s.key]: { state: "error", error: err.message } }));
        });
    }
    return () => controller.abort();
  }, [query]);

  const shown = useMemo(() => {
    const list = source === "all" ? results : results.filter((r) => r.liveSource === source);
    const by = {
      relevance: (a, b) =>
        b.relevanceScore - a.relevanceScore ||
        new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0),
      factual: (a, b) => b.factualScore - a.factualScore,
      quality: (a, b) => b.qualityScore - a.qualityScore,
      newest: (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0),
    }[sort];
    return [...list].sort(by);
  }, [results, sort, source]);

  const loading = Object.values(status).some((s) => s.state === "loading");

  return (
    <section className="border-b border-gray-200 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Live search</p>
            <h2 className="text-2xl font-serif font-bold text-gray-900">
              &ldquo;{query}&rdquo;
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-300 rounded-full px-3 py-1.5"
          >
            ✕ Close
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-500 leading-relaxed">
          Only searches sites that allow direct lookups: world news (GDELT), Hacker News,
          research papers (OpenAlex) and GitHub. Many outlets can&apos;t be reached this way, and
          news results are scored on the headline alone.{" "}
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-gray-900"
          >
            Search Google instead ↗
          </a>
        </p>

        {/* Source chips with per-source status */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSource("all")}
            aria-pressed={source === "all"}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              source === "all" ? "bg-gray-900 text-white" : "bg-white border border-gray-300 text-gray-700"
            }`}
          >
            All ({results.length})
          </button>
          {LIVE_SOURCES.map((s) => {
            const st = status[s.key] ?? {};
            const label =
              st.state === "loading" ? "…" : st.state === "error" ? "unavailable" : st.count;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSource(s.key)}
                disabled={st.state !== "ok" || st.count === 0}
                aria-pressed={source === s.key}
                title={st.state === "error" ? st.error : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  source === s.key ? "bg-gray-900 text-white" : "bg-white border border-gray-300 text-gray-700"
                }`}
              >
                {s.label} ({label})
              </button>
            );
          })}
        </div>

        <label className="mt-4 flex items-center gap-2 text-xs text-gray-500">
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

        <div className="mt-2">
          {loading && results.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">Searching live sources…</p>
          )}
          {!loading && results.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">
              No live results. Try fewer or broader words.
            </p>
          )}
          {shown.slice(0, 40).map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </div>
    </section>
  );
}
