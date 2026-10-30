"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, CONTACT_HREF } from "./navLinks";

// Pathnames may or may not carry a trailing slash (trailingSlash: true in
// next.config), so compare them without it.
function normalize(path) {
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "");
}

export default function SiteHeader() {
  const pathname = normalize(usePathname());
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close the mobile menu with Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href) => normalize(href) === pathname;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/90 backdrop-blur-md text-white">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Link href="/" className="text-lg font-bold tracking-tight hover:text-white/80">
          Duke Benson
        </Link>

        {/* Desktop menu */}
        <ul className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-white text-neutral-950"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="ml-2">
            <Link
              href={CONTACT_HREF}
              className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold hover:bg-white hover:text-neutral-950 transition-colors"
            >
              Contact
            </Link>
          </li>
        </ul>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {/* Mobile menu panel */}
      {open && (
        <div id="mobile-menu" className="lg:hidden border-t border-white/10 bg-neutral-950">
          <ul className="mx-auto max-w-6xl px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`block rounded-lg px-3 py-3 text-base font-medium ${
                    isActive(link.href) ? "bg-white text-neutral-950" : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={CONTACT_HREF}
                onClick={() => setOpen(false)}
                className="mt-2 block rounded-lg border border-white/30 px-3 py-3 text-center text-base font-semibold hover:bg-white hover:text-neutral-950"
              >
                Contact
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
