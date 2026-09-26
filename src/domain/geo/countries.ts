import type { Locale } from "@/domain/enums";
import { COUNTRY_ROWS, POPULAR_COUNTRY_ISOS } from "./country-data";

export type GeoRegion = "EUROPE" | "ASIA" | "AMERICAS" | "AFRICA" | "OCEANIA";

export type Country = {
  id: string;
  iso: string;
  flag: string;
  region: GeoRegion;
  name: Record<Locale, string>;
  aliases: string[];
};

export const REGION_LABELS: Record<GeoRegion, Record<Locale, string>> = {
  EUROPE: { tr: "Avrupa", de: "Europa", en: "Europe" },
  ASIA: { tr: "Asya", de: "Asien", en: "Asia" },
  AMERICAS: { tr: "Amerika", de: "Amerika", en: "Americas" },
  AFRICA: { tr: "Afrika", de: "Afrika", en: "Africa" },
  OCEANIA: { tr: "Okyanusya", de: "Ozeanien", en: "Oceania" },
};

export function flagOf(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join("");
}

/** Lowercases and strips accents/diacritics so "Türkiye", "turkiye" and "TURKIYE" all match. */
export function foldText(value: string): string {
  return value
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EXTRA_ALIASES: Record<string, string[]> = {
  TR: ["turkey", "turkiye", "türkei"],
  US: ["abd", "usa", "america", "vereinigte staaten"],
  GB: ["uk", "england", "britain", "ingiltere"],
  DE: ["germany", "deutschland", "almanya", "brd"],
  NL: ["holland", "hollanda", "niederlande"],
  AE: ["dubai", "uae", "bae", "emirates"],
  CH: ["swiss", "isvicre", "schweiz"],
  GR: ["greece", "yunanistan", "griechenland"],
  JP: ["japan", "japonya", "nippon"],
  KR: ["south korea", "güney kore", "südkorea"],
  CZ: ["czech republic", "cekya", "tschechien"],
  MK: ["macedonia", "makedonya"],
  XK: ["kosovo", "kosova"],
};

export const COUNTRIES: Country[] = COUNTRY_ROWS.map((row) => {
  const [iso = "", region = "EUROPE", tr = "", de = "", en = ""] = row.split("|");
  return {
    id: `country-${iso.toLowerCase()}`,
    iso,
    flag: flagOf(iso),
    region: region as GeoRegion,
    name: { tr, de, en },
    aliases: [tr, de, en, iso, ...(EXTRA_ALIASES[iso] ?? [])].map(foldText),
  };
}).sort((a, b) => a.name.tr.localeCompare(b.name.tr, "tr"));

const BY_ID = new Map(COUNTRIES.map((country) => [country.id, country]));
const BY_ISO = new Map(COUNTRIES.map((country) => [country.iso, country]));

export function getCountry(id: string | null | undefined): Country | undefined {
  return id ? BY_ID.get(id) : undefined;
}
export function getCountryByIso(iso: string | null | undefined): Country | undefined {
  return iso ? BY_ISO.get(iso.toUpperCase()) : undefined;
}
export function countryName(id: string | null | undefined, locale: Locale): string {
  const country = getCountry(id);
  return country ? (country.name[locale] || country.name.tr) : "";
}
export const POPULAR_COUNTRIES: Country[] = POPULAR_COUNTRY_ISOS.flatMap((iso) => {
  const country = BY_ISO.get(iso);
  return country ? [country] : [];
});

/**
 * Relevance tiers (lower wins): exact localized name, exact other name/alias,
 * localized prefix, other prefix, ISO code, word prefix, substring, compact
 * fuzzy. Two-letter queries treat an exact ISO code as near-exact.
 * Ties prefer names whose original spelling (with diacritics) matches what was
 * typed, then the shorter matched name, then the existing alphabetical order.
 */
export function searchCountries(query: string, limit = 60, locale: Locale = "tr"): Country[] {
  const needle = foldText(query);
  if (!needle) return COUNTRIES.slice(0, limit);
  const raw = query.trim().toLocaleLowerCase(locale);
  const compact = needle.replace(/ /g, "");
  const scored: Array<{ country: Country; tier: number; exactSpelling: number; length: number; index: number }> = [];
  COUNTRIES.forEach((country, index) => {
    const localized = foldText(country.name[locale] || country.name.tr);
    const iso = country.iso.toLowerCase();
    let best: { tier: number; length: number } | null = null;
    const consider = (tier: number, length: number) => {
      if (!best || tier < best.tier || (tier === best.tier && length < best.length)) best = { tier, length };
    };
    for (const alias of country.aliases) {
      const isLocal = alias === localized;
      if (alias === iso) { if (alias === needle) consider(needle.length === 2 ? 1 : 4, alias.length); continue; }
      if (alias === needle) consider(isLocal ? 0 : 1, alias.length);
      else if (alias.startsWith(needle)) consider(isLocal ? 2 : 3, alias.length);
      else if (alias.split(" ").some((word) => word.startsWith(needle))) consider(5, alias.length);
      else if (alias.includes(needle)) consider(6, alias.length);
      else if (compact.length >= 3 && alias.replace(/ /g, "").includes(compact)) consider(7, alias.length);
    }
    if (!best) return;
    const names = [country.name[locale], country.name.tr, country.name.de, country.name.en];
    const exactSpelling = raw && names.some((name) => name?.toLocaleLowerCase(locale).startsWith(raw)) ? 0 : 1;
    const found = best as { tier: number; length: number };
    scored.push({ country, tier: found.tier, exactSpelling, length: found.length, index });
  });
  return scored
    .sort((a, b) => a.tier - b.tier || a.exactSpelling - b.exactSpelling || a.length - b.length || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.country);
}

export function countriesByRegion(region: GeoRegion): Country[] {
  return COUNTRIES.filter((country) => country.region === region);
}
