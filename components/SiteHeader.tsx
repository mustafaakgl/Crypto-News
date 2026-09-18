"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useNewsInteraction } from "@/components/NewsInteractionContext";

const NAV_LINKS = [
  { href: "/en", label: "Home" },
  { href: "/en/latest-crypto-news", label: "News" },
  { href: "/en/prices", label: "Prices" },
  { href: "/en/analytics", label: "Analytics" },
];

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { savedItems, openSavedPanel } = useNewsInteraction();
  const [query, setQuery] = useState("");

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/en/latest-crypto-news?q=${encodeURIComponent(trimmed)}` : "/en/latest-crypto-news");
  }

  function isActive(href: string) {
    if (href === "/en") return pathname === "/en";
    return pathname?.startsWith(href) ?? false;
  }

  return (
    <header className="border-b-4 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-4 flex flex-wrap items-center gap-x-6 gap-y-3 justify-between">
        <div className="flex items-center gap-6">
          <a href="/en" className="font-serif text-2xl sm:text-3xl font-800 tracking-tight">
            Kripto <span className="bg-accent px-1">Brifing</span>
          </a>
          <nav className="hidden sm:flex items-center gap-4 text-xs font-semibold uppercase tracking-wide">
            {NAV_LINKS.filter((l) => l.href !== "/en").map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={
                  isActive(link.href)
                    ? "text-ink underline decoration-accent decoration-2 underline-offset-4"
                    : "text-ink/70 hover:text-ink hover:underline decoration-accent decoration-2 underline-offset-4"
                }
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} role="search" className="hidden md:block">
            <label htmlFor="site-search" className="sr-only">
              Search news headlines
            </label>
            <input
              id="site-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search news headlines"
              className="border border-ink/30 px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-ink"
            />
          </form>
          <button
            type="button"
            onClick={openSavedPanel}
            className="border border-ink/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:border-ink"
          >
            Saved{savedItems.length > 0 ? ` (${savedItems.length})` : ""}
          </button>
          <p className="hidden lg:block text-xs uppercase tracking-widest text-ink/60">{today}</p>
        </div>
      </div>

      <div className="sm:hidden border-t border-rule px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-semibold uppercase tracking-wide">
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={`shrink-0 pb-0.5 ${
              isActive(link.href) ? "text-ink border-b-2 border-accent" : "text-ink/60"
            }`}
          >
            {link.label}
          </a>
        ))}
      </div>

      <div className="md:hidden border-t border-rule px-4 py-2">
        <form onSubmit={handleSearch} role="search">
          <label htmlFor="site-search-mobile" className="sr-only">
            Search news headlines
          </label>
          <input
            id="site-search-mobile"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search news headlines"
            className="border border-ink/30 px-3 py-1.5 text-sm w-full focus:outline-none focus:border-ink"
          />
        </form>
      </div>
    </header>
  );
}
