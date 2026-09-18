// The site's interface language — separate from the actual DATA it shows.
// News articles (CoinDesk/Decrypt), exchange names, coin tickers, and other
// content fetched from external sources stay in whatever language THEY were
// published in (almost always English) regardless of the interface locale;
// only this app's own static chrome (labels, headings, methodology copy) is
// ever translated. "tr" is intentionally not a real interface locale yet —
// app/tr/page.tsx still just redirects to /en.
export const LOCALES = ["en", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "de";
}

// Given a pathname like "/en/prices" or "/de", returns its leading locale
// segment — defaulting to "en" for anything that isn't a real locale
// segment (e.g. "/", "/tr", an unrecognized path) rather than throwing.
export function localeFromPathname(pathname: string | null | undefined): Locale {
  const segment = pathname?.split("/")[1];
  return isLocale(segment) ? segment : DEFAULT_LOCALE;
}

// Swaps a pathname's leading locale segment for a different one, preserving
// the rest of the path — used by the language switcher so toggling locale
// keeps the visitor on the equivalent page rather than bouncing them home.
export function withLocale(pathname: string, locale: Locale): string {
  const parts = pathname.split("/");
  if (isLocale(parts[1])) {
    parts[1] = locale;
    const joined = parts.join("/");
    return joined === "" ? `/${locale}` : joined;
  }
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}
