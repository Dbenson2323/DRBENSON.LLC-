"use client";

import { useState } from "react";
import ScoreMeter from "./ScoreMeter";
import ScoreBreakdown from "./ScoreBreakdown";
import TechIcon from "./TechIcons";

const SOURCE_TYPE_LABEL = {
  paper: "Preprint",
  official: "Official Announcement",
  journalism: "Tech Journalism",
  opensource: "Open Source",
  aggregator: "Community Aggregator",
  community: "Community Discussion",
};

// A subtle tint per category for the icon tile — keeps the list scannable
// without the heavy dark "hero image" every card used to carry.
const CATEGORY_TINT = {
  "AI News": "#EFF3FF",
  "AI Safety & Policy": "#FFF1EE",
  "Computer Vision": "#F1EEFF",
  "Industry & Business": "#EEFBF3",
  "LLMs & Chatbots": "#FFF8E5",
  "Open Source & Tools": "#EAFBFA",
  "Research Papers": "#F3F1EC",
  Robotics: "#FDEFF6",
};

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function StoryCard({ story, featured = false }) {
  const tint = CATEGORY_TINT[story.category] ?? "#F3F4F6";
  const [showWhy, setShowWhy] = useState(false);

  return (
    <article className="border-b border-gray-200 last:border-b-0">
      <a
        href={story.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex gap-4 pt-5 pb-3 group ${featured ? "sm:gap-6" : ""}`}
      >
        <div
          className={`relative shrink-0 rounded-lg flex items-center justify-center overflow-hidden ${
            featured ? "w-24 h-24 sm:w-28 sm:h-28" : "w-16 h-16"
          }`}
          style={{ backgroundColor: tint }}
        >
          <TechIcon
            name={story.icon}
            className={`text-gray-700 ${featured ? "w-12 h-12 sm:w-14 sm:h-14" : "w-8 h-8"}`}
          />
          {story.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mb-1.5">
            <span className="font-semibold text-gray-900">{story.sourceName}</span>
            <span>·</span>
            <span>{SOURCE_TYPE_LABEL[story.sourceType] ?? "Source"}</span>
            <span>·</span>
            <span>{timeAgo(story.publishedAt)}</span>
            <span className="uppercase tracking-wide text-[10px] font-semibold text-gray-400 ml-1">
              {story.category}
            </span>
          </div>

          <h2
            className={`font-serif font-bold text-gray-900 leading-snug group-hover:underline decoration-1 underline-offset-2 ${
              featured ? "text-2xl sm:text-3xl mb-2" : "text-lg mb-1"
            }`}
          >
            {story.title}
          </h2>
          <p
            className={`text-gray-600 leading-relaxed ${
              featured ? "text-base line-clamp-3" : "text-sm line-clamp-2"
            }`}
          >
            {story.blurb}
          </p>

        </div>
      </a>

      <div className={`pb-5 ${featured ? "sm:pl-[8.5rem]" : "sm:pl-20"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <ScoreMeter label="Factual" value={story.factualScore} />
          <ScoreMeter label="Quality" value={story.qualityScore} />
          {story.factualVerdict && (
            <span className="text-xs text-gray-500">{story.factualVerdict}</span>
          )}
          {story.scoring && (
            <button
              type="button"
              onClick={() => setShowWhy((v) => !v)}
              aria-expanded={showWhy}
              className="text-xs font-semibold text-gray-700 underline underline-offset-2 hover:text-gray-900"
            >
              {showWhy ? "Hide breakdown" : "Why this score?"}
            </button>
          )}
        </div>
        {showWhy && <ScoreBreakdown story={story} />}
      </div>
    </article>
  );
}
