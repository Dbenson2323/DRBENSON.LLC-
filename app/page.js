//app/page.js
import Link from "next/link";
import PhotoBackdrop from "./components/PhotoBackdrop";
import EducationRow from "./components/EducationRow";
import SocialLink from "./components/SocialLink";
import { MailIcon, LinkedInIcon, InstagramIcon, XIcon } from "./components/ProfileIcons";

export default function HomePage() {
  return (
    <div className="relative min-h-screen text-white">
      <PhotoBackdrop />

      {/* Hero text, floating directly over the background photo */}
      <div className="relative px-6 pt-20 pb-8 max-w-2xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg">
          Duke Benson
        </h1>
        <p className="mt-3 text-lg text-white/80 drop-shadow">Denver, Colorado</p>
        <p className="mt-5 text-white/90 leading-relaxed max-w-lg mx-auto drop-shadow">
          I studied Finance and Real Estate at the University of Colorado Boulder&apos;s Leeds
          School of Business. I created and used software to understand AI advancements and stay
          up to date on current news. I combined both interests to create applicable work, from
          designing AI research feeds to building a live commercial real estate market
          dashboard.
        </p>
        <p className="mt-6 text-[8px] text-white/50">
          Background photo: Glacier National Park, via{" "}
          <a
            href="https://picryl.com/media/glacier-national-park-river-falls-nature-landscapes-2627b2"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white/80"
          >
            Picryl
          </a>
        </p>
      </div>

      <div className="relative px-6 pb-14 max-w-2xl mx-auto">
        {/* Bio */}
        <section className="mt-4">
          <div className="fade-edges rounded-2xl bg-gray-900 text-white shadow-md p-6 sm:p-8 flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/photos/duke-headshot-bw.webp"
              alt="Duke Benson"
              className="w-56 sm:w-72 h-auto"
            />
            <div className="mt-8 text-sm text-gray-300 leading-relaxed space-y-3">
              <p>
                I&apos;m a Finance and Real Estate graduate of the University of Colorado
                Boulder&apos;s Leeds School of Business with a strong interest in technology and
                artificial intelligence. My experience as an investment analyst spans real
                estate private equity and growth capital, where I&apos;ve built financial
                models, prepared investment committee materials, and conducted market research
                to support investment decisions. I&apos;m especially drawn to real estate
                investment and development, where careful underwriting and market research shape
                long-term value. I enjoy the analytical side of the business, from
                stress-testing assumptions in a model to understanding how a project&apos;s
                story plays out in the numbers.
              </p>
              <p>
                Outside of work, I build and use my own software to follow AI developments and
                stay current on the news, and I apply those skills to real estate. My projects
                range from AI-powered research feeds to a live commercial real estate market
                dashboard. I&apos;m drawn to work where financial analysis and technology meet,
                and I enjoy turning complex, fast-moving information into tools that support
                better decisions.
              </p>
              <p>
                In my free time, you&apos;ll find me on the basketball court, skiing, fly
                fishing, or anywhere outdoors. I also enjoy chess, reading, running, and
                weightlifting, and I like building things with my hands, from 3D design in
                Autodesk Fusion to metalwork.
              </p>
            </div>
          </div>
        </section>

        {/* Current focus / open to opportunities */}
        <section className="mt-10">
          <div className="fade-edges rounded-2xl border border-white/40 bg-white/95 p-6 sm:p-8">
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide bg-gray-900 text-white px-2.5 py-1 rounded-full mb-3">
              Open to Opportunities
            </span>
            <p className="text-sm text-gray-700 leading-relaxed">
              I&apos;m pursuing a career in Chicago&apos;s commercial real estate market,
              focused on principal-side and analytical roles in acquisitions, development, and
              investment analysis. I enjoy evaluating opportunities and understanding how a
              deal&apos;s fundamentals drive long-term value, and I build my own AI-powered
              tools, including a live CRE market dashboard. I&apos;m eager to bring that mix of
              analytical rigor and technology to a Chicago-based investment team.
            </p>
            <a
              href="mailto:dukerenobenson@gmail.com"
              className="inline-block mt-8 text-sm font-semibold text-gray-900 underline underline-offset-2 hover:text-gray-600"
            >
              Reach out for Resume →
            </a>
          </div>
        </section>

        {/* Certifications */}
        <section className="mt-10">
          <div className="fade-edges rounded-2xl border border-white/40 bg-white/95 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Certifications
            </p>
            <h3 className="font-semibold text-gray-900">ARGUS Enterprise Certified Professional</h3>
            <p className="text-sm text-gray-500 mt-0.5">Altus Group · Valid through May 2028</p>
            <a
              href="/certifications/argus-enterprise-certification.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sm font-semibold text-gray-900 underline underline-offset-2 hover:text-gray-600"
            >
              View certificate →
            </a>
          </div>
        </section>

        {/* Education */}
        <section className="mt-10 space-y-3">
          <EducationRow
            href="https://www.colorado.edu/business/"
            iconBg="#000000"
            logoSrc="/logos/cu-boulder-icon.svg"
            title="University of Colorado Boulder — Leeds School of Business"
            subtitle="Class of 2026 · Finance & Real Estate"
            bio="Graduated with a Bachelor of Science in Business Administration in Finance and Real Estate from the Leeds School of Business."
          />
          <EducationRow
            href="https://www.kentdenver.org/"
            iconBg="#F3F4F6"
            logoSrc="/logos/kent-denver-logo.jpeg"
            title="Kent Denver School"
            subtitle="Class of 2022"
            bio="Graduated from Kent Denver School in Denver, Colorado."
          />
        </section>

        {/* Currently building */}
        <section className="mt-14">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-white/70 drop-shadow mb-4">
            Current AI Developments/Projects and Research Pages
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/ai-research"
              className="fade-edges block rounded-xl p-5 bg-gray-900 text-white shadow-md hover:bg-black transition-colors"
            >
              <span className="text-2xl grayscale">🧠</span>
              <h2 className="mt-2 font-bold">AI Research Feed</h2>
              <p className="mt-1 text-sm text-gray-300 leading-relaxed">
                A daily-updated feed of AI research and industry news, scored automatically for
                factual accuracy and writing quality.
              </p>
              <span className="mt-3 inline-block text-sm font-semibold border-b border-white/60">Explore →</span>
            </Link>

            <Link
              href="/real-estate"
              className="fade-edges block rounded-xl p-5 bg-gray-900 text-white shadow-md hover:bg-black transition-colors"
            >
              <span className="text-2xl grayscale">🏢</span>
              <h2 className="mt-2 font-bold">Real Estate Dashboard</h2>
              <p className="mt-1 text-sm text-gray-300 leading-relaxed">
                Real interest rates from the Federal Reserve, live deal news, and market metrics
                across four focus markets.
              </p>
              <span className="mt-3 inline-block text-sm font-semibold border-b border-white/60">Explore →</span>
            </Link>

            <div className="fade-edges rounded-xl p-5 bg-gray-900 text-white shadow-md sm:col-span-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos/riskwhale-icon.jpg" alt="RiskWhale" className="w-8 h-8 rounded-full" />
              <h2 className="mt-2 font-bold">RiskWhale</h2>
              <p className="mt-1 text-sm text-gray-300 leading-relaxed">
                Comprehensive risk analytics for financial markets — pattern matching across
                thousands of symbols, SEC forensic analysis, and an AI terminal built for
                institutional-grade risk intelligence.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
                <a
                  href="https://www.riskwhale.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b border-white/60 hover:text-gray-300"
                >
                  Explore →
                </a>
                <a
                  href="https://x.com/riskwhale"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b border-white/60 hover:text-gray-300"
                >
                  Follow on X →
                </a>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-6">
            <Link
              href="/work"
              className="px-2 py-2 text-sm font-semibold text-white hover:text-white/70 underline underline-offset-4 transition-colors drop-shadow"
            >
              All Work
            </Link>
            <Link
              href="/about-me"
              className="px-2 py-2 text-sm font-semibold text-white hover:text-white/70 underline underline-offset-4 transition-colors drop-shadow"
            >
              About Me
            </Link>
            <Link
              href="/job-search"
              className="px-2 py-2 text-sm font-semibold text-white hover:text-white/70 underline underline-offset-4 transition-colors drop-shadow"
            >
              Job Search
            </Link>
          </div>
        </section>

        {/* Contact */}
        <section className="mt-16 text-center">
          <p className="text-white/70 drop-shadow mb-4">Let&apos;s connect</p>
          <div className="flex flex-wrap justify-center gap-3">
            <SocialLink href="mailto:info@drbenson.online" icon={<MailIcon className="w-4 h-4" />} label="Email" />
            <SocialLink href="https://www.linkedin.com/in/dukebenson/" icon={<LinkedInIcon className="w-4 h-4 rounded" />} label="LinkedIn" />
            <SocialLink href="https://www.instagram.com/dukebenson_/" icon={<InstagramIcon className="w-4 h-4" />} label="Instagram" />
            <SocialLink href={null} icon={<XIcon className="w-4 h-4" />} label="Twitter/X" />
          </div>
        </section>
      </div>
    </div>
  );
}
