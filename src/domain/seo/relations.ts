/**
 * SEO content ↔ commercial page relationships. Pure logic, shared by the
 * public storefront and Admin so both always agree. Nothing here invents a
 * destination: a commercial link is only produced for a target the live
 * catalogue actually sells (or a service whose kill switch allows it).
 */
import { regionOfCountry, type CoverageRegionKey } from "@/domain/geo/coverage-regions";

export const REL_SERVICES = ["ESIM", "LOUNGE", "VIGNETTE", "GENERAL"] as const;
export type RelService = (typeof REL_SERVICES)[number];
export const REL_TYPES = ["COUNTRY", "CITY", "REGION", "AIRPORT", "ROUTE", "GENERAL"] as const;
export type RelType = (typeof REL_TYPES)[number];
export const REL_REGIONS = ["EUROPE", "MIDDLE_EAST", "ASIA", "AMERICAS", "AFRICA", "OCEANIA", "GLOBAL"] as const;

export type RelationFields = {
  service: RelService;
  relType: RelType;
  countryIso: string;
  cityName: string;
  region: string;
  airport: string;
  commercialPage: string;
  esimDestination: string;
  lounge: string;
  vignette: string;
  showOnCommercial: boolean;
  autoRelation: boolean;
  displayPriority: number;
  featured: boolean;
  conceptKey: string;
  relatedGuideIds: string[];
};

export type LiveCatalogue = {
  /** ISO codes with at least one sellable, published country eSIM. */
  esimCountries: Set<string>;
  /** Regions with at least one sellable regional eSIM. */
  esimRegions: Set<string>;
  loungeForSale: boolean;
  vignetteForSale: boolean;
};

export type CommercialTarget = {
  path: string;
  kind: "ESIM_COUNTRY" | "ESIM_REGION" | "LOUNGE" | "VIGNETTE" | "PAGE";
  iso?: string;
  region?: string;
  source: "manual" | "auto";
};

export function relationFieldsOf(row: any): RelationFields {
  const up = (v: unknown, n: number) => String(v ?? "").trim().toUpperCase().slice(0, n);
  return {
    service: (REL_SERVICES as readonly string[]).includes(row?.rel_service) ? row.rel_service : "GENERAL",
    relType: (REL_TYPES as readonly string[]).includes(row?.rel_type) ? row.rel_type : "GENERAL",
    countryIso: up(row?.country_iso, 2),
    cityName: String(row?.city_name ?? ""),
    region: up(row?.rel_region, 20),
    airport: up(row?.rel_airport, 3),
    commercialPage: String(row?.rel_commercial_page ?? ""),
    esimDestination: up(row?.rel_esim_destination, 20),
    lounge: String(row?.rel_lounge ?? ""),
    vignette: up(row?.rel_vignette, 2),
    showOnCommercial: row?.show_on_commercial !== false,
    autoRelation: row?.auto_relation !== false,
    displayPriority: Number(row?.display_priority ?? 0) || 0,
    featured: Boolean(row?.featured),
    conceptKey: String(row?.concept_key ?? ""),
    relatedGuideIds: Array.isArray(row?.related_guide_ids) ? row.related_guide_ids : [],
  };
}

function esimTarget(code: string, live: LiveCatalogue, source: CommercialTarget["source"]): CommercialTarget | null {
  if (!code) return null;
  if (code.length === 2 && live.esimCountries.has(code)) return { path: `/esim?country=${code}`, kind: "ESIM_COUNTRY", iso: code, source };
  if (code.length > 2 && live.esimRegions.has(code)) return { path: `/esim/bolge/${code}`, kind: "ESIM_REGION", region: code, source };
  return null;
}

/** Manual fields always win over automatic matching. Unsellable targets resolve to null. */
export function resolveCommercial(f: RelationFields, live: LiveCatalogue): CommercialTarget | null {
  const page = f.commercialPage.trim();
  if (page.startsWith("/") && !page.startsWith("//")) {
    if (page.startsWith("/vignette") && !live.vignetteForSale) return null;
    return { path: page, kind: "PAGE", source: "manual" };
  }
  if (f.service === "ESIM" || f.service === "GENERAL") {
    const manual = esimTarget(f.esimDestination, live, "manual");
    if (manual) return manual;
    if (f.esimDestination) return null;
  }
  if (f.service === "LOUNGE" && live.loungeForSale && (f.lounge || (f.autoRelation && f.airport))) {
    return { path: "/lounge", kind: "LOUNGE", source: f.lounge ? "manual" : "auto" };
  }
  if (f.service === "VIGNETTE") {
    if (!live.vignetteForSale) return null;
    if (f.vignette || f.autoRelation) { const iso = f.vignette || f.countryIso; return { path: "/vignette", kind: "VIGNETTE", ...(iso ? { iso } : {}), source: f.vignette ? "manual" : "auto" }; }
    return null;
  }
  if (f.service !== "ESIM" || !f.autoRelation) return null;
  return esimTarget(f.countryIso, live, "auto") ?? esimTarget(f.region, live, "auto");
}

export type RankInput = { id: string; fields: RelationFields; contentType: string; target: CommercialTarget | null };

/**
 * Relevance tier for a country eSIM page; null = not relevant (never shown).
 * 1 same country + ESIM + featured, 2 same country + ESIM, 3 city in that
 * country, 4 relevant region, 5 globally useful ESIM guide.
 */
export function relevanceTier(item: RankInput, iso: string): number | null {
  const f = item.fields;
  if (!f.showOnCommercial || item.contentType === "DESTINATION") return null;
  const linkedIso = item.target?.iso === iso;
  const sameCountry = f.countryIso === iso || linkedIso;
  const esim = f.service === "ESIM";
  if (sameCountry && esim && f.relType !== "CITY" && item.contentType !== "CITY") return f.featured ? 1 : 2;
  if (sameCountry && (f.relType === "CITY" || item.contentType === "CITY")) return 3;
  if (sameCountry && f.service === "GENERAL") return 3;
  const region: CoverageRegionKey = regionOfCountry(iso);
  if (esim && f.region && (f.region === region || item.target?.region === region) && !f.countryIso) return 4;
  if (esim && f.relType === "GENERAL" && !f.countryIso && !f.region) return 5;
  return null;
}

export function rankForCountry<T extends RankInput>(items: T[], iso: string, limit = 4): T[] {
  return items
    .map((item) => ({ item, tier: relevanceTier(item, iso) }))
    .filter((x): x is { item: T; tier: number } => x.tier != null)
    .sort((a, b) => a.tier - b.tier || b.item.fields.displayPriority - a.item.fields.displayPriority)
    .slice(0, limit)
    .map((x) => x.item);
}
