#!/usr/bin/env node
/**
 * Pulls fresh AI-research items from a spread of free, public sources and
 * writes the merged, scored result to data/ai-stories.json. Run daily by
 * .github/workflows/fetch-ai-news.yml (a GitHub Actions cron), or manually
 * with `npm run fetch:news`.
 *
 * Every source is wrapped in try/catch with a timeout: one dead feed (a
 * blog changing its RSS path, a rate limit) must never take the whole run
 * down. Live Twitter/X scanning is intentionally excluded — the official
 * API's cheapest paid tier starts around $100/month, so instead we lean on
 * Hacker News + Reddit, which both surface the same AI announcements as
 * community discussion, for free.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import { scoreStory, SCORING_VERSION } from "./lib/scoreStory.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "ai-stories.json");

const MAX_AGE_DAYS = 30;
const MAX_STORIES = 350;
const FETCH_TIMEOUT_MS = 12000;

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "ai-research-feed-bot/1.0 (+https://github.com/Dbenson2323/DRBENSON.LLC-)",
        ...options.headers,
      },
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
    .replace(/&#x?[0-9a-fA-F]+;/g, (entity) => {
      const isHex = entity[2] === "x" || entity[2] === "X";
      const code = parseInt(entity.slice(isHex ? 3 : 2, -1), isHex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    })
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function makeBlurb(text, max = 360) {
  const clean = stripHtml(text);
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function hashId(url) {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) | 0;
  }
  return `s${Math.abs(hash)}`;
}

const CATEGORY_RULES = [
  { category: "LLMs & Chatbots", keywords: ["llm", "gpt", "chatgpt", "gemini", "claude", "language model", "chatbot", "grok", "llama", "copilot"] },
  { category: "Computer Vision", keywords: ["image generation", "diffusion", "vision model", "video generation", "sora", "midjourney", "stable diffusion", "text-to-image", "text-to-video"] },
  { category: "Robotics", keywords: ["robot", "robotics", "humanoid", "autonomous vehicle", "self-driving"] },
  { category: "AI Safety & Policy", keywords: ["safety", "alignment", "regulation", "policy", "governance", "ethics", "executive order", "eu ai act"] },
  { category: "Open Source & Tools", keywords: ["open source", "open-source", "github", "framework", "library", "sdk", "api release", "open weights"] },
  { category: "Industry & Business", keywords: ["funding", "valuation", "acquisition", "ipo", "revenue", "partnership", "raises", "series a", "series b", "series c"] },
  { category: "Research Papers", keywords: ["arxiv", "paper", "study", "benchmark", "dataset", "preprint"] },
];

function detectCategory(title, summary) {
  const haystack = `${title} ${summary}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) return rule.category;
  }
  return "AI News";
}

// Deterministic hyper-tech placeholder art per category (no external image
// calls, so it never breaks, costs nothing, and never hotlinks a source's
// own image without permission).
const CATEGORY_GRADIENTS = {
  "LLMs & Chatbots": ["#7C3AED", "#22D3EE"],
  "Computer Vision": ["#EC4899", "#6366F1"],
  Robotics: ["#F97316", "#EAB308"],
  "AI Safety & Policy": ["#EF4444", "#7C3AED"],
  "Open Source & Tools": ["#22C55E", "#0EA5E9"],
  "Industry & Business": ["#0EA5E9", "#A855F7"],
  "Research Papers": ["#6366F1", "#14B8A6"],
  "AI News": ["#14B8A6", "#22D3EE"],
};

// Every card gets one small original vector icon instead of a stock/stolen
// photo — zero copyright risk, zero network calls, and it's picked to match
// what the article is actually about (checked against the title first,
// falling back to the article's category).
const ICON_RULES = [
  { icon: "brain", keywords: ["brain", "neural", "reasoning", "cognit", "think"] },
  { icon: "robot", keywords: ["robot", "robotic", "humanoid", "drone", "autonomous vehicle", "self-driving"] },
  { icon: "eye", keywords: ["vision", "image generation", "video generation", "camera", "diffusion", "photo", "sora", "midjourney"] },
  { icon: "chip", keywords: ["chip", "gpu", "hardware", "silicon", "processor", "tpu", "semiconductor"] },
  { icon: "shield", keywords: ["safety", "align", "regulat", "polic", "ethic", "risk", "governance"] },
  { icon: "rocket", keywords: ["fund", "raise", "valuation", "acquisition", "ipo", "revenue", "million", "billion", "partnership"] },
  { icon: "document", keywords: ["paper", "arxiv", "study", "research", "benchmark", "dataset", "preprint"] },
  { icon: "code", keywords: ["open source", "open-source", "github", "framework", "library", "sdk", "api release"] },
];

const CATEGORY_ICON_FALLBACK = {
  "LLMs & Chatbots": "brain",
  "Computer Vision": "eye",
  Robotics: "robot",
  "AI Safety & Policy": "shield",
  "Open Source & Tools": "code",
  "Industry & Business": "rocket",
  "Research Papers": "document",
  "AI News": "globe",
};

function detectIcon(title, summary, category) {
  const haystack = `${title} ${summary}`.toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) return rule.icon;
  }
  return CATEGORY_ICON_FALLBACK[category] ?? "globe";
}

function buildStory({ title, url, summary, sourceName, sourceType, publishedAt, image }) {
  const category = detectCategory(title, summary);
  const scores = scoreStory({ title: stripHtml(title), summary: stripHtml(summary), sourceType });
  return {
    id: hashId(url),
    title: stripHtml(title),
    blurb: makeBlurb(summary || title),
    url,
    sourceName,
    sourceType,
    category,
    publishedAt: new Date(publishedAt).toISOString(),
    ...scores,
    gradient: CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS["AI News"],
    icon: detectIcon(title, summary, category),
    // The article's own thumbnail, when the source provides one directly
    // (RSS enclosure/media tags, a Reddit preview, a repo's avatar) — never
    // fetched by scraping the article page itself. Falls back to the icon
    // tile above when a source has no image field at all (Hacker News, arXiv).
    image: image || null,
  };
}

// Pull an image straight from fields the source already provides — no
// per-article page fetch, so this stays fast and never fetches HTML we'd
// then have to parse for an og:image tag.
function extractRssImage(item) {
  const enclosure = item.enclosure;
  if (enclosure?.["@_url"] && /^image\//.test(enclosure["@_type"] ?? "")) {
    return enclosure["@_url"];
  }
  const media = item["media:content"];
  const mediaList = Array.isArray(media) ? media : media ? [media] : [];
  for (const m of mediaList) {
    const type = m["@_type"] ?? "";
    const medium = m["@_medium"] ?? "";
    if (m["@_url"] && (type.startsWith("image/") || medium === "image")) return m["@_url"];
  }
  const thumb = item["media:thumbnail"];
  if (thumb?.["@_url"]) return thumb["@_url"];
  // Last resort: the first <img src="..."> inside the HTML body/description.
  const html = item["content:encoded"] ?? item.description ?? "";
  const match = typeof html === "string" ? html.match(/<img[^>]+src="([^"]+)"/i) : null;
  return match?.[1] ?? null;
}

// ---------------------------------------------------------------------------
// sources
// ---------------------------------------------------------------------------

async function fetchArxiv() {
  const url =
    "http://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.CL+OR+cat:cs.LG+OR+cat:cs.RO+OR+cat:cs.CV&sortBy=submittedDate&sortOrder=descending&max_results=35";
  const res = await fetchWithTimeout(url);
  const xml = await res.text();
  const parsed = xmlParser.parse(xml);
  const entries = parsed?.feed?.entry;
  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
  return list.map((entry) =>
    buildStory({
      title: entry.title,
      url: Array.isArray(entry.link) ? entry.link.find((l) => l["@_rel"] === "alternate")?.["@_href"] ?? entry.id : entry.id,
      summary: entry.summary,
      sourceName: "arXiv",
      sourceType: "paper",
      publishedAt: entry.published,
    })
  );
}

async function fetchHackerNews() {
  const url =
    "https://hn.algolia.com/api/v1/search_by_date?tags=story&query=AI%20OR%20LLM%20OR%20OpenAI%20OR%20Anthropic%20OR%20%22artificial%20intelligence%22&hitsPerPage=40";
  const res = await fetchWithTimeout(url);
  const json = await res.json();
  return (json.hits ?? [])
    .filter((hit) => hit.url && hit.title)
    .map((hit) =>
      buildStory({
        title: hit.title,
        url: hit.url,
        summary: `Trending on Hacker News with ${hit.points ?? 0} points and ${hit.num_comments ?? 0} comments.`,
        sourceName: "Hacker News",
        sourceType: "aggregator",
        publishedAt: hit.created_at,
      })
    );
}

async function fetchReddit(subreddit) {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=20`;
  const res = await fetchWithTimeout(url);
  const json = await res.json();
  return (json.data?.children ?? [])
    .map((c) => c.data)
    .filter((post) => post && !post.stickied && post.title)
    .map((post) => {
      // Reddit's own preview image, when it has one — `thumbnail` is often
      // "self"/"default"/"nsfw" instead of a real URL, so only use it (or
      // the higher-res preview) when it's actually an http(s) link.
      const previewUrl = post.preview?.images?.[0]?.source?.url;
      const image = previewUrl
        ? previewUrl.replace(/&amp;/g, "&")
        : post.thumbnail?.startsWith("http")
        ? post.thumbnail
        : null;
      return buildStory({
        title: post.title,
        url: post.url?.startsWith("http") ? post.url : `https://www.reddit.com${post.permalink}`,
        summary: post.selftext || `Discussed on r/${subreddit} with ${post.score ?? 0} upvotes.`,
        sourceName: `Reddit r/${subreddit}`,
        sourceType: "community",
        publishedAt: new Date((post.created_utc ?? Date.now() / 1000) * 1000).toISOString(),
        image,
      });
    });
}

async function fetchRss({ url, sourceName, sourceType }) {
  const res = await fetchWithTimeout(url);
  const xml = await res.text();
  const parsed = xmlParser.parse(xml);

  // RSS 2.0
  const rssItems = parsed?.rss?.channel?.item;
  if (rssItems) {
    const list = Array.isArray(rssItems) ? rssItems : [rssItems];
    return list.map((item) =>
      buildStory({
        title: item.title,
        url: item.link,
        summary: item.description ?? item["content:encoded"] ?? "",
        sourceName,
        sourceType,
        publishedAt: item.pubDate ?? new Date().toISOString(),
        image: extractRssImage(item),
      })
    );
  }

  // Atom
  const atomEntries = parsed?.feed?.entry;
  if (atomEntries) {
    const list = Array.isArray(atomEntries) ? atomEntries : [atomEntries];
    return list.map((entry) =>
      buildStory({
        title: entry.title,
        url: Array.isArray(entry.link) ? entry.link[0]?.["@_href"] : entry.link?.["@_href"] ?? entry.id,
        summary: entry.summary ?? entry.content ?? "",
        sourceName,
        sourceType,
        publishedAt: entry.updated ?? entry.published ?? new Date().toISOString(),
        image: extractRssImage(entry),
      })
    );
  }

  return [];
}

async function fetchGithubTrendingAI() {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const url = `https://api.github.com/search/repositories?q=artificial+intelligence+created:>${since}&sort=stars&order=desc&per_page=20`;
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/vnd.github+json" } });
  const json = await res.json();
  return (json.items ?? []).map((repo) =>
    buildStory({
      title: `${repo.full_name}: ${repo.description ?? "new AI project"}`,
      url: repo.html_url,
      summary: repo.description ?? "",
      sourceName: "GitHub Trending",
      sourceType: "opensource",
      publishedAt: repo.created_at,
      image: repo.owner?.avatar_url ?? null,
    })
  );
}

const RSS_SOURCES = [
  { url: "https://openai.com/news/rss.xml", sourceName: "OpenAI", sourceType: "official" },
  { url: "https://www.anthropic.com/rss.xml", sourceName: "Anthropic", sourceType: "official" },
  { url: "https://deepmind.google/blog/rss.xml", sourceName: "Google DeepMind", sourceType: "official" },
  { url: "https://ai.meta.com/blog/rss/", sourceName: "Meta AI", sourceType: "official" },
  { url: "https://mistral.ai/news/rss.xml", sourceName: "Mistral AI", sourceType: "official" },
  { url: "https://huggingface.co/blog/feed.xml", sourceName: "Hugging Face", sourceType: "opensource" },
  { url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", sourceName: "MIT Technology Review", sourceType: "journalism" },
  { url: "https://venturebeat.com/category/ai/feed/", sourceName: "VentureBeat AI", sourceType: "journalism" },
  // Added for wider coverage — each is wrapped in try/catch by safe(), so a
  // wrong/changed RSS path here just gets skipped rather than breaking the run.
  { url: "https://www.microsoft.com/en-us/microsoft-cloud/blog/feed/", sourceName: "Microsoft AI Blog", sourceType: "official" },
  { url: "https://blogs.nvidia.com/feed/", sourceName: "NVIDIA Blog", sourceType: "official" },
  { url: "https://stability.ai/news?format=rss", sourceName: "Stability AI", sourceType: "official" },
  { url: "https://txt.cohere.com/rss/", sourceName: "Cohere", sourceType: "official" },
  { url: "https://www.marktechpost.com/feed/", sourceName: "MarkTechPost", sourceType: "journalism" },
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", sourceName: "TechCrunch AI", sourceType: "journalism" },
];

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

// Some sources (TechCrunch and others) don't expose an image in their RSS
// item at all — the only way to get their real thumbnail is the article
// page's own og:image tag. Only worth doing for freshly-fetched stories
// that don't already have one, and only from sources likely to set it
// (skips community/aggregator links, which are often not articles at all).
const OG_IMAGE_ELIGIBLE_TYPES = new Set(["journalism", "official", "opensource"]);
const OG_IMAGE_TIMEOUT_MS = 6000;
const OG_IMAGE_BATCH_SIZE = 10;

async function fetchOgImage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OG_IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ai-research-feed-bot/1.0 (+https://github.com/Dbenson2323/DRBENSON.LLC-)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function enrichWithOgImages(stories) {
  const candidates = stories.filter((s) => !s.image && OG_IMAGE_ELIGIBLE_TYPES.has(s.sourceType));
  let enriched = 0;
  for (let i = 0; i < candidates.length; i += OG_IMAGE_BATCH_SIZE) {
    const batch = candidates.slice(i, i + OG_IMAGE_BATCH_SIZE);
    const images = await Promise.all(batch.map((s) => fetchOgImage(s.url)));
    batch.forEach((story, j) => {
      if (images[j]) {
        story.image = images[j];
        enriched++;
      }
    });
  }
  console.log(`[og:image] enriched ${enriched}/${candidates.length} candidate stories`);
  return stories;
}

async function safe(label, fn) {
  try {
    const result = await fn();
    console.log(`[ok]   ${label}: ${result.length} items`);
    return result;
  } catch (err) {
    console.warn(`[skip] ${label}: ${err.message}`);
    return [];
  }
}

async function main() {
  const jobs = [
    safe("arXiv", fetchArxiv),
    safe("Hacker News", fetchHackerNews),
    safe("Reddit r/MachineLearning", () => fetchReddit("MachineLearning")),
    safe("Reddit r/artificial", () => fetchReddit("artificial")),
    safe("Reddit r/singularity", () => fetchReddit("singularity")),
    safe("GitHub Trending", fetchGithubTrendingAI),
    ...RSS_SOURCES.map((src) => safe(src.sourceName, () => fetchRss(src))),
  ];

  const results = (await Promise.all(jobs)).flat();
  await enrichWithOgImages(results);

  let previous = [];
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    previous = JSON.parse(raw).stories ?? [];
  } catch {
    // no existing file yet — first run
  }

  // Re-clean previously-stored titles/blurbs too, so a stripHtml fix (e.g. new
  // entity handling) heals old entries immediately instead of waiting for
  // their source to be refetched.
  //
  // Stories scored by an older version of the scoring rules are re-scored
  // from their stored headline and blurb, so a rules change applies to the
  // whole feed at once.
  const healedPrevious = previous.map((story) => {
    const healed = { ...story, title: stripHtml(story.title), blurb: stripHtml(story.blurb) };
    if (healed.scoring?.version === SCORING_VERSION) return healed;
    return { ...healed, ...scoreStory({ title: healed.title, summary: healed.blurb, sourceType: healed.sourceType }) };
  });

  const byUrl = new Map();
  for (const story of [...healedPrevious, ...results]) {
    byUrl.set(story.url, story);
  }

  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const merged = [...byUrl.values()]
    .filter((s) => {
      const t = new Date(s.publishedAt).getTime();
      return Number.isFinite(t) && t >= cutoff;
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, MAX_STORIES);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    DATA_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), stories: merged }, null, 2) + "\n"
  );

  console.log(`\nWrote ${merged.length} stories to ${path.relative(process.cwd(), DATA_FILE)}`);
  if (results.length === 0 && previous.length === 0) {
    console.warn("Warning: no sources returned data and there was no existing file. Check network access.");
  }
}

main().catch((err) => {
  console.error("Fatal error in fetch-ai-news:", err);
  process.exitCode = 1;
});
