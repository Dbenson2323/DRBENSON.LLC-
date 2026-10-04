import { GraduationCapIcon } from "./ProfileIcons";

export default function EducationRow({ href, iconColor, iconBg, logoSrc, title, subtitle, bio }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fade-edges flex items-start gap-4 p-4 rounded-xl border border-white/40 hover:border-white/70 bg-white/95 transition-colors"
    >
      {logoSrc ? (
        <span
          className="shrink-0 w-11 h-11 rounded-full overflow-hidden flex items-center justify-center p-2"
          style={{ backgroundColor: iconBg }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt={`${title} logo`} className="w-full h-full object-contain" />
        </span>
      ) : (
        <span
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <GraduationCapIcon className="w-6 h-6" />
        </span>
      )}
      <span className="flex-1">
        <span className="block font-semibold text-gray-900">{title}</span>
        <span className="block text-sm text-gray-500">{subtitle}</span>
        <span className="block text-sm text-gray-600 mt-1">{bio}</span>
      </span>
    </a>
  );
}
