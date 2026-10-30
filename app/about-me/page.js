// app/about-me/page.js
import Link from "next/link";
import PhotoHero from "../components/PhotoHero";
import EducationRow from "../components/EducationRow";

export const metadata = {
  title: "About",
  description: "Background, education, and certifications for Duke Benson.",
};

export default function AboutMe() {
  return (
    <div className="bg-neutral-950 text-white">
      <PhotoHero>
        <p className="text-sm font-semibold uppercase tracking-widest text-white/70">About</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Background</h1>
      </PhotoHero>

      {/* Bio: photo beside text on desktop, stacked on mobile */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 py-16 lg:grid-cols-[1fr_1.6fr] lg:items-start">
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-neutral-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/photos/duke-headshot-bw.webp" alt="Duke Benson" className="h-auto w-full" />
        </div>
        <div className="space-y-5 leading-relaxed text-white/80">
          <p>
            I&apos;m a Finance and Real Estate graduate of the University of Colorado
            Boulder&apos;s Leeds School of Business with a strong interest in technology and
            artificial intelligence. My experience as an investment analyst spans real estate
            private equity and growth capital, where I&apos;ve built financial models, prepared
            investment committee materials, and conducted market research to support investment
            decisions. I&apos;m especially drawn to real estate investment and development, where
            careful underwriting and market research shape long-term value. I enjoy the analytical
            side of the business, from stress-testing assumptions in a model to understanding how
            a project&apos;s story plays out in the numbers.
          </p>
          <p>
            Outside of work, I build and use my own software to follow AI developments and stay
            current on the news, and I apply those skills to real estate. My projects range from
            AI-powered research feeds to a live commercial real estate market dashboard. I&apos;m
            drawn to work where financial analysis and technology meet, and I enjoy turning
            complex, fast-moving information into tools that support better decisions.
          </p>
          <p>
            In my free time, you&apos;ll find me on the basketball court, skiing, fly fishing, or
            anywhere outdoors. I also enjoy chess, reading, running, and weightlifting, and I like
            building things with my hands, from 3D design in Autodesk Fusion to metalwork.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="mailto:dukerenobenson@gmail.com"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 hover:bg-white/85"
            >
              Request my resume
            </a>
            <Link
              href="/work/"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold hover:bg-white/10"
            >
              See my work
            </Link>
          </div>
        </div>
      </section>

      {/* Education & certifications */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 pb-20 lg:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/50">Education</h2>
          <div className="mt-4 space-y-3">
            <EducationRow
              href="https://www.colorado.edu/business/"
              iconBg="#000000"
              logoSrc="/logos/cu-boulder-icon.svg"
              title="University of Colorado Boulder — Leeds School of Business"
              subtitle="Class of 2026 · Finance & Real Estate"
              bio="Bachelor of Science in Business Administration in Finance and Real Estate."
            />
            <EducationRow
              href="https://www.kentdenver.org/"
              iconBg="#F3F4F6"
              logoSrc="/logos/kent-denver-logo.jpeg"
              title="Kent Denver School"
              subtitle="Class of 2022"
              bio="Graduated from Kent Denver School in Denver, Colorado."
            />
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/50">Certifications</h2>
          <div className="mt-4 rounded-xl border border-white/10 bg-neutral-900 p-5">
            <h3 className="font-semibold">ARGUS Enterprise Certified Professional</h3>
            <p className="mt-0.5 text-sm text-white/60">Altus Group · Valid through May 2028</p>
            <a
              href="/certifications/argus-enterprise-certification.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-semibold border-b border-white/50 hover:border-white"
            >
              View certificate ↗
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
