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

export function searchCountries(query: string, limit = 60): Country[] {
  const needle = foldText(query);
  if (!needle) return COUNTRIES.slice(0, limit);
  const scored: Array<{ country: Country; score: number }> = [];
  for (const country of COUNTRIES) {
    let score = Infinity;
    for (const alias of country.aliases) {
      if (alias === needle) score = Math.min(score, 0);
      else if (alias.startsWith(needle)) score = Math.min(score, 1);
      else if (alias.includes(needle)) score = Math.min(score, 2);
    }
    if (score !== Infinity) scored.push({ country, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.country.name.tr.localeCompare(b.country.name.tr, "tr"))
    .slice(0, limit)
    .map((entry) => entry.country);
}

export function countriesByRegion(region: GeoRegion): Country[] {
  return COUNTRIES.filter((country) => country.region === region);
}
