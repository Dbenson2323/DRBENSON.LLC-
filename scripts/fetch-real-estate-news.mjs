#!/usr/bin/env node
/**
 * Pulls real, free, public data for the Real Estate section and writes it
 * to data/real-estate-rates.json and data/real-estate-news.json. Run daily
 * by .github/workflows/fetch-real-estate-news.yml, or manually with
 * `npm run fetch:real-estate`.
 *
 * Two different kinds of real data, and nothing else:
 *  - Interest rates: pulled straight from the Federal Reserve (FRED)'s
 *    public CSV export endpoint. No API key required, no scraping, no
 *    guessing — these are the actual current published rates.
 *  - Deal/market news: pulled from commercial real estate trade-press RSS
 *    feeds, filtered to stories that actually mention one of the four
 *    focus markets. If a feed's URL is wrong or it's down, it's skipped
 *    (see safe()) rather than breaking the run — same pattern as
 *    fetch-ai-news.mjs.
 *
 * Deliberately NOT included: market-level absorption/supply/vacancy
 * numbers. Those come from paid data providers (CoStar, CBRE, JLL) with no
 * free public API, so they are NOT fabricated here. They live instead in
 * data/real-estate-metrics.json as hand-entered, clearly-labeled example
 * figures for you to replace with real numbers from your own data access.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import { decodeEntities, extractDeal, DEAL_EXTRACTOR_VERSION } from "./lib/extractDeal.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const RATES_FILE = path.join(DATA_DIR, "real-estate-rates.json");
const NEWS_FILE = path.join(DATA_DIR, "real-estate-news.json");

const MAX_AGE_DAYS = 45;
const MAX_ITEMS = 120;
const FETCH_TIMEOUT_MS = 12000;

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "real-estate-feed-bot/1.0 (+https://github.com/Dbenson2323/DRBENSON.LLC-)",
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Decodes numeric entities too ("Cushman &#038; Wakefield" -> "Cushman & Wakefield").
function stripHtml(input = "") {
  return decodeEntities(String(input).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function makeBlurb(text, max = 320) {
  const clean = stripHtml(text);
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function hashId(url) {
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = (hash * 31 + url.charCodeAt(i)) | 0;
  return `r${Math.abs(hash)}`;
}

async function safe(label, fn) {
  try {
    const result = await fn();
    console.log(`[ok]   ${label}: ${Array.isArray(result) ? result.length + " items" : "done"}`);
    return result;
  } catch (err) {
    console.warn(`[skip] ${label}: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// interest rates (real, free, no key — FRED's public CSV export)
// ---------------------------------------------------------------------------

const FRED_SERIES = [
  { id: "FEDFUNDS", label: "Effective Federal Funds Rate", key: "fedFundsRate" },
  { id: "DGS10", label: "10-Year Treasury Constant Maturity Rate", key: "treasury10Y" },
  { id: "MORTGAGE30US", label: "30-Year Fixed-Rate Mortgage Average", key: "mortgage30Y" },
];

async function fetchFredSeries(seriesId) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`;
  const res = await fetchWithTimeout(url);
  const csv = await res.text();
  const lines = csv.trim().split("\n").filter(Boolean);
  // Walk backwards for the most recent non-missing ('.') observation.
  for (let i = lines.length - 1; i >= 1; i--) {
    const [date, value] = lines[i].split(",");
    if (value && value.trim() !== "." && !Number.isNaN(Number(value))) {
      return { date, value: Number(value) };
    }
  }
  throw new Error(`no valid observations for ${seriesId}`);
}

async function fetchAllRates() {
  const rates = {};
  for (const series of FRED_SERIES) {
    const obs = await safe(series.label, () => fetchFredSeries(series.id));
    if (obs) rates[series.key] = { ...obs, label: series.label, source: `https://fred.stlouisfed.org/series/${series.id}` };
  }
  return rates;
}

// ---------------------------------------------------------------------------
// deal/market news (real, free RSS from CRE trade press)
// ---------------------------------------------------------------------------

const MARKETS = [
  { key: "denver", label: "Denver", keywords: ["denver", "colorado"] },
  { key: "chicago", label: "Chicago", keywords: ["chicago", "illinois"] },
  { key: "miami", label: "Miami", keywords: ["miami", "south florida", "florida"] },
  { key: "sanfrancisco", label: "San Francisco", keywords: ["san francisco", "bay area", "silicon valley"] },
];

// Order matters: the first match wins, so the niche sectors come before
// broader ones (e.g. "senior apartment community" should be senior housing,
// not multifamily).
const ASSET_CLASSES = [
  { key: "seniorHousing", label: "Senior Housing", keywords: ["senior housing", "senior living", "assisted living", "memory care", "independent living", "skilled nursing", "retirement community", "age-restricted", "55+"] },
  { key: "selfStorage", label: "Self-Storage", keywords: ["self-storage", "self storage", "storage facility", "storage facilities"] },
  { key: "multifamily", label: "Multifamily", keywords: ["multifamily", "apartment", "residential community"] },
  { key: "industrial", label: "Industrial", keywords: ["industrial", "warehouse", "logistics", "distribution center"] },
  { key: "office", label: "Office", keywords: ["office building", "office tower", "office space", "office market"] },
  { key: "retail", label: "Retail", keywords: ["retail center", "shopping center", "shopping mall", "retail space"] },
  { key: "hospitality", label: "Hospitality", keywords: ["hotel", "hospitality", "resort"] },
];

function detectMarket(text) {
  const haystack = text.toLowerCase();
  for (const m of MARKETS) {
    if (m.keywords.some((kw) => haystack.includes(kw))) return m.key;
  }
  return null;
}

function detectAssetClass(text) {
  const haystack = text.toLowerCase();
  for (const a of ASSET_CLASSES) {
    if (a.keywords.some((kw) => haystack.includes(kw))) return a.key;
  }
  return "general";
}

async function fetchRss({ url, sourceName }) {
  const res = await fetchWithTimeout(url);
  const xml = await res.text();
  const parsed = xmlParser.parse(xml);

  const rssItems = parsed?.rss?.channel?.item;
  const atomEntries = parsed?.feed?.entry;
  const list = rssItems
    ? Array.isArray(rssItems) ? rssItems : [rssItems]
    : atomEntries
      ? Array.isArray(atomEntries) ? atomEntries : [atomEntries]
      : [];

  return list.map((item) => {
    const title = item.title ?? "";
    const link = item.link?.["@_href"] ?? (Array.isArray(item.link) ? item.link[0]?.["@_href"] : item.link) ?? item.id ?? "";
    const summary = item.description ?? item["content:encoded"] ?? item.summary ?? item.content ?? "";
    const publishedAt = item.pubDate ?? item.updated ?? item.published ?? new Date().toISOString();
    // Market/asset-class detection intentionally looks at the TITLE only, not
    // the full body: trade-press headlines reliably name the deal's actual
    // city (e.g. "...in Palm Beach Gardens, Florida"), but the body text
    // often mentions unrelated places too (a buyer's home city, a source's
    // affiliation) — matching the whole body previously mistagged a New
    // Jersey deal as Miami just because the acquirer was "Florida-based."
    const cleanTitle = stripHtml(title);
    return {
      market: detectMarket(cleanTitle),
      assetClass: detectAssetClass(cleanTitle),
      title: cleanTitle,
      blurb: makeBlurb(summary || title),
      // Read from the full summary (not the shortened blurb) for more detail.
      deal: extractDeal(cleanTitle, stripHtml(summary)),
      url: link,
      sourceName,
      publishedAt: new Date(publishedAt).toISOString(),
    };
  });
}

const NEWS_SOURCES = [
  { url: "https://www.globest.com/feed/", sourceName: "GlobeSt" },
  { url: "https://www.cpexecutive.com/feed/", sourceName: "Commercial Property Executive" },
  { url: "https://rebusinessonline.com/feed/", sourceName: "REBusinessOnline" },
  { url: "https://therealdeal.com/feed/", sourceName: "The Real Deal" },
  { url: "https://www.multihousingnews.com/feed/", sourceName: "Multi-Housing News" },
];

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const rates = await fetchAllRates();
  await writeFile(
    RATES_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), rates }, null, 2) + "\n"
  );
  console.log(`Wrote rates to ${path.relative(process.cwd(), RATES_FILE)}`);

  const jobs = NEWS_SOURCES.map((src) => safe(src.sourceName, () => fetchRss(src)));
  const results = (await Promise.all(jobs)).filter(Boolean).flat();
  const marketNews = results.filter((item) => item.market && item.url && item.title);

  let previous = [];
  try {
    const raw = await readFile(NEWS_FILE, "utf-8");
    previous = JSON.parse(raw).news ?? [];
  } catch {
    // first run
  }

  // Re-run detection on every previously-stored item's title, not just new
  // fetches: otherwise a mistag never heals itself (it only ever gets
  // *overwritten* if the exact same URL happens to come back through a
  // fresh fetch — which won't happen once it ages out of a feed's listing
  // or, as here, once a detection-rule fix makes it stop matching at all).
  // Older items also get cleaned titles/blurbs, and a deal snapshot if they
  // were stored before the current extractor version.
  const healedPrevious = previous
    .map((item) => {
      const title = stripHtml(item.title);
      const blurb = stripHtml(item.blurb);
      const deal = item.deal?.version === DEAL_EXTRACTOR_VERSION ? item.deal : extractDeal(title, blurb);
      return { ...item, title, blurb, deal, market: detectMarket(title), assetClass: detectAssetClass(title) };
    })
    .filter((item) => item.market);

  const byUrl = new Map();
  for (const item of [...healedPrevious, ...marketNews]) byUrl.set(item.url, item);

  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const merged = [...byUrl.values()]
    .filter((s) => {
      const t = new Date(s.publishedAt).getTime();
      return Number.isFinite(t) && t >= cutoff;
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, MAX_ITEMS);

  await writeFile(
    NEWS_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), news: merged }, null, 2) + "\n"
  );
  console.log(`Wrote ${merged.length} market news items to ${path.relative(process.cwd(), NEWS_FILE)}`);
}

main().catch((err) => {
  console.error("Fatal error in fetch-real-estate-news:", err);
  process.exitCode = 1;
});
