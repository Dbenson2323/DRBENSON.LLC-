// app/page.js
import Link from "next/link";
import PhotoHero from "./components/PhotoHero";
import ProjectCard from "./components/ProjectCard";
import SocialLink from "./components/SocialLink";
import { PROJECTS } from "./components/projects";
import { MailIcon, LinkedInIcon, InstagramIcon, XIcon } from "./components/ProfileIcons";

export default function HomePage() {
  return (
    <div className="bg-neutral-950 text-white">
      <PhotoHero tall>
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70">
            Denver, Colorado
          </p>
          <h1 className="mt-3 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Duke Benson
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-white/85 lg:text-xl">
            Finance &amp; Real Estate graduate of CU Boulder&apos;s Leeds School of Business. I
            build AI-powered tools for following markets and research, from daily AI research
            feeds to a live commercial real estate dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/work/"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 hover:bg-white/85"
            >
              See my work
            </Link>
            <Link
              href="/about-me/"
              className="rounded-full border border-white/50 px-6 py-3 text-sm font-semibold hover:bg-white/10"
            >
              About me
            </Link>
          </div>
        </div>
      </PhotoHero>

      {/* Projects */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Projects</p>
            <h2 className="mt-2 text-3xl font-bold">What I&apos;m building</h2>
          </div>
          <Link href="/work/" className="text-sm font-semibold text-white/70 hover:text-white">
            All work →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {PROJECTS.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      </section>

      {/* Open to opportunities */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        <div className="grid gap-8 rounded-2xl bg-white p-8 text-neutral-900 lg:grid-cols-[2fr_1fr] lg:items-center lg:p-12">
          <div>
            <span className="inline-block rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
              Open to opportunities
            </span>
            <p className="mt-4 leading-relaxed text-neutral-700">
              I&apos;m pursuing a career in Chicago&apos;s commercial real estate market,
              focused on principal-side and analytical roles in acquisitions, development, and
              investment analysis. I enjoy evaluating opportunities and understanding how a
              deal&apos;s fundamentals drive long-term value, and I&apos;m eager to bring
              analytical rigor and technology to a Chicago-based investment team.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <a
              href="mailto:dukerenobenson@gmail.com"
              className="rounded-full bg-neutral-900 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-black"
            >
              Request my resume
            </a>
            <Link
              href="/about-me/"
              className="text-center text-sm font-semibold underline underline-offset-4 hover:text-neutral-600"
            >
              Background &amp; education
            </Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 text-center">
          <h2 className="text-3xl font-bold">Let&apos;s connect</h2>
          <p className="mt-2 text-white/60">The best way to reach me is email or LinkedIn.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <SocialLink href="mailto:dukerenobenson@gmail.com" icon={<MailIcon className="w-4 h-4" />} label="Email" />
            <SocialLink href="https://www.linkedin.com/in/dukebenson/" icon={<LinkedInIcon className="w-4 h-4 rounded" />} label="LinkedIn" />
            <SocialLink href="https://www.instagram.com/dukebenson_/" icon={<InstagramIcon className="w-4 h-4" />} label="Instagram" />
            <SocialLink href={null} icon={<XIcon className="w-4 h-4" />} label="Twitter/X" />
          </div>
        </div>
      </section>
    </div>
  );
}
