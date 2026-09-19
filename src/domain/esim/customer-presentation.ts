import type { Locale } from "@/domain/enums";
import { getCountryByIso } from "@/domain/geo/countries";

/**
 * Restores commercial whole-GB bundle sizes that were previously converted
 * from decimal provider MB with a binary divisor (for example 5000 MB → 4.88).
 * Non-whole commercial sizes are preserved unchanged.
 */
export function commercialDataGb(value: number | null): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return value;
  const restored = value * 1.024;
  const whole = Math.round(restored);
  return Math.abs(restored - whole) <= 0.03 && Math.abs(value - whole) >= 0.03 ? whole : value;
}

export function customerPackageTitle(input: {
  locale: Locale;
  destinationIso?: string;
  routeIsos?: string[];
  coverage: string[];
}): string {
  if ((input.routeIsos?.length ?? 0) > 1) {
    if (input.locale === "de") return "eSIM für deine Route";
    if (input.locale === "en") return "Route eSIM";
    return "Rotan için eSIM";
  }
  const iso = input.destinationIso || (input.coverage.length === 1 ? input.coverage[0] : "");
  const country = getCountryByIso(iso);
  if (country) return `${country.name[input.locale]} eSIM`;
  if (input.locale === "de") return "Reise-eSIM";
  if (input.locale === "en") return "Travel eSIM";
  return "Seyahat eSIM’i";
}

export function formatSalePrice(amount: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency,
  }).format(amount);
}