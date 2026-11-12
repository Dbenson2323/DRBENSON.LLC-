// Live search across outside sources that allow a web page to query them
// directly from the visitor's browser (no server, no API keys). Each result
// is scored with the same rules as the daily feed, plus a relevance score
// for how well it matches the search.
import { scoreStory } from "../../scripts/lib/scoreStory.mjs";

const TIMEOUT_MS = 12000;

export const LIVE_SOURCES = [
  { key: "news", label: "World news", provider: "GDELT" },
  { key: "hn", label: "Hacker News", provider: "Hacker News" },
  { key: "papers", label: "Research papers", provider: "OpenAlex" },
  { key: "github", label: "GitHub", provider: "GitHub" },
];

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "in", "is", "it", "of",
  "on", "or", "the", "to", "what", "with", "why", "does", "do", "new", "about", "vs",
]);

function stripHtml(html) {
  if (!html) return "";
  const text = html.replace(/<[^>]*>/g, " ");
  if (typeof DOMParser === "undefined") return text.replace(/\s+/g, " ").trim();
  const doc = new DOMParser().parseFromString(text, "text/html");
  return (doc.documentElement.textContent || "").replace(/\s+/g, " ").trim();
}

function blurb(text, max = 360) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

async function getJson(url, signal, timeoutMs = TIMEOUT_MS) {
  const timeout = AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
  const combined = timeout && AbortSignal.any ? AbortSignal.any([signal, timeout]) : signal;
  let res;
  try {
    res = await fetch(url, { signal: combined });
  } catch (err) {
    if (err.name === "TimeoutError") throw new Error("Took too long to respond");
    throw err;
  }
  if (res.status === 429) throw new Error("Hit its free usage limit, try again later");
  if (res.status === 403) throw new Error("Usage limit reached, try again later");
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // GDELT replies in plain text when it rejects a query (e.g. too short).
    throw new Error(text.slice(0, 120) || "Unexpected response");
  }
}

function compact(n) {
  if (!Number.isFinite(n)) return null;
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

// --- providers ------------------------------------------------------------

async function searchNews(q, signal) {
  // GDELT needs every word to be 3+ characters or quoted; wrap short words.
  const query = q
    .split(/\s+/)
    .map((w) => (w.length < 3 ? `"${w}"` : w))
    .join(" ");
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`${query} sourcelang:english`)}&mode=artlist&format=json&maxrecords=15&sort=hybridrel&timespan=3months`;
  let data;
  try {
    data = await getJson(url, signal, 25000);
  } catch (err) {
    // When GDELT is busy it answers without browser-access headers, which
    // the browser reports only as a generic network failure.
    if (err.name === "TypeError") throw new Error("Busy right now (limit: one search every 5 seconds). Try again shortly.");
    throw err;
  }
  return (data.articles ?? []).map((a) => {
    const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(a.seendate ?? "");
    return {
      title: a.title,
      summary: "",
      url: a.url,
      sourceName: a.domain,
      sourceType: classifyHost(hostOf(a.url), "web"),
      publishedAt: m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : null,
      image: a.socialimage || null,
      icon: "globe",
      traction: a.sourcecountry || null,
    };
  });
}

async function searchHackerNews(q, signal) {
  // Last two years only, so old threads don't crowd out current coverage.
  const since = Math.floor(Date.now() / 1000) - 2 * 365 * 24 * 3600;
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=15&numericFilters=created_at_i>${since}`;
  const data = await getJson(url, signal);
  return (data.hits ?? [])
    .filter((h) => h.title)
    .map((h) => {
      const host = hostOf(h.url || "");
      return {
        title: h.title,
        summary: stripHtml(h.story_text),
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        // Ask HN / Show HN posts with no link are forum posts.
        sourceName: host || "Hacker News",
        sourceType: host ? classifyHost(host, "web") : "community",
        publishedAt: h.created_at,
        image: null,
        icon: "rocket",
        traction: `via Hacker News · ${compact(h.points ?? 0)} points · ${compact(h.num_comments ?? 0)} comments`,
      };
    });
}

function abstractFromIndex(index) {
  if (!index) return "";
  const words = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) words[pos] = word;
  }
  return words.filter(Boolean).join(" ");
}

async function searchPapers(q, signal) {
  const since = new Date(Date.now() - 2 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=12&filter=from_publication_date:${since}&select=id,doi,title,publication_date,abstract_inverted_index,primary_location,cited_by_count`;
  const data = await getJson(url, signal);
  return (data.results ?? [])
    .filter((w) => w.title)
    .map((w) => {
      const source = w.primary_location?.source;
      const isJournal = source?.type === "journal" || source?.type === "conference";
      return {
        title: stripHtml(w.title),
        summary: abstractFromIndex(w.abstract_inverted_index),
        url: w.primary_location?.landing_page_url || w.doi || w.id,
        sourceName: source?.display_name || "OpenAlex",
        sourceType: isJournal ? "journal" : "paper",
        publishedAt: w.publication_date,
        image: null,
        icon: "document",
        traction: `${compact(w.cited_by_count ?? 0)} citations`,
      };
    });
}

async function searchGithub(q, signal) {
  // Skip throwaway repos: require some community interest.
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(`${q} stars:>=10`)}&per_page=8`;
  const data = await getJson(url, signal);
  return (data.items ?? []).map((r) => ({
    title: r.full_name,
    summary: r.description || "",
    url: r.html_url,
    sourceName: "GitHub",
    sourceType: "opensource",
    publishedAt: r.pushed_at,
    image: r.owner?.avatar_url || null,
    icon: "code",
    traction: `★ ${compact(r.stargazers_count ?? 0)}`,
  }));
}

// --- who actually published a link --------------------------------------
// Hacker News and GDELT point to other sites, so each result is scored by
// the site it links to, not by the service that listed it.

const DOMAIN_TYPES = [
  { type: "paper", domains: ["arxiv.org", "biorxiv.org", "medrxiv.org", "openreview.net", "ssrn.com"] },
  { type: "journal", domains: ["nature.com", "science.org", "cell.com", "pnas.org", "acm.org", "ieee.org", "springer.com", "sciencedirect.com", "nejm.org", "thelancet.com"] },
  { type: "opensource", domains: ["github.com", "gitlab.com", "huggingface.co", "pypi.org", "npmjs.com"] },
  {
    type: "official",
    domains: ["openai.com", "anthropic.com", "deepmind.google", "blog.google", "ai.google", "ai.meta.com", "about.fb.com", "nvidia.com", "microsoft.com", "apple.com", "amazon.science", "aboutamazon.com", "mistral.ai", "x.ai", "ibm.com", "intel.com", "amd.com", "sec.gov", "whitehouse.gov", "europa.eu", "ftc.gov", "nist.gov"],
  },
  {
    type: "journalism",
    domains: ["reuters.com", "bloomberg.com", "apnews.com", "wsj.com", "ft.com", "nytimes.com", "cnbc.com", "theverge.com", "techcrunch.com", "arstechnica.com", "wired.com", "technologyreview.com", "theinformation.com", "axios.com", "bbc.com", "bbc.co.uk", "theguardian.com", "washingtonpost.com", "economist.com", "semafor.com", "businessinsider.com", "forbes.com", "venturebeat.com", "zdnet.com", "engadget.com", "fortune.com", "marketwatch.com", "barrons.com", "cnn.com", "npr.org", "politico.com", "spectrum.ieee.org", "theregister.com", "404media.co", "tomshardware.com", "yahoo.com", "finance.yahoo.com", "investopedia.com", "fool.com", "seekingalpha.com", "nasdaq.com"],
  },
  { type: "community", domains: ["reddit.com", "x.com", "twitter.com", "youtube.com", "medium.com", "substack.com", "linkedin.com", "facebook.com", "tiktok.com", "quora.com"] },
];

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function classifyHost(host, fallback) {
  for (const group of DOMAIN_TYPES) {
    if (group.domains.some((d) => host === d || host.endsWith(`.${d}`))) return group.type;
  }
  return fallback;
}

const PROVIDERS = { news: searchNews, hn: searchHackerNews, papers: searchPapers, github: searchGithub };

// --- relevance -------------------------------------------------------------

function queryTerms(q) {
  return [...new Set(q.toLowerCase().split(/[^a-z0-9+#.-]+/).filter((t) => t && !STOPWORDS.has(t)))];
}

// How well a result matches the search: share of search terms found (in the
// headline counts more than in the body), plus a bonus for the exact phrase.
export function relevance(q, title, body) {
  const terms = queryTerms(q);
  if (terms.length === 0) return { score: 0, matched: 0, total: 0 };
  const t = ` ${title.toLowerCase()} `;
  const b = ` ${body.toLowerCase()} `;
  let points = 0;
  let matched = 0;
  for (const term of terms) {
    if (t.includes(term)) {
      points += 1;
      matched++;
    } else if (b.includes(term)) {
      points += 0.6;
      matched++;
    }
  }
  let score = (points / terms.length) * 85;
  const phrase = q.trim().toLowerCase();
  if (terms.length > 1 && t.includes(phrase)) score += 15;
  else if (terms.length > 1 && b.includes(phrase)) score += 8;
  else if (terms.length === 1 && t.includes(phrase)) score += 15;
  return { score: Math.max(0, Math.min(100, Math.round(score))), matched, total: terms.length };
}

// --- run one provider -------------------------------------------------------

export async function runSource(key, q, signal) {
  const raw = await PROVIDERS[key](q, signal);
  return raw
    .filter((r) => r.url && r.title)
    .map((r) => {
      const title = stripHtml(r.title);
      const rel = relevance(q, title, r.summary);
      return {
        id: `${key}:${r.url}`,
        title,
        blurb: blurb(r.summary),
        url: r.url,
        sourceName: r.sourceName,
        sourceType: r.sourceType,
        category: LIVE_SOURCES.find((s) => s.key === key).label,
        publishedAt: r.publishedAt,
        image: r.image,
        icon: r.icon,
        traction: r.traction,
        liveSource: key,
        relevanceScore: rel.score,
        relevanceDetail: `${rel.matched} of ${rel.total} search terms matched`,
        ...scoreStory({ title, summary: r.summary, sourceType: r.sourceType }),
      };
    });
}
