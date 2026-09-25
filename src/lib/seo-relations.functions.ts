/**
 * SEO Content Relationship Engine — extends the existing guides tables.
 * Public reads return only PUBLISHED + indexable + same-language content.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit } from "@/lib/admin-guard";
import { publicClient } from "@/lib/guides.functions";
import { listEsimDestinationStartingPrices, listEsimRegionalSummaries } from "@/lib/esim-catalogue.functions";
import type { Locale } from "@/domain/enums";
import { seoPath } from "@/domain/seo/paths";
import {
  rankForCountry,
  relationFieldsOf,
  resolveCommercial,
  REL_SERVICES,
  REL_TYPES,
  type CommercialTarget,
  type LiveCatalogue,
  type RelationFields,
} from "@/domain/seo/relations";

const LOCALES: Locale[] = ["tr", "de", "en"];
const REL_COLUMNS =
  "rel_service, rel_type, country_iso, city_name, rel_region, rel_airport, rel_commercial_page, rel_esim_destination, rel_lounge, rel_vignette, show_on_commercial, auto_relation, display_priority, featured, concept_key, related_guide_ids";

let liveCache: { at: number; value: LiveCatalogue } | null = null;

/** Live, sellable catalogue targets + service kill switches. Cached briefly per worker. */
export async function loadLiveCatalogue(): Promise<LiveCatalogue> {
  if (liveCache && Date.now() - liveCache.at < 5 * 60_000) return liveCache.value;
  const client = publicClient();
  const [prices, regions, flags] = await Promise.all([
    listEsimDestinationStartingPrices().catch(() => []),
    listEsimRegionalSummaries().catch(() => []),
    client.from("feature_flags").select("key, enabled"),
  ]);
  const flag = (key: string) => Boolean((flags.data ?? []).find((f: any) => f.key === key)?.enabled);
  const value: LiveCatalogue = {
    esimCountries: new Set(prices.map((p) => p.targetId)),
    esimRegions: new Set(regions.map((r) => r.region)),
    loungeForSale: flag("storefront.lounge") && flag("checkout.lounge"),
    vignetteForSale: flag("storefront.vignette") && flag("checkout.vignette"),
  };
  liveCache = { at: Date.now(), value };
  return value;
}

/* ------------------------- Public: commercial page ------------------------- */

export type RelatedGuideCard = {
  id: string;
  title: string;
  excerpt: string | null;
  path: string;
  heroImageUrl: string | null;
  heroAlt: string | null;
  category: string | null;
  readingMinutes: number | null;
};

/** Related guides for a country eSIM commercial page, ranked by relevance; never filler. */
export const getCommercialGuides = createServerFn({ method: "GET" })
  .inputValidator((d: { locale: string; iso: string }) => ({
    locale: (LOCALES.includes(d?.locale as Locale) ? d.locale : "tr") as Locale,
    iso: String(d?.iso ?? "").toUpperCase().slice(0, 2),
  }))
  .handler(async ({ data }): Promise<RelatedGuideCard[]> => {
    if (data.iso.length !== 2) return [];
    const client = publicClient();
    const [{ data: rows, error }, live] = await Promise.all([
      client
        .from("guides")
        .select(
          `id, content_type, hero_image_url, hero_alt, reading_minutes, ${REL_COLUMNS}, guide_categories(slug, labels), guide_translations(locale, slug, title, excerpt, hero_alt, translation_status)`,
        )
        .eq("status", "PUBLISHED")
        .eq("indexable", true)
        .eq("show_on_commercial", true)
        .limit(500),
      loadLiveCatalogue(),
    ]);
    if (error) throw new Error(error.message);
    const items = ((rows ?? []) as any[]).flatMap((row) => {
      const t = (row.guide_translations ?? []).find(
        (x: any) => x.locale === data.locale && x.translation_status === "PUBLISHED" && x.slug,
      );
      if (!t) return [];
      const fields = relationFieldsOf(row);
      return [{ id: row.id as string, row, t, fields, contentType: row.content_type as string, target: resolveCommercial(fields, live) }];
    });
    return rankForCountry(items, data.iso, 4).map(({ id, row, t, contentType }) => ({
      id,
      title: t.title,
      excerpt: t.excerpt ?? null,
      path: seoPath(data.locale, contentType, t.slug),
      heroImageUrl: row.hero_image_url ?? null,
      heroAlt: t.hero_alt ?? row.hero_alt ?? null,
      category: (() => { const l = row.guide_categories?.labels?.[data.locale]; return typeof l === "string" ? l : typeof l?.name === "string" ? l.name : (row.guide_categories?.slug ?? null); })(),
      readingMinutes: row.reading_minutes ?? null,
    }));
  });

/** Guide → commercial page (reverse direction). Used by the article template. */
export async function commercialForGuide(guideId: string): Promise<{ target: CommercialTarget | null; service: string }> {
  const client = publicClient();
  const [{ data: row }, live] = await Promise.all([
    client.from("guides").select(REL_COLUMNS).eq("id", guideId).eq("status", "PUBLISHED").maybeSingle(),
    loadLiveCatalogue(),
  ]);
  if (!row) return { target: null, service: "GENERAL" };
  const fields = relationFieldsOf(row);
  return { target: resolveCommercial(fields, live), service: fields.service };
}

/* ------------------------------ Admin surface ------------------------------ */

export type AdminRelationRow = {
  id: string;
  status: string;
  indexable: boolean;
  contentType: string;
  fields: RelationFields;
  target: CommercialTarget | null;
  autoSuggestion: CommercialTarget | null;
  translations: Array<{ locale: Locale; title: string; slug: string; published: boolean; path: string; heroAlt: string }>;
  heroImageUrl: string;
};

export type AdminRelationsOverview = {
  rows: AdminRelationRow[];
  /** Sellable eSIM countries with no published guide related to them. */
  destinationsWithoutGuides: string[];
  sellableCountryCount: number;
  vignetteForSale: boolean;
  loungeForSale: boolean;
};

export const listContentRelations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminRelationsOverview> => {
    const db = await adminDb(context as any);
    liveCache = null;
    const [{ data, error }, live] = await Promise.all([
      db
        .from("guides")
        .select(`id, status, indexable, content_type, hero_image_url, ${REL_COLUMNS}, guide_translations(locale, slug, title, translation_status, hero_alt)`)
        .order("updated_at", { ascending: false })
        .limit(500),
      loadLiveCatalogue(),
    ]);
    if (error) throw new Error(error.message);
    const rows: AdminRelationRow[] = ((data ?? []) as any[]).map((row) => {
      const fields = relationFieldsOf(row);
      return {
        id: row.id,
        status: row.status,
        indexable: row.indexable !== false,
        contentType: row.content_type,
        fields,
        target: resolveCommercial(fields, live),
        autoSuggestion: resolveCommercial({ ...fields, commercialPage: "", esimDestination: "", lounge: "", vignette: "", autoRelation: true }, live),
        heroImageUrl: row.hero_image_url ?? "",
        translations: LOCALES.flatMap((locale) => {
          const t = (row.guide_translations ?? []).find((x: any) => x.locale === locale);
          return t
            ? [{ locale, title: t.title, slug: t.slug, published: t.translation_status === "PUBLISHED", path: seoPath(locale, row.content_type, t.slug), heroAlt: t.hero_alt ?? "" }]
            : [];
        }),
      };
    });
    const covered = new Set(
      rows
        .filter((r) => r.status === "PUBLISHED" && r.fields.showOnCommercial)
        .flatMap((r) => [r.fields.countryIso, r.target?.iso ?? ""])
        .filter(Boolean),
    );
    return {
      rows,
      destinationsWithoutGuides: [...live.esimCountries].filter((iso) => !covered.has(iso)).sort(),
      sellableCountryCount: live.esimCountries.size,
      vignetteForSale: live.vignetteForSale,
      loungeForSale: live.loungeForSale,
    };
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v: unknown, n: number) => String(v ?? "").replace(/<[^>]*>/g, "").trim().slice(0, n);

export const saveGuideRelations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; fields: RelationFields; heroAlts?: Partial<Record<Locale, string>> }) => d)
  .handler(async ({ data, context }) => {
    if (!UUID_RE.test(String(data.id))) throw new Error("Geçersiz içerik.");
    const db = await adminDb(context as any);
    const f = data.fields;
    const iso = clean(f.countryIso, 2).toUpperCase();
    const page = clean(f.commercialPage, 200);
    const payload = {
      rel_service: (REL_SERVICES as readonly string[]).includes(f.service) ? f.service : "GENERAL",
      rel_type: (REL_TYPES as readonly string[]).includes(f.relType) ? f.relType : "GENERAL",
      country_iso: iso.length === 2 ? iso : null,
      city_name: clean(f.cityName, 120) || null,
      rel_region: clean(f.region, 20).toUpperCase() || null,
      rel_airport: clean(f.airport, 3).toUpperCase() || null,
      rel_commercial_page: page.startsWith("/") && !page.startsWith("//") ? page : null,
      rel_esim_destination: clean(f.esimDestination, 20).toUpperCase() || null,
      rel_lounge: clean(f.lounge, 120) || null,
      rel_vignette: clean(f.vignette, 2).toUpperCase() || null,
      show_on_commercial: f.showOnCommercial !== false,
      auto_relation: f.autoRelation !== false,
      display_priority: Math.max(-999, Math.min(999, Math.round(Number(f.displayPriority) || 0))),
      featured: Boolean(f.featured),
      concept_key: clean(f.conceptKey, 80) || null,
      related_guide_ids: (f.relatedGuideIds ?? []).filter((id) => UUID_RE.test(id) && id !== data.id).slice(0, 20),
    };
    const { data: before } = await db.from("guides").select(REL_COLUMNS).eq("id", data.id).maybeSingle();
    const { error } = await db.from("guides").update(payload).eq("id", data.id);
    if (error) throw new Error(error.message);
    for (const locale of LOCALES) {
      const alt = data.heroAlts?.[locale];
      if (alt === undefined) continue;
      await db.from("guide_translations").update({ hero_alt: clean(alt, 200) || null }).eq("guide_id", data.id).eq("locale", locale);
    }
    await audit(db, "seo.relations.save", "guide", data.id, before ?? null, payload);
    liveCache = null;
    return { ok: true };
  });
