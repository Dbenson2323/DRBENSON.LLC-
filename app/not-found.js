import Link from "next/link";
import { NAV_LINKS } from "./components/navLinks";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="bg-neutral-950 text-white">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-24 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-white/50">404</p>
        <h1 className="mt-3 text-4xl font-bold">This page doesn&apos;t exist</h1>
        <p className="mt-3 text-white/60">Try one of these instead:</p>
        <ul className="mt-8 flex flex-wrap justify-center gap-3">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-block rounded-full border border-white/30 px-5 py-2 text-sm font-semibold hover:bg-white hover:text-neutral-950"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
