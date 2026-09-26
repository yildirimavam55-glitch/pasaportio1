import { COUNTRIES, foldText, getCountryByIso } from "./countries";
import { COVERAGE_REGION_LABELS } from "./coverage-regions";
import type { Locale } from "@/domain/enums";
import type { EsimRegionalSummary } from "@/lib/esim-catalogue.functions";
import { LOCALE_REGISTRY, UI_LOCALES } from "@/i18n/locales";

const normalize = (text: string) => text.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const matches = (name: string, query: string) => normalize(name).includes(query) || (foldText(query).length > 0 && foldText(name).includes(foldText(query)));
const displayNames = UI_LOCALES.map((ui) => {
  try { return new Intl.DisplayNames([LOCALE_REGISTRY[ui].bcp47], { type: "region" }); } catch { return null; }
}).filter((value): value is Intl.DisplayNames => value !== null);

/** Rankings use only the coverage ISOs of real published eligible products. */
export function searchPublishedRegions(items: EsimRegionalSummary[], query: string, locale: Locale) {
  const needle = normalize(query);
  if (!needle) return items;
  const namesFor = (iso: string) => { const country = getCountryByIso(iso); return country ? [country.name[locale], ...country.aliases, ...displayNames.flatMap((names) => names.of(iso) ?? [])] : []; };
  const matchingCountries = COUNTRIES.filter((country) => namesFor(country.iso).some((name) => matches(name, needle)));
  return items.map((item) => {
    const regionName = COVERAGE_REGION_LABELS[item.region][locale];
    const regionNames = Object.values(COVERAGE_REGION_LABELS[item.region]);
    const countryNames = matchingCountries.filter((country) => item.coverageIsos.includes(country.iso));
    let rank = 99;
    if (regionNames.some((name) => normalize(name) === needle)) rank = 0;
    else if (regionNames.some((name) => normalize(name).startsWith(needle))) rank = 1;
    else if (countryNames.some((country) => namesFor(country.iso).some((name) => normalize(name) === needle))) rank = 2;
    else if (countryNames.length) rank = 3;
    else if (regionNames.some((name) => matches(name, needle))) rank = 4;
    return { item, rank, regionName };
  }).filter(({ rank }) => rank < 99).sort((a, b) => a.rank - b.rank || a.regionName.localeCompare(b.regionName)).map(({ item }) => item);
}

export function coverageNames(isos: string[], locale: Locale) {
  return isos.map((iso) => getCountryByIso(iso)?.name[locale] ?? iso).sort((a, b) => a.localeCompare(b));
}