"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { useNewsInteraction } from "@/components/NewsInteractionContext";
import { LOCALES, localeFromPathname, withLocale, type Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

function navLinks(locale: Locale, dict: ReturnType<typeof getDictionary>) {
  return [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/latest-crypto-news`, label: dict.nav.news },
    { href: `/${locale}/prices`, label: dict.nav.prices },
    { href: `/${locale}/analytics`, label: dict.nav.analytics },
  ];
}

const LOCALE_DATE_TAG: Record<Locale, string> = { en: "en-GB", de: "de-DE" };

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { savedItems, openSavedPanel } = useNewsInteraction();
  const [query, setQuery] = useState("");

  const locale = localeFromPathname(pathname);
  const dict = getDictionary(locale);
  const homeHref = `/${locale}`;
  const newsHref = `/${locale}/latest-crypto-news`;
  const links = navLinks(locale, dict);

  const today = new Date().toLocaleDateString(LOCALE_DATE_TAG[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `${newsHref}?q=${encodeURIComponent(trimmed)}` : newsHref);
  }

  function isActive(href: string) {
    if (href === homeHref) return pathname === homeHref;
    return pathname?.startsWith(href) ?? false;
  }

  return (
    <header className="border-b-4 border-ink">
      <div className="mx-auto max-w-6xl px-4 py-4 flex flex-wrap items-center gap-x-6 gap-y-3 justify-between">
        <div className="flex items-center gap-6">
          <a href={homeHref} className="font-serif text-2xl sm:text-3xl font-800 tracking-tight">
            Kripto <span className="bg-accent px-1">Brifing</span>
          </a>
          <nav className="hidden sm:flex items-center gap-4 text-xs font-semibold uppercase tracking-wide">
            {links.filter((l) => l.href !== homeHref).map((link) => (
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
              {dict.nav.searchPlaceholder}
            </label>
            <input
              id="site-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={dict.nav.searchPlaceholder}
              className="border border-ink/30 px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-ink"
            />
          </form>
          <div className="flex gap-1" role="group" aria-label="Language / Sprache">
            {LOCALES.map((l) => (
              <a
                key={l}
                href={withLocale(pathname ?? homeHref, l)}
                aria-current={l === locale ? "true" : undefined}
                title={getDictionary(l).nav.languageName}
                className={`px-2 py-1.5 text-xs font-semibold uppercase tracking-wide border ${
                  l === locale ? "bg-ink text-paper border-ink" : "border-ink/30 text-ink/60 hover:border-ink"
                }`}
              >
                {l}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={openSavedPanel}
            className="border border-ink/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:border-ink"
          >
            {dict.nav.saved}
            {savedItems.length > 0 ? ` (${savedItems.length})` : ""}
          </button>
          <p className="hidden lg:block text-xs uppercase tracking-widest text-ink/60">{today}</p>
        </div>
      </div>

      <div className="sm:hidden border-t border-rule px-4 py-2 flex items-center gap-4 overflow-x-auto text-xs font-semibold uppercase tracking-wide">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={`shrink-0 pb-0.5 ${isActive(link.href) ? "text-ink border-b-2 border-accent" : "text-ink/60"}`}
          >
            {link.label}
          </a>
        ))}
      </div>

      <div className="md:hidden border-t border-rule px-4 py-2">
        <form onSubmit={handleSearch} role="search">
          <label htmlFor="site-search-mobile" className="sr-only">
            {dict.nav.searchPlaceholder}
          </label>
          <input
            id="site-search-mobile"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.nav.searchPlaceholder}
            className="border border-ink/30 px-3 py-1.5 text-sm w-full focus:outline-none focus:border-ink"
          />
        </form>
      </div>
    </header>
  );
}
