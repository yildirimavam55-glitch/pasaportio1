/**
 * Admin catalogue semantics (read-only organization of existing data).
 *
 * One definition is shared by the country list counts, the expanded country
 * view and the search match labels, so they can never disagree:
 * - COUNTRY product of X  = package_kind COUNTRY and country_iso === X
 * - REGIONAL covering X   = package_kind REGION, coverage includes X, < GLOBAL threshold
 * - GLOBAL covering X     = package_kind REGION, coverage includes X, >= GLOBAL threshold
 *   (same threshold the storefront's coverage classifier uses)
 */
import { COUNTRIES, foldText, getCountryByIso } from "@/domain/geo/countries";
import { GLOBAL_COVERAGE_THRESHOLD } from "@/domain/geo/coverage-regions";

export type AdminScope = "COUNTRY" | "REGION" | "GLOBAL" | "SUBDIVISION";

export type AdminDetail = {
  country_iso?: string | null;
  package_kind?: string | null;
  coverage_country_isos?: string[] | null;
  unlimited_data?: boolean | null;
};

export function adminScopeOf(detail: AdminDetail | null | undefined): AdminScope {
  const kind = String(detail?.package_kind ?? "").toUpperCase();
  if (kind === "SUBDIVISION") return "SUBDIVISION";
  if (kind === "REGION") return (detail?.coverage_country_isos?.length ?? 0) >= GLOBAL_COVERAGE_THRESHOLD ? "GLOBAL" : "REGION";
  return "COUNTRY";
}

export type CountrySummary = { iso: string; standard: number; unlimited: number; regional: number; global: number };

export function summarizeCountries(details: AdminDetail[]): CountrySummary[] {
  const map = new Map<string, CountrySummary>();
  const get = (iso: string) => {
    let row = map.get(iso);
    if (!row) map.set(iso, (row = { iso, standard: 0, unlimited: 0, regional: 0, global: 0 }));
    return row;
  };
  for (const detail of details) {
    const scope = adminScopeOf(detail);
    if (scope === "COUNTRY" && detail.country_iso) {
      const row = get(detail.country_iso.toUpperCase());
      if (detail.unlimited_data) row.unlimited += 1;
      else row.standard += 1;
    } else if (scope === "REGION" || scope === "GLOBAL") {
      for (const iso of new Set((detail.coverage_country_isos ?? []).map((value) => value.toUpperCase()))) {
        if (scope === "GLOBAL") get(iso).global += 1;
        else get(iso).regional += 1;
      }
    }
  }
  return [...map.values()];
}

export function countryLabel(iso: string, locale = "tr"): string {
  const known = getCountryByIso(iso)?.name;
  if (known) return known[locale as "tr"] ?? known.tr;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(iso) ?? iso;
  } catch {
    return iso;
  }
}

/** Resolves a search string to a country ISO when it is an ISO code or a country name. */
export function resolveCountryQuery(search: string, knownIsos: string[]): string | null {
  const raw = search.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper) && knownIsos.includes(upper)) return upper;
  const folded = foldText(raw);
  if (folded.length < 3) return null;
  const exact = COUNTRIES.find((country) => country.aliases.includes(folded));
  if (exact && knownIsos.includes(exact.iso)) return exact.iso;
  const names = knownIsos.map((iso) => ({ iso, names: [countryLabel(iso, "tr"), countryLabel(iso, "en"), countryLabel(iso, "de")].map(foldText) }));
  const exactIntl = names.find((row) => row.names.includes(folded));
  if (exactIntl) return exactIntl.iso;
  const prefix = names.filter((row) => row.names.some((name) => name.startsWith(folded)));
  return prefix.length === 1 ? prefix[0]!.iso : null;
}

export type MatchContext = { kind: "COUNTRY" | "REGION" | "GLOBAL" | "OTHER"; label: string };

export function matchContext(detail: AdminDetail | null | undefined, iso: string): MatchContext {
  const scope = adminScopeOf(detail);
  const name = countryLabel(iso);
  if (scope === "COUNTRY" && detail?.country_iso?.toUpperCase() === iso) return { kind: "COUNTRY", label: `Ülke ürünü · ${name}` };
  if (scope === "GLOBAL") return { kind: "GLOBAL", label: `Global · ${name} kapsamda` };
  if (scope === "REGION") return { kind: "REGION", label: `Bölgesel · ${name} kapsamda` };
  return { kind: "OTHER", label: `${name} kapsamda` };
}
