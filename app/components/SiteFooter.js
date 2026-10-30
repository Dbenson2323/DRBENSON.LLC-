import Link from "next/link";
import { NAV_LINKS } from "./navLinks";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-neutral-950 text-white/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-white">Duke Benson</p>
          <p className="text-sm">Denver, Colorado · Finance &amp; Real Estate</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="pb-8 text-center text-xs text-white/40">
        © {new Date().getFullYear()} Duke Benson
      </p>
    </footer>
  );
}
