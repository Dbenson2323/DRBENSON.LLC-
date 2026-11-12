// Multi-factor scoring for the AI Research feed.
//
// Every story gets a Factual % and a Quality % built from a starting point
// (how reliable / well-edited that kind of source tends to be) plus a list of
// signed adjustments read from the headline and summary text. Every
// adjustment is stored with the story, so the site can show exactly why a
// story scored what it did.
//
// This file has no Node-only imports: the fetch script uses it to score
// stories, and the website imports SCORING_GUIDE from it so the on-page
// explanation can never drift from the real rules.
//
// These are text heuristics, not a fact-check. They measure how a story is
// written and sourced (figures, attribution, hedging, hype), not whether its
// claims are true.

export const SCORING_VERSION = 3;

const SOURCE_PROFILES = {
  paper: { label: "Research preprint", factual: 80, quality: 70 },
  official: { label: "Lab / company announcement", factual: 74, quality: 68 },
  opensource: { label: "Open-source project", factual: 72, quality: 60 },
  journalism: { label: "Tech journalism", factual: 70, quality: 66 },
  aggregator: { label: "Community aggregator", factual: 55, quality: 50 },
  community: { label: "Forum discussion", factual: 45, quality: 42 },
};

const PRIMARY_SOURCE_TYPES = new Set(["paper", "official", "opensource"]);

// --- word lists -----------------------------------------------------------

const HEDGING = [
  "could", "might", "reportedly", "rumor", "rumour", "rumored", "rumoured", "sources say",
  "people familiar", "expected to", "likely", "plans to", "is said to", "unconfirmed",
  "speculat", "allegedly", "leaked", "appears to", "may be", "may have", "possibly",
];
const OPINION = [
  "i think", "i believe", "in my opinion", "opinion:", "hot take", "my take", "we believe",
  "should", "must", "arguably", "overrated", "underrated", "the truth about", "unvarnished",
];
const HYPE = [
  "revolutionary", "game-changer", "game changer", "groundbreaking", "mind-blowing", "insane",
  "shocking", "unbelievable", "stunning", "destroys", "crushes", "killer", "incredible",
  "magic", "everything you need", "changes everything", "jaw-dropping", "blows away",
];
const CLICKBAIT = ["here's why", "here’s why", "this is why", "you won't believe", "you won’t believe", "what you need to know", "the reason why", "is it time"];
const ATTRIBUTION = [
  "according to", " said", " says", " told", "confirmed", "in a statement", "filing",
  "spokesperson", "spokesman", "spokeswoman", "announced", "data from", "survey",
];
const BENCHMARKS = [
  "benchmark", "dataset", "mmlu", "swe-bench", "gsm8k", "humaneval", "imagenet", "gpqa",
  "mmmu", "livecodebench", "aime", "arc-agi", "ablation", "baseline", "evaluation", "outperform",
  "state-of-the-art", "sota", "accuracy", "f1", "leaderboard",
];
const VERIFIABLE = [
  "open-source", "open source", "open weights", "open-weight", "github", "code is available",
  "code and", "apache 2.0", "mit license", "hugging face", "arxiv", "dataset release",
  "we release", "publicly available", "paper", "technical report", "model card",
];
const CONCRETE_EVENTS = [
  "announced", "announces", "released", "releases", "launched", "launches", "acquires",
  "acquired", "raises", "raised", "published", "introduces", "introduced", "ships", "shipped",
  "filed", "signed", "approved",
];
const PROMO = [
  "a conversation with", "customer story", "how ", " helps ", "partner", "introducing",
  "our new", "we're excited", "we’re excited", "meet ", "powered by",
];
const EXPLAINS = [
  "because", "which means", "so that", "allowing", "enabling", "in order to", "as a result",
  "due to", "resulting in", "by using", "compared with", "compared to", "unlike",
];

// --- text helpers ----------------------------------------------------------

function countHits(haystack, list) {
  let n = 0;
  for (const term of list) if (haystack.includes(term)) n++;
  return n;
}

function wordsOf(text) {
  return text.match(/[A-Za-z0-9][A-Za-z0-9'’.\-+%$]*/g) ?? [];
}

function sentencesOf(text) {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
}

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

// Flesch Reading Ease: ~60+ plain English, ~30 college level, <15 very dense.
function readingEase(words, sentenceCount) {
  if (words.length === 0 || sentenceCount === 0) return null;
  const syl = words.reduce((sum, w) => sum + syllables(w), 0);
  return 206.835 - 1.015 * (words.length / sentenceCount) - 84.6 * (syl / words.length);
}

// Numbers that carry information: 29B, 12,000, 3.5%, $40M, 2x, v2, 20 seconds.
function countFigures(text) {
  const matches = text.match(/(\$\s?\d[\d,.]*\s?(?:[kmbt]|million|billion|trillion)?|\d[\d,.]*\s?(?:%|x\b|[kmbt]\b|million|billion|trillion|params|parameters|tokens|gpus?)|\b\d[\d,.]*\b)/gi) ?? [];
  // Ignore bare years — they rarely add evidence.
  return matches.filter((m) => !/^(19|20)\d\d$/.test(m.trim())).length;
}

// Capitalized words that are not sentence starts: a rough proxy for named
// people, companies, products and places.
function countNamedEntities(text) {
  const tokens = text.split(/\s+/);
  let n = 0;
  for (let i = 1; i < tokens.length; i++) {
    const prevEndsSentence = /[.!?]$/.test(tokens[i - 1]);
    if (!prevEndsSentence && /^[A-Z][A-Za-z0-9\-]+/.test(tokens[i])) n++;
  }
  return n;
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function add(list, points, label, detail) {
  if (points !== 0) list.push({ points, label, ...(detail ? { detail } : {}) });
}

// --- main scorer -----------------------------------------------------------

export function scoreStory({ title = "", summary = "", sourceType }) {
  const profile = SOURCE_PROFILES[sourceType] ?? SOURCE_PROFILES.community;
  const body = summary.trim() === title.trim() ? "" : summary;
  const full = `${title}. ${body}`;
  const lower = ` ${full.toLowerCase()} `;
  const titleLower = title.toLowerCase();
  const bodyWords = wordsOf(body);
  const allWords = wordsOf(full);

  // Shared signals
  const hedges = countHits(lower, HEDGING);
  const opinions = countHits(lower, OPINION);
  const hype = countHits(lower, HYPE);
  const clickbait = countHits(titleLower, CLICKBAIT);
  const figures = countFigures(full);
  const benchmarks = countHits(lower, BENCHMARKS);
  const attribution = countHits(lower, ATTRIBUTION) + ((full.match(/[“"]/g) ?? []).length >= 2 ? 1 : 0);
  const verifiable = countHits(lower, VERIFIABLE);
  const events = countHits(lower, CONCRETE_EVENTS);
  const promo = countHits(lower, PROMO);

  // ---------------- Factual ----------------
  const factual = [];
  const selfPromo = sourceType === "official" && promo > 0;
  // A company marketing itself is first-hand but not neutral, so it gets the
  // self-promotion penalty below instead of the primary-source bonus.
  if (PRIMARY_SOURCE_TYPES.has(sourceType) && !selfPromo) {
    add(factual, 6, "Primary source", "Comes straight from the people who did the work");
  }
  if (sourceType === "paper") {
    add(factual, -4, "Not yet peer-reviewed", "arXiv preprints are posted before formal review");
  }
  if (figures >= 3) add(factual, 6, "Hard numbers", `${figures} figures or measurements cited`);
  else if (figures >= 1) add(factual, 3, "Some numbers", `${figures} figure${figures > 1 ? "s" : ""} cited`);
  else add(factual, -3, "No figures", "No numbers or measurements to check");

  if (benchmarks > 0) add(factual, Math.min(6, benchmarks * 2), "Measured results", "Refers to benchmarks, datasets or evaluations");
  if (attribution > 0) add(factual, Math.min(6, attribution * 2), "Attributed claims", "Says who the information comes from");
  if (verifiable > 0) add(factual, Math.min(5, verifiable * 2), "Checkable artifact", "Points to code, weights, a paper or data you can inspect");
  if (events > 0) add(factual, 2, "Concrete event", "Reports something that happened (a release, deal, filing)");

  if (hedges > 0) add(factual, -Math.min(12, hedges * 3), "Speculative language", `${hedges} hedge${hedges > 1 ? "s" : ""} like “could,” “reportedly,” “expected to”`);
  if (opinions > 0) add(factual, -Math.min(16, opinions * 5), "Opinion language", "Subjective framing (“should,” “I think,” “the truth about”)");
  if (hype > 0) add(factual, -Math.min(12, hype * 4), "Hype words", "Sensational wording that overstates");
  if (title.trim().endsWith("?")) add(factual, -5, "Question headline", "Headlines posed as questions usually signal speculation");
  if (clickbait > 0) add(factual, -4, "Clickbait framing", "Teases rather than states the news");
  if (selfPromo) {
    add(factual, -5, "Self-promotion", "A company describing its own product; claims aren't independently checked");
  }
  if (allWords.length < 25) add(factual, -4, "Too little text", "Not enough detail to support the claims");

  // ---------------- Quality ----------------
  const quality = [];
  const n = bodyWords.length;
  if (n >= 80) add(quality, 6, "In-depth summary", `${n} words`);
  else if (n >= 40) add(quality, 3, "Solid summary", `${n} words`);
  else if (n >= 20) add(quality, -3, "Brief summary", `Only ${n} words`);
  else add(quality, -8, "Very thin summary", n === 0 ? "Headline only" : `Only ${n} words`);

  const tWords = wordsOf(title).length;
  if (tWords < 4) add(quality, -4, "Vague headline", "Too short to say what happened");
  else if (tWords > 18) add(quality, -3, "Overlong headline", `${tWords} words`);
  else if (tWords >= 6) add(quality, 3, "Clear headline", "Well-sized and descriptive");

  const sentences = sentencesOf(body);
  const ease = n >= 20 ? readingEase(bodyWords, sentences.length) : null;
  if (ease !== null) {
    const e = Math.round(ease);
    if (ease >= 50) add(quality, 4, "Easy to read", `Reading ease ${e}`);
    else if (ease >= 30) add(quality, 1, "Readable", `Reading ease ${e}`);
    else if (ease >= 15) add(quality, -2, "Dense prose", `Reading ease ${e} — heavy jargon`);
    else add(quality, -5, "Very hard to read", `Reading ease ${e}`);
    const avgSentence = n / Math.max(1, sentences.length);
    if (avgSentence > 35) add(quality, -3, "Run-on sentences", `${Math.round(avgSentence)} words per sentence on average`);
  }

  const specifics = figures + countNamedEntities(full);
  const perHundred = (specifics / Math.max(1, allWords.length)) * 100;
  if (allWords.length >= 20) {
    if (perHundred >= 12) add(quality, 4, "Specific", "Names people, products and figures");
    else if (perHundred < 4) add(quality, -3, "Vague", "Few names, products or figures");
  }

  if (n >= 30) {
    const unique = new Set(bodyWords.map((w) => w.toLowerCase())).size;
    const ttr = unique / n;
    if (ttr >= 0.72) add(quality, 2, "Varied wording", `${Math.round(ttr * 100)}% unique words`);
    else if (ttr < 0.5) add(quality, -3, "Repetitive wording", `${Math.round(ttr * 100)}% unique words`);
  }

  const explains = countHits(lower, EXPLAINS);
  if (explains > 0) add(quality, Math.min(4, explains * 2), "Explains why", "Connects cause and effect or compares alternatives");

  const sensational = hype + clickbait;
  if (sensational > 0) add(quality, -Math.min(8, sensational * 3), "Hype or clickbait", "Sensational framing over substance");

  const shouting = (full.match(/\b[A-Z]{6,}\b/g) ?? []).length;
  if (shouting >= 3 || /[!?]{2,}/.test(full) || /!/.test(title)) add(quality, -3, "Shouty formatting", "All-caps words or excess punctuation");
  if (/(\[…\]|\[\.\.\.\]|continue reading|read more)\s*$/i.test(body.trim())) add(quality, -2, "Cut-off text", "Source summary is truncated");

  // ---------------- Totals ----------------
  const sum = (list) => list.reduce((s, f) => s + f.points, 0);
  const factualScore = clamp(profile.factual + sum(factual));
  const qualityScore = clamp(profile.quality + sum(quality));
  const overallScore = clamp(factualScore * 0.6 + qualityScore * 0.4);

  const textWords = allWords.length;
  const confidence = textWords >= 60 ? "High" : textWords >= 25 ? "Medium" : "Low";

  const byImpact = (a, b) => Math.abs(b.points) - Math.abs(a.points);

  return {
    factualScore,
    qualityScore,
    overallScore,
    factualVerdict: verdict(factualScore),
    confidence,
    scoring: {
      version: SCORING_VERSION,
      sourceLabel: profile.label,
      factualStart: profile.factual,
      qualityStart: profile.quality,
      factual: factual.sort(byImpact),
      quality: quality.sort(byImpact),
      wordsAnalyzed: textWords,
    },
  };
}

export function verdict(score) {
  if (score >= 85) return "Strongly factual";
  if (score >= 70) return "Mostly factual";
  if (score >= 55) return "Mixed";
  if (score >= 40) return "Leans opinion";
  return "Opinion / speculation";
}

// --- the on-page explanation ---------------------------------------------

export const SCORING_GUIDE = {
  sources: Object.entries(SOURCE_PROFILES).map(([key, p]) => ({ key, ...p })),
  factual: [
    { points: "+6", label: "Primary source (paper, lab, open-source repo), unless self-promotional" },
    { points: "+3 to +6", label: "Cites figures or measurements" },
    { points: "up to +6", label: "Measured against benchmarks / datasets" },
    { points: "up to +6", label: "Attributes claims to a named source" },
    { points: "up to +5", label: "Links to checkable code, weights or paper" },
    { points: "+2", label: "Reports a concrete event" },
    { points: "−3", label: "No figures at all" },
    { points: "−4", label: "Preprint, not yet peer-reviewed" },
    { points: "−4", label: "Too little text to support claims" },
    { points: "−4", label: "Clickbait framing" },
    { points: "−5", label: "Question headline" },
    { points: "−5", label: "Company promoting its own product" },
    { points: "up to −12", label: "Speculative language (“could,” “reportedly”)" },
    { points: "up to −12", label: "Hype words (“groundbreaking,” “insane”)" },
    { points: "up to −16", label: "Opinion language (“should,” “I think”)" },
  ],
  quality: [
    { points: "−8 to +6", label: "Summary depth (word count)" },
    { points: "−4 to +3", label: "Headline clarity and length" },
    { points: "−5 to +4", label: "Readability (Flesch reading ease)" },
    { points: "−3 to +4", label: "Specificity (names, products, figures)" },
    { points: "−3 to +2", label: "Word variety" },
    { points: "up to +4", label: "Explains cause, effect or comparison" },
    { points: "−3", label: "Run-on sentences" },
    { points: "−3", label: "All-caps or excess punctuation" },
    { points: "−2", label: "Truncated source text" },
    { points: "up to −8", label: "Hype or clickbait" },
  ],
  verdicts: [
    { min: 85, label: "Strongly factual" },
    { min: 70, label: "Mostly factual" },
    { min: 55, label: "Mixed" },
    { min: 40, label: "Leans opinion" },
    { min: 0, label: "Opinion / speculation" },
  ],
};
