function BuildingIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16M13 21h7V11a1 1 0 0 0-1-1h-6M7 8h2M7 12h2M7 16h2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  const days = Math.round(diffMs / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export default function JobCard({ job }) {
  return (
    <a
      href={job.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
            {job.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.logo}
                alt={`${job.company} logo`}
                className="w-full h-full object-contain p-1.5"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <BuildingIcon className="w-5 h-5 text-gray-400" />
            )}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{job.company}</p>
            <p className="text-xs text-gray-400">{job.location}</p>
          </div>
        </div>

        {job.specialty && (
          <span className="shrink-0 text-right text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 rounded-full px-2.5 py-1 max-w-[9rem] leading-snug">
            {job.specialty.split("—")[0].trim()}
          </span>
        )}
      </div>

      <h2 className="mt-4 text-lg font-bold text-gray-900 leading-snug group-hover:underline">
        {job.title}
      </h2>

      <span className="inline-block mt-2 text-xs font-semibold text-green-800 bg-green-50 rounded-full px-2.5 py-1">
        {job.salary}
      </span>

      <p className="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-3">{job.blurb}</p>

      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
        <span>{job.aum ? `AUM: ${job.aum}` : "AUM: —"}</span>
        <span>
          {job.source} · {timeAgo(job.postedAt)}
        </span>
      </div>
    </a>
  );
}
