import type { Locale } from "./locale";
import en from "./dictionaries/en";
import de from "./dictionaries/de";

// Widens en.ts's literal string/function types to a structural shape any
// other locale must match: same keys, same function signatures, but free
// to have different text. This is what makes `de.ts`'s `satisfies
// Dictionary` actually enforce "same shape as en", not "identical text".
type Widen<T> = T extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T extends string
    ? string
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : T extends object
        ? { [K in keyof T]: Widen<T[K]> }
        : T;

export type Dictionary = Widen<typeof en>;

const DICTIONARIES: Record<Locale, Dictionary> = { en, de };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
