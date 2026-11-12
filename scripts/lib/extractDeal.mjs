// Pulls a quick "deal snapshot" out of a CRE trade-press headline + summary:
// what kind of deal it is, the dollar amount, the size, and which companies
// played which role (buyer, seller, broker, lender, developer...).
//
// Trade-press write-ups follow a consistent pattern ("X has brokered the
// $115 million sale of ... Y purchased the property from Z"), so plain text
// rules get most deals right. Anything the rules can't find is left out
// rather than guessed.

export const DEAL_EXTRACTOR_VERSION = 2;

// --- text cleanup -----------------------------------------------------------

const NAMED_ENTITIES = {
  amp: "&", nbsp: " ", quot: '"', apos: "'", lt: "<", gt: ">", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", eacute: "é",
};

// Decodes named and numeric HTML entities. Runs twice so double-encoded
// text from feeds (e.g. "&amp;#038;" -> "&#038;" -> "&") comes out clean.
export function decodeEntities(text = "") {
  let out = text;
  for (let i = 0; i < 2; i++) {
    out = out
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeChar(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => safeChar(parseInt(dec, 10)))
      .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
  }
  return out.replace(/ /g, " ");
}

function safeChar(code) {
  return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
}

// --- deal type -----------------------------------------------------------------

const DEAL_TYPES = [
  { type: "Commentary", test: /^By [A-Z]/ },
  { type: "Merger", test: /\bmerge[rs]?\b/i },
  { type: "Refinancing", test: /\brefinanc/i },
  { type: "Financing", test: /\b(financing|construction loan|bridge loan|\bloan\b|lends?|lender|debt)\b/i },
  { type: "Sale", test: /\b(sale|sells?|sold|acquires?|acquired|acquisition|purchases?|purchased|buys?|bought)\b/i },
  { type: "Lease", test: /\b(leases?|leased|signs? lease|lease signing)\b/i },
  { type: "Conversion", test: /\bconversion\b/i },
  { type: "Renovation", test: /\b(renovation|redevelopment|repositioning)\b/i },
  { type: "Expansion", test: /\b(expands?|expanding|expansion|relocates?|relocating|to open|opens)\b/i },
  { type: "Development", test: /\b(to build|build|breaks? ground|groundbreaking|begins? construction|starts? construction|completes?|completed|delivers?|development|plans?|proposed|underway)\b/i },
];

function detectType(title, body) {
  // Commentary pieces open with a byline.
  if (DEAL_TYPES[0].test.test(body.trim())) return "Commentary";
  for (const d of DEAL_TYPES.slice(1)) if (d.test.test(title)) return d.type;
  for (const d of DEAL_TYPES.slice(1)) if (d.test.test(body)) return d.type;
  return null;
}

// --- amounts and size ------------------------------------------------------------

function findAmount(text) {
  const m = text.match(/\$\s?(\d[\d,]*(?:\.\d+)?)\s?(billion|million|thousand|bn|[BMK])?\b/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  const unit = (m[2] || "").toLowerCase();
  const mult = unit.startsWith("b") ? 1e9 : unit.startsWith("m") ? 1e6 : unit.startsWith("t") || unit === "k" ? 1e3 : 1;
  const value = n * mult;
  if (value < 10000) return null; // ignore per-SF and similar small figures
  const label = value >= 1e9 ? `$${+(value / 1e9).toFixed(2)}B` : value >= 1e6 ? `$${+(value / 1e6).toFixed(1)}M` : `$${Math.round(value / 1e3)}K`;
  return { value, label };
}

function num(s) {
  return parseFloat(s.replace(/,/g, ""));
}

const SIZE_PATTERNS = [
  [/(\d+(?:\.\d+)?)\s?MSF\b/i, (m) => `${m[1]}M SF`],
  [/(\d[\d,]*(?:\.\d+)?)[-\s]square[-\s]f(?:oo|ee)t/i, (m) => `${num(m[1]).toLocaleString("en-US")} SF`],
  [/(\d[\d,]*)\s?SF\b/, (m) => `${num(m[1]).toLocaleString("en-US")} SF`],
  [/(\d[\d,]*)[-\s](?:unit|home|apartment)s?\b/i, (m) => `${num(m[1]).toLocaleString("en-US")} units`],
  [/(\d[\d,]*)[-\s](?:room|key)s?\b/i, (m) => `${num(m[1]).toLocaleString("en-US")} rooms`],
  [/(\d[\d,]*)[-\s]beds?\b/i, (m) => `${num(m[1]).toLocaleString("en-US")} beds`],
  [/(\d[\d,]*(?:\.\d+)?)[-\s]acres?\b/i, (m) => `${m[1]} acres`],
  [/(\d+)[-\s]stor(?:y|ies)\b/i, (m) => `${m[1]} stories`],
];

// The earliest size mentioned is usually the property's headline size;
// stories/acres only count if nothing more useful is given.
function findSize(text) {
  const t = text.replace(/[–—]/g, "-");
  let best = null;
  let fallback = null;
  for (const [re, fmtSize] of SIZE_PATTERNS) {
    const m = re.exec(t);
    if (!m) continue;
    const isWeak = /acres|stories/.test(fmtSize(m));
    if (isWeak) {
      if (!fallback || m.index < fallback.index) fallback = { index: m.index, label: fmtSize(m) };
    } else if (!best || m.index < best.index) {
      best = { index: m.index, label: fmtSize(m) };
    }
  }
  return (best ?? fallback)?.label ?? null;
}

// --- parties -------------------------------------------------------------------

// A company name: capitalized words, initials, "&", and corporate suffixes.
const WORD = "(?:[A-Z0-9][A-Za-z0-9’'.\\-/&]*|&)";
const NAME = `${WORD}(?:\\s+(?:${WORD}|of|de|la|du))*`;

const LOWER_STOP = /^(The|A|An|This|That|These|Its|Their|It|Located|Situated|Built|Constructed|Completed|Plans|Planned|Amenities|Additionally|According|Terms|Details|Based)$/;
const PLACE_WORDS = /^(Chicago|Denver|Miami|San Francisco|Colorado|Illinois|Florida|California|Texas|New York|Los Angeles|Downtown|Metro|North|South|East|West|Bay Area|Silicon Valley)$/;

const ABBREV = /\b(Co|Corp|Inc|Cos|Ltd|Bros|Assoc|Mgmt|St|Ave|Jr|Sr|[A-Z])$/;

// Cut a captured name at a sentence break. `keep` picks which side: the
// last piece when the name sat right before a verb ("... Loop. Ware Malcomb
// provided"), the first piece when it followed a word like "from".
function cutAtSentence(name, keep) {
  const parts = [];
  let buf = "";
  for (const piece of name.split(/(?<=\.)\s+(?=[A-Z])/)) {
    buf = buf ? `${buf} ${piece}` : piece;
    // "Co. LLC" or "W. P. Carey" are not sentence breaks.
    if (!ABBREV.test(buf.replace(/\.$/, ""))) {
      parts.push(buf);
      buf = "";
    }
  }
  if (buf) parts.push(buf);
  return keep === "first" ? parts[0] : parts[parts.length - 1];
}

function cleanName(raw, keep = "last") {
  if (!raw) return null;
  let name = cutAtSentence(raw.trim(), keep)
    // "Atlanta-based Hunter Advisors", "Deerfield, Ill.-based Core Acquisitions"
    .replace(/^.*?-based\s+/, "")
    // leading lowercase words: "a partnership of", "investors", "the"
    .replace(/^(?:[a-z][a-z-]*\s+)+/, "")
    // "Corey Chase of Newmark" -> "Newmark"
    .replace(/^[A-Z][a-z]+(?:\s[A-Z]\.)?\s[A-Z][A-Za-z’'-]+\s+of\s+/, "")
    // role words in front of a name: "Owner Dermody" -> "Dermody"
    .replace(/^(?:Owner|Landlord|Developer|Buyer|Seller|Lender|Tenant|Borrower)\s+/, "")
    // verbs swallowed from a headline: "BH3 Partner to Develop", "X Unveil Plans"
    .replace(/\s+(?:Partner|Unveil|Unveils|Team|Teams|Joins?)$/, "")
    .replace(/[’']s$/, "")
    .replace(/\s+(?:has|have|had|is|was|will|recently|also)$/i, "")
    .replace(/[,;:]+$/, "")
    .replace(/\.$/, (m, i, str) => (ABBREV.test(str.slice(0, -1)) ? "." : ""))
    .trim();
  const first = name.split(/\s+/)[0];
  if (!name || LOWER_STOP.test(first) || PLACE_WORDS.test(name)) return null;
  if (/-based$/.test(name) || !/[A-Za-z]/.test(name)) return null;
  if (/\b(?:Tenants?|Partnership|Project|Phase|Plans?|Center|Building|Apartments?|Property|Properties Inc\. Plans)$/.test(name) && !/\b(?:Partners|Properties|Group)$/.test(name)) return null;
  if (/^(?:One|Two|Three|Four|Five|Six|Several|New|First|Second|Public|Private)\b/.test(name)) return null;
  name = restoreFirms(name);
  if (name.length < 2 || name.length > 60) return null;
  return name;
}

function splitNames(raw, keep) {
  // "Prime Finance and Hines" -> two firms; "Cushman & Wakefield" stays whole.
  return raw
    .split(/\s*,\s*(?:and\s+)?|\s+and\s+/)
    .map((n) => cleanName(n, keep))
    .filter(Boolean);
}

const ROLE_RULES = [
  // Brokers / advisors
  { role: "Broker", re: new RegExp(`(?:^|[.—]\\s*)(${NAME})\\s+(?:has\\s+)?(?:brokered|arranged|negotiated|facilitated|marketed)\\b`, "g") },
  { role: "Broker", re: new RegExp(`\\b(?:of|at)\\s+(${NAME})\\s+(?:represented|brokered|arranged|negotiated|advised)\\b`, "g") },
  { role: "Broker", re: new RegExp(`^(${NAME})\\s+(?:Arranges|Brokers|Negotiates|Facilitates)\\b`, "g"), titleOnly: true },
  // Buyers
  { role: "Buyer", re: new RegExp(`(?:^|[.—]\\s*)(${NAME}(?:,\\s+${NAME})*(?:,?\\s+and\\s+${NAME})?)\\s+(?:has\\s+|have\\s+)?(?:acquired|purchased|bought)\\b`, "g"), split: true },
  { role: "Buyer", re: new RegExp(`^((?:${NAME})(?:,\\s+${NAME})*)\\s+(?:Acquires?|Buys?|Purchases?)\\b`, "g"), titleOnly: true, split: true },
  { role: "Buyer", re: /\bbuyers?,\s+([^,.]{3,90})/g, split: true, keep: "first" },
  { role: "Buyer", re: new RegExp(`\\b(?:sale|sold)\\b(?:(?!leased|leases)[^.]){0,120}?\\bto\\s+(${NAME})(?=\\s+for\\b|[.,])`, "g"), keep: "first" },
  // Sellers
  { role: "Seller", re: new RegExp(`\\b(?:acquired|purchased|bought|acquire|purchase|buys)\\b[^.]{0,140}?\\bfrom\\s+(${NAME})`, "g"), keep: "first" },
  { role: "Seller", re: new RegExp(`(?:^|[.—]\\s*)(${NAME})\\s+(?:has\\s+)?(?:sold|completed the sale|completed the disposition)\\b`, "g") },
  { role: "Seller", re: /\bsellers?,\s+([^,.]{3,90})/g, split: true, keep: "first" },
  // Lenders
  { role: "Lender", re: new RegExp(`(?:^|[.—]\\s*)(${NAME})\\s+(?:has\\s+)?(?:provided|originated|funded|closed)\\b[^.]{0,60}?\\b(?:loan|financing|debt)`, "g") },
  { role: "Lender", re: new RegExp(`\\b(?:loan|financing)\\s+(?:was\\s+)?(?:provided|originated)\\s+by\\s+(${NAME})`, "g"), keep: "first" },
  { role: "Lender", re: new RegExp(`\\blender,?\\s+(${NAME})`, "g"), keep: "first" },
  { role: "Lender", re: new RegExp(`^(${NAME})\\s+(?:Provides|Originates|Lends|Funds|Closes)\\b`, "g"), titleOnly: true },
  // Borrowers
  { role: "Borrower", re: new RegExp(`^(${NAME})\\s+(?:Receives|Obtains|Secures|Lands|Closes on)\\b`, "g"), titleOnly: true },
  { role: "Borrower", re: new RegExp(`\\bon behalf of (?:the\\s+)?(?:borrower,?\\s+)?(${NAME})`, "g"), keep: "first" },
  // Developers / owners
  { role: "Developer", re: new RegExp(`^((?:${NAME})(?:,\\s+${NAME})*)\\s+(?:to (?:Build|Develop|Redevelop|Break Ground|Open|Convert)|Plans?|Breaks? Ground|Begins?|Starts?|Completes?|Delivers?|Opens?|Unveils?|Proposes?|Constructs?|Tops? Out)\\b`, "g"), titleOnly: true, split: true },
  { role: "Developer", re: new RegExp(`(?:^|[.—]\\s*)(${NAME}(?:,?\\s+and\\s+${NAME})?)\\s+(?:has\\s+|have\\s+)?(?:begun|started|completed|broken ground|delivered|unveiled|plans|is developing|are developing)\\b`, "g"), split: true },
  // Owners / landlords
  { role: "Owner", re: new RegExp(`\\b(?:[Oo]wner|[Ll]andlord),?\\s+(${NAME})`, "g"), keep: "first" },
  { role: "Owner", re: new RegExp(`^(${NAME})\\s+Signs?\\s+(?:New\\s+)?Tenants`, "g"), titleOnly: true },
  // Tenants
  { role: "Tenant", re: new RegExp(`(?:^|[.—]\\s*)(${NAME})\\s+(?:has\\s+)?(?:fully\\s+)?leased\\b`, "g") },
  { role: "Tenant", re: new RegExp(`^((?:${NAME})(?:,\\s+${NAME})*)\\s+(?:Signs?|Inks?)\\s+(?!(?:New\\s+)?Tenants)`, "g"), titleOnly: true, split: true },
  { role: "Tenant", re: new RegExp(`(?:^|[.—]\\s*)(${NAME})\\s+(?:has\\s+)?(?:signed|inked)\\s+(?:a\\s+)?(?!(?:[\\w-]+\\s+){0,3}tenants)(?:[\\w-]+\\s+){0,4}lease`, "g") },
  { role: "Tenant", re: new RegExp(`\\bleased?\\b[^.]{0,80}?\\bto\\s+(${NAME})(?=[.,\\s])`, "g"), keep: "first" },
  // Architects / contractors
  { role: "Architect", re: new RegExp(`(${NAME})\\s+(?:is|was|served as)\\s+(?:the\\s+)?architect`, "g") },
  { role: "Architect", re: new RegExp(`(${NAME})(?:[’']s\\s+[A-Z][a-z]+\\s+office)?\\s+provided architecture`, "g") },
  { role: "Contractor", re: new RegExp(`(${NAME})\\s+(?:is|was|served as)\\s+(?:the\\s+)?(?:general contractor|contractor|builder)`, "g") },
];

function extractParties(title, body) {
  const found = [];
  const seen = new Set();
  const add = (role, name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    // "JLL" vs "JLL Capital Markets": keep one entry, the longer name.
    const dup = found.find((p) => {
      const k = p.name.toLowerCase();
      return k.startsWith(`${key} `) || key.startsWith(`${k} `);
    });
    if (dup) {
      if (name.length > dup.name.length) dup.name = name;
      seen.add(key);
      return;
    }
    seen.add(key);
    found.push({ role, name });
  };
  for (const rule of ROLE_RULES) {
    const sources = rule.titleOnly ? [title] : [title, body];
    for (const text of sources) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(text))) {
        const names = rule.split ? splitNames(m[1], rule.keep) : [cleanName(m[1], rule.keep)].filter(Boolean);
        for (const n of names) add(rule.role, n);
      }
    }
  }
  return found;
}

// Strip the dateline ("CHICAGO — ") and byline before matching.
// Firm names that contain "and", so they aren't split into two companies.
const AND_FIRMS = ["Draper and Kramer", "Johnson and Johnson", "Procter and Gamble"];

function protectFirms(text) {
  let out = text;
  for (const firm of AND_FIRMS) out = out.split(firm).join(firm.replace(" and ", "AndAnd"));
  return out;
}

function restoreFirms(name) {
  return name.replace(/AndAnd/g, " and ");
}

function prepBody(body) {
  return body
    .replace(/^[A-Z][A-Z .,'’-]{2,60}\s?[—–-]\s*/, "")
    // "Deerfield, Ill.-based Core Acquisitions" -> "Core Acquisitions"
    .replace(/\b[A-Z][A-Za-z.]*(?:[ ,]+[A-Z][A-Za-z.]*)*-based\s+/g, "")
    .replace(/…$/, "")
    .trim();
}

export function extractDeal(rawTitle, rawBody) {
  const title = protectFirms(decodeEntities(rawTitle).trim());
  const body = protectFirms(prepBody(decodeEntities(rawBody)));
  const type = detectType(title, body);
  if (type === "Commentary") return { version: DEAL_EXTRACTOR_VERSION, type };

  const titleAmount = findAmount(title);
  const bodyAmount = titleAmount ? null : findAmount(body);
  const amount = titleAmount ?? (bodyAmount && bodyAmount.value >= 1e6 ? bodyAmount : null);
  const size = findSize(title) ?? findSize(subjectSentences(body));
  // Price per SF / unit only when the amount clearly prices the same thing:
  // both in the headline, or in the same sentence of the write-up.
  const linked =
    amount &&
    size &&
    ((titleAmount && findSize(title) === size) ||
      body.split(/(?<=[.!?])\s+(?=[A-Z])/).some((x) => findAmount(x)?.label === amount.label && findSize(x) === size) ||
      (titleAmount && !findSize(title)));
  const parties = extractParties(title, body).slice(0, 6);

  return {
    version: DEAL_EXTRACTOR_VERSION,
    type,
    amount: amount?.label ?? null,
    amountValue: amount?.value ?? null,
    pricePerUnit: linked ? perUnit(amount.value, size) : null,
    size,
    parties,
  };
}

// Sizes elsewhere in a write-up often describe a different building (the
// buyer's other holdings), so only look where the subject is described: the
// first sentence, and sentences that open with "The 31-story, 651,000-...".
function subjectSentences(body) {
  const sentences = body.split(/(?<=[.!?])\s+(?=[A-Z])/);
  return [sentences[0] ?? "", ...sentences.slice(1).filter((x) => /^The\s+\d/.test(x))].join(" ");
}

// e.g. $115M / 651,000 SF -> "$177 / SF"
function perUnit(value, size) {
  if (!value || !size) return null;
  const m = size.match(/^([\d,.]+)(M)?\s(SF|units|rooms|beds)$/);
  if (!m) return null;
  const qty = parseFloat(m[1].replace(/,/g, "")) * (m[2] ? 1e6 : 1);
  if (!qty) return null;
  const per = value / qty;
  const unit = { SF: "SF", units: "unit", rooms: "room", beds: "bed" }[m[3]];
  const label = per >= 1e6 ? `$${(per / 1e6).toFixed(2)}M` : per >= 1e3 ? `$${Math.round(per / 1e3)}K` : `$${Math.round(per)}`;
  return `${label} / ${unit}`;
}
