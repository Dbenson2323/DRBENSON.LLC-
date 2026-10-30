import Link from "next/link";

function ProjectLink({ link }) {
  const className =
    "inline-flex items-center gap-1 text-sm font-semibold text-white border-b border-white/50 hover:border-white";
  if (link.internal) {
    return (
      <Link href={link.href} className={className}>
        {link.label} →
      </Link>
    );
  }
  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
      {link.label} ↗
    </a>
  );
}

export default function ProjectCard({ project, detailed = false }) {
  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-neutral-900 p-6 transition-colors hover:border-white/30">
      {project.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={project.logo} alt="" className="h-9 w-9 rounded-full" />
      ) : (
        <span className="text-3xl grayscale" aria-hidden="true">
          {project.icon}
        </span>
      )}
      <h3 className="mt-3 text-lg font-bold text-white">{project.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-white/70">
        {detailed ? project.details : project.summary}
      </p>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
        {project.links.map((link) => (
          <ProjectLink key={link.href} link={link} />
        ))}
      </div>
    </article>
  );
}
