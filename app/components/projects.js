// Projects shown on the Home and Work pages. `internal: true` routes stay
// on this site; everything else opens in a new tab.
export const PROJECTS = [
  {
    name: "AI Research Feed",
    icon: "🧠",
    summary:
      "A daily-updated feed of AI research and industry news, scored automatically for factual accuracy and writing quality.",
    details:
      "Pulls from arXiv, Hacker News, and official lab blogs every day, then scores each story for how factual vs. opinionated it is and how well it's written. Includes a tab tracking new model capabilities.",
    links: [{ href: "/ai-research/", label: "Open the feed", internal: true }],
  },
  {
    name: "Real Estate Dashboard",
    icon: "🏢",
    summary:
      "Live interest rates from the Federal Reserve, deal news, and market metrics across four focus markets.",
    details:
      "Tracks the Fed Funds rate, 10-year Treasury, and 30-year mortgage from FRED, plus occupancy, cycle phase, and deal news for Denver, Chicago, Miami, and San Francisco.",
    links: [{ href: "/real-estate/", label: "Open the dashboard", internal: true }],
  },
  {
    name: "Chicago CRE Job Search",
    icon: "🔎",
    summary:
      "A daily feed of Chicago commercial real estate openings in acquisitions, development, and investment analysis.",
    details:
      "Pulls openings from employer job boards and job-search APIs every morning, filters out student programs, and sorts them by role type.",
    links: [{ href: "/job-search/", label: "Browse jobs", internal: true }],
  },
  {
    name: "RiskWhale",
    logo: "/logos/riskwhale-icon.jpg",
    summary:
      "Risk analytics for financial markets: pattern matching, SEC forensic analysis, and an AI terminal.",
    details:
      "Pattern matching across thousands of symbols, SEC forensic analysis, and an AI terminal built for institutional-grade risk intelligence.",
    links: [
      { href: "https://www.riskwhale.com/dashboard", label: "Visit RiskWhale" },
      { href: "https://x.com/riskwhale", label: "Follow on X" },
    ],
  },
];
