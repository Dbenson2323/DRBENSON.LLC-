#!/usr/bin/env node
/**
 * Pulls real, Chicago-only commercial real estate job listings from three
 * sources and writes the merged, deduplicated result to data/cre-jobs.json.
 * Run every morning by .github/workflows/fetch-cre-jobs.yml, or manually
 * with `npm run fetch:jobs`.
 *
 * Sources (each wrapped in try/catch — one being down or unconfigured never
 * breaks the run, same pattern as fetch-ai-news.mjs / fetch-real-estate-news.mjs):
 *  - Adzuna  (api.adzuna.com)  — needs ADZUNA_APP_ID + ADZUNA_APP_KEY env vars.
 *  - Jooble  (jooble.org/api) — needs JOOBLE_API_KEY env var.
 *  - Direct employer feeds — the public Greenhouse/Lever job-board JSON API
 *    for whichever companies in data/cre-companies.json have a confirmed
 *    `ats` entry. No key needed; this is the same JSON those companies'
 *    own public "Careers" search page calls.
 *
 * Any source missing its API key is skipped, not treated as an error — this
 * script runs fine (just with fewer results) before those secrets exist.
 *
 * Everything is cross-checked against ROLE_KEYWORDS + CRE_SIGNAL_KEYWORDS
 * and a Chicago/Illinois location match before being kept, so a wrong or
 * stale guess (a mistyped slug, an aggregator's unrelated "analyst" result)
 * gets filtered out rather than polluting the feed.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "cre-jobs.json");
const COMPANIES_FILE = path.join(DATA_DIR, "cre-companies.json");

const MAX_AGE_DAYS = 21;
const MAX_JOBS = 150;
const FETCH_TIMEOUT_MS = 12000;
const USER_AGENT = "cre-job-search-bot/1.0 (+https://github.com/Dbenson2323/DRBENSON.LLC-)";

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, ...options.headers },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(input = "") {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// First two sentences only — the card shows a quick-read blurb, not the
// full posting (the link out is for that).
function makeTwoSentenceBlurb(text, max = 320) {
  const clean = stripHtml(text);
  const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [clean];
  const two = sentences.slice(0, 2).join(" ").trim();
  const result = two || clean;
  if (result.length <= max) return result;
  return result.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function hashId(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return `j${Math.abs(hash)}`;
}

function normalize(text = "") {
  return text
    .toLowerCase()
    .replace(/\b(llc|l\.l\.c\.|inc|inc\.|corp|corp\.|corporation|company|co\.|group|lp|l\.p\.|ltd|ltd\.)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function safe(label, fn) {
  try {
    const result = await fn();
    console.log(`[ok]   ${label}: ${Array.isArray(result) ? result.length + " items" : "done"}`);
    return result;
  } catch (err) {
    console.warn(`[skip] ${label}: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// role / relevance filtering — Chicago CRE only, nothing else
// ---------------------------------------------------------------------------

const ROLE_RULES = [
  { category: "Asset Management", keywords: ["asset management", "asset manager", "portfolio manager", "portfolio management"] },
  { category: "Investment Sales", keywords: ["investment sales", "capital markets"] },
  { category: "Acquisitions", keywords: ["acquisitions", "acquisition", "underwriting"] },
  { category: "Broker", keywords: ["broker", "brokerage", "leasing agent", "leasing associate"] },
  { category: "Analyst", keywords: ["analyst"] },
];

function detectRoleCategory(title) {
  const haystack = title.toLowerCase();
  for (const rule of ROLE_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) return rule.category;
  }
  return null;
}

const CRE_SIGNAL_KEYWORDS = [
  "real estate", "commercial real estate", "multifamily", "industrial", "warehouse",
  "logistics real estate", "office property", "office building", "retail property",
  "senior housing", "student housing", "self-storage", "self storage", "reit",
  "property management", "investment sales", "brokerage", "leasing", "landlord",
  "tenant representation", "capital markets", "acquisitions",
];

function isChicagoLocation(text = "") {
  const haystack = text.toLowerCase();
  return haystack.includes("chicago") || haystack.includes("illinois") || /\bil\b/.test(haystack);
}

function isCreSignal(text = "") {
  const haystack = text.toLowerCase();
  return CRE_SIGNAL_KEYWORDS.some((kw) => haystack.includes(kw));
}

// ---------------------------------------------------------------------------
// company enrichment (logo / specialty / AUM) — hand-curated, never fetched
// ---------------------------------------------------------------------------

function buildCompanyMatcher(companies) {
  const entries = Object.entries(companies).map(([key, c]) => ({
    key,
    norm: normalize(c.name),
    data: c,
  }));
  return (rawName) => {
    const norm = normalize(rawName);
    if (!norm) return null;
    return entries.find((e) => norm.includes(e.norm) || e.norm.includes(norm)) ?? null;
  };
}

function buildJob({ title, company, location, salaryMin, salaryMax, salaryText, description, url, source, postedAt, matcher }) {
  const roleCategory = detectRoleCategory(title);
  const combinedText = `${title} ${description ?? ""}`;
  if (!roleCategory) return null;
  if (!isChicagoLocation(location) && !isChicagoLocation(title)) return null;
  if (!isCreSignal(combinedText) && !isCreSignal(company)) return null;

  const match = matcher(company);
  const salary =
    salaryText ??
    (salaryMin && salaryMax
      ? `$${Math.round(salaryMin).toLocaleString()} – $${Math.round(salaryMax).toLocaleString()}`
      : salaryMin
      ? `From $${Math.round(salaryMin).toLocaleString()}`
      : null);

  return {
    id: hashId(`${normalize(company)}|${normalize(title)}|${normalize(location)}`),
    title: stripHtml(title),
    company: match?.data.name ?? stripHtml(company),
    companyKey: match?.key ?? null,
    logo: match ? `https://logo.clearbit.com/${match.data.domain}` : null,
    specialty: match?.data.specialty ?? null,
    aum: match?.data.aum ?? null,
    location: stripHtml(location) || "Chicago, IL",
    salary: salary || "Not listed in posting",
    blurb: makeTwoSentenceBlurb(description || title),
    url,
    source,
    roleCategory,
    postedAt: postedAt ? new Date(postedAt).toISOString() : new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// source: Adzuna
// ---------------------------------------------------------------------------

const ADZUNA_QUERIES = [
  "commercial real estate analyst",
  "commercial real estate broker",
  "real estate investment sales",
  "real estate asset management",
  "real estate acquisitions analyst",
  "industrial real estate",
];

async function fetchAdzuna(matcher) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.warn("[skip] Adzuna: ADZUNA_APP_ID/ADZUNA_APP_KEY not set");
    return [];
  }
  const all = [];
  for (const q of ADZUNA_QUERIES) {
    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(
      q
    )}&where=${encodeURIComponent("Chicago, IL")}&results_per_page=30&content-type=application/json`;
    const res = await fetchWithTimeout(url);
    const json = await res.json();
    for (const r of json.results ?? []) {
      const job = buildJob({
        title: r.title,
        company: r.company?.display_name ?? "Unknown",
        location: r.location?.display_name ?? "Chicago, IL",
        salaryMin: r.salary_min,
        salaryMax: r.salary_max,
        description: r.description,
        url: r.redirect_url,
        source: "Adzuna",
        postedAt: r.created,
        matcher,
      });
      if (job) all.push(job);
    }
  }
  return all;
}

// ---------------------------------------------------------------------------
// source: Jooble
// ---------------------------------------------------------------------------

async function fetchJooble(matcher) {
  const key = process.env.JOOBLE_API_KEY;
  if (!key) {
    console.warn("[skip] Jooble: JOOBLE_API_KEY not set");
    return [];
  }
  const all = [];
  for (const page of [1, 2]) {
    const res = await fetchWithTimeout(`https://jooble.org/api/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: "commercial real estate analyst broker investment sales asset management acquisitions",
        location: "Chicago, IL",
        page: String(page),
      }),
    });
    const json = await res.json();
    for (const r of json.jobs ?? []) {
      const job = buildJob({
        title: r.title,
        company: r.company ?? "Unknown",
        location: r.location ?? "Chicago, IL",
        salaryText: r.salary || null,
        description: r.snippet,
        url: r.link,
        source: "Jooble",
        postedAt: r.updated,
        matcher,
      });
      if (job) all.push(job);
    }
    if (!json.jobs || json.jobs.length === 0) break;
  }
  return all;
}

// ---------------------------------------------------------------------------
// source: direct employer feeds (Greenhouse / Lever), only for companies in
// cre-companies.json with a confirmed `ats` entry
// ---------------------------------------------------------------------------

async function fetchGreenhouse(slug) {
  const res = await fetchWithTimeout(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
  const json = await res.json();
  return (json.jobs ?? []).map((j) => ({
    title: j.title,
    location: j.location?.name ?? "",
    description: j.content,
    url: j.absolute_url,
    postedAt: j.updated_at,
  }));
}

async function fetchLever(slug) {
  const res = await fetchWithTimeout(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  const json = await res.json();
  return (json ?? []).map((j) => ({
    title: j.text,
    location: j.categories?.location ?? "",
    description: j.descriptionPlain ?? j.description ?? "",
    url: j.hostedUrl,
    postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
  }));
}

async function fetchDirectEmployerFeeds(companies, matcher) {
  const all = [];
  for (const [key, company] of Object.entries(companies)) {
    if (!company.ats) continue;
    const { provider, slug } = company.ats;
    const fetcher = provider === "greenhouse" ? fetchGreenhouse : provider === "lever" ? fetchLever : null;
    if (!fetcher) continue;
    const postings = await safe(`${company.name} (${provider})`, () => fetcher(slug));
    for (const p of postings) {
      const job = buildJob({
        title: p.title,
        company: company.name,
        location: p.location,
        description: p.description,
        url: p.url,
        source: provider === "greenhouse" ? "Greenhouse" : "Lever",
        postedAt: p.postedAt,
        matcher,
      });
      if (job) all.push(job);
    }
  }
  return all;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const companiesRaw = await readFile(COMPANIES_FILE, "utf-8");
  const companies = JSON.parse(companiesRaw).companies;
  const matcher = buildCompanyMatcher(companies);

  // Direct employer feeds first, then Adzuna, then Jooble — on a dedupe
  // collision the first-seen source wins, so the most authoritative data
  // (straight from the employer) is preferred over an aggregator's copy.
  const directJobs = await safe("Direct employer feeds", () => fetchDirectEmployerFeeds(companies, matcher));
  const adzunaJobs = await safe("Adzuna", () => fetchAdzuna(matcher));
  const joobleJobs = await safe("Jooble", () => fetchJooble(matcher));

  let previous = [];
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    previous = JSON.parse(raw).jobs ?? [];
  } catch {
    // first run
  }

  const byKey = new Map();
  for (const job of [...directJobs, ...adzunaJobs, ...joobleJobs, ...previous]) {
    if (!byKey.has(job.id)) byKey.set(job.id, job);
  }

  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const merged = [...byKey.values()]
    .filter((j) => {
      const t = new Date(j.postedAt).getTime();
      return Number.isFinite(t) && t >= cutoff;
    })
    .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))
    .slice(0, MAX_JOBS);

  await writeFile(
    DATA_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), jobs: merged }, null, 2) + "\n"
  );
  console.log(`\nWrote ${merged.length} jobs to ${path.relative(process.cwd(), DATA_FILE)}`);
  if (directJobs.length === 0 && adzunaJobs.length === 0 && joobleJobs.length === 0 && previous.length === 0) {
    console.warn("Warning: no sources returned data and there was no existing file. Check API keys/network access.");
  }
}

main().catch((err) => {
  console.error("Fatal error in fetch-cre-jobs:", err);
  process.exitCode = 1;
});
