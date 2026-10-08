"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import JobCard from "./components/JobCard";

const ROLE_CATEGORIES = ["All", "Analyst", "Acquisitions", "Development", "Asset Management", "Investment Sales", "Broker"];

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function JobSearchClient({ jobs, generatedAt }) {
  const [query, setQuery] = useState("");
  const [activeRole, setActiveRole] = useState("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesRole = activeRole === "All" || job.roleCategory === activeRole;
      const matchesQuery =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        (job.specialty ?? "").toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [jobs, query, activeRole]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="pt-14 pb-6 px-6 flex flex-col items-center text-center border-b border-gray-200">
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-900 mb-6 self-start ml-2 sm:ml-8">
          ← Back to home
        </Link>
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-gray-900">
          Chicago CRE Job Search
        </h1>
        <p className="text-gray-500 text-sm md:text-base max-w-xl mt-3 mb-6">
          Live commercial real estate openings in Chicago — acquisitions, development, investment
          analysis, and asset management roles, pulled daily from employer job boards and
          job-search APIs. Student/internship programs are filtered out.
        </p>

        <div className="w-full max-w-xl relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, company, or specialty…"
            className="w-full rounded-full bg-white border border-gray-300 focus:border-gray-900 focus:outline-none px-6 py-3.5 text-sm text-gray-900 placeholder-gray-400"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          {generatedAt ? `Last updated ${formatDate(generatedAt)}` : "Not yet populated"} · refreshes
          automatically every morning
        </p>
      </header>

      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/90 border-b border-gray-200 px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 justify-center min-w-max mx-auto max-w-4xl">
          {ROLE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveRole(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeRole === cat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-16">
            {jobs.length === 0
              ? "No listings yet — this page populates once the daily job fetch has run at least once."
              : `No openings match "${query}" in ${activeRole}.`}
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-5 items-start">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </main>

      <footer className="text-center text-xs text-gray-400 py-12 px-6">
        Listings are pulled from Adzuna, Jooble, and direct employer job boards, filtered to Chicago
        commercial real estate roles. Salary ranges are shown exactly as written in the posting — not
        every employer includes one. Not a complete picture of the market, just what these sources surface.
      </footer>
    </div>
  );
}
