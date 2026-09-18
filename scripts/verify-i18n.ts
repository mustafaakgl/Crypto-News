// Manual verification for the pure locale-routing helpers
// (lib/i18n/locale.ts) — no "server-only" import, runs directly under
// plain node.
// Run with: node scripts/verify-i18n.ts
import { isLocale, localeFromPathname, withLocale, LOCALES, DEFAULT_LOCALE } from "../lib/i18n/locale.ts";
import en from "../lib/i18n/dictionaries/en.ts";
import de from "../lib/i18n/dictionaries/de.ts";

// getDictionary.ts itself isn't imported here: it uses extension-less
// relative imports (required for Next.js's own build, which cannot use
// '.ts'-suffixed specifiers), which plain `node` can't resolve directly.
// Its actual logic is a 3-line Record lookup — exercised here inline
// against the same two dictionary modules it wraps.
function getDictionary(locale: "en" | "de") {
  return locale === "de" ? de : en;
}

let failures = 0;

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

function assertTrue(cond: boolean, label: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL ${label}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

// ---- isLocale ----
{
  assertTrue(isLocale("en"), "isLocale: 'en' is a valid locale");
  assertTrue(isLocale("de"), "isLocale: 'de' is a valid locale");
  assertTrue(!isLocale("tr"), "isLocale: 'tr' is NOT a real interface locale (still just a redirect stub)");
  assertTrue(!isLocale(null), "isLocale: null is not a locale");
  assertTrue(!isLocale(undefined), "isLocale: undefined is not a locale");
  assertTrue(!isLocale(""), "isLocale: empty string is not a locale");
}

// ---- localeFromPathname ----
{
  assertEqual(localeFromPathname("/en"), "en", "localeFromPathname: '/en' -> en");
  assertEqual(localeFromPathname("/de/prices"), "de", "localeFromPathname: '/de/prices' -> de");
  assertEqual(localeFromPathname("/en/analytics/exchanges"), "en", "localeFromPathname: nested path still resolves the leading segment");
  assertEqual(localeFromPathname("/"), DEFAULT_LOCALE, "localeFromPathname: '/' falls back to the default locale, never throws");
  assertEqual(localeFromPathname("/tr"), DEFAULT_LOCALE, "localeFromPathname: '/tr' (not a real interface locale) falls back to default, not treated as its own locale");
  assertEqual(localeFromPathname(null), DEFAULT_LOCALE, "localeFromPathname: null pathname falls back to default rather than crashing");
  assertEqual(localeFromPathname(undefined), DEFAULT_LOCALE, "localeFromPathname: undefined pathname falls back to default");
}

// ---- withLocale: the language switcher's core logic ----
{
  assertEqual(withLocale("/en/prices", "de"), "/de/prices", "withLocale: swaps the leading locale segment, keeps the rest of the path");
  assertEqual(withLocale("/de/analytics/exchanges", "en"), "/en/analytics/exchanges", "withLocale: works for deeper nested paths too");
  assertEqual(withLocale("/en", "de"), "/de", "withLocale: a bare locale root swaps cleanly, no trailing slash artifact");
  assertEqual(withLocale("/", "de"), "/de", "withLocale: a path with no locale segment gets one prefixed, not double-slashed");
  assertEqual(withLocale("/tr", "de"), "/de/tr", "withLocale: a non-locale segment (like the /tr stub) is treated as an ordinary path segment and prefixed, not swapped");
}

// ---- getDictionary: both locales resolve, structurally identical shape ----
{
  const en = getDictionary("en");
  const de = getDictionary("de");
  assertEqual(en.nav.home, "Home", "getDictionary: en resolves real English text");
  assertEqual(de.nav.home, "Start", "getDictionary: de resolves real German text");
  assertEqual(Object.keys(en).sort(), Object.keys(de).sort(), "getDictionary: en and de expose the exact same top-level namespaces");
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    assertEqual(
      Object.keys(en[key]).sort(),
      Object.keys(de[key]).sort(),
      `getDictionary: namespace '${key}' has the same keys in en and de`
    );
  }
  assertEqual(LOCALES.length, 2, "LOCALES: exactly en and de are supported today");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
