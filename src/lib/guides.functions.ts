/**
 * Travely Guides — product-independent travel content platform.
 *
 * A guide is travel content first: it can relate to many countries, cities,
 * airports, road routes and services at once. Commerce CTAs are never
 * hard-coded: a service card only appears when the service is enabled AND the
 * live catalogue actually has a published, sellable product for that context.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit } from "@/lib/admin-guard";
import { isTestCatalogueVisible } from "@/lib/test-catalogue.functions";
import type { Locale } from "@/domain/enums";

export type GuideContentType =
  | "GUIDE"
  | "DESTINATION"
  | "HOW_TO"
  | "COMPARISON"
  | "ROAD_TRIP"
  | "AIRPORT_GUIDE"
  | "VIGNETTE_GUIDE";

export type GuideRelationType =
  | "COUNTRY"
  | "REGION"
  | "CITY"
  | "AIRPORT"
  | "ROUTE"
  | "SERVICE"
  | "PRODUCT";

export type GuideCategory = {
  id: string;
  slug: string;
  icon: string;
  sortOrder: number;
  name: string;
};

export type GuideRelation = {
  type: GuideRelationType;
  countryIso: string | null;
  cityName: string | null;
  airportIata: string | null;
  routeSlug: string | null;
  routeLabel: string | null;
  routeIsos: string[];
  serviceType: string | null;
  productId: string | null;
  ctaEnabled: boolean;
};

export type GuideSection = { heading: string; body: string };
export type GuideFaq = { question: string; answer: string };

export type GuideListItem = {
  id: string;
  slug: string;
  categorySlug: string | null;
  categoryName: string | null;
  contentType: GuideContentType;
  title: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  heroAlt: string | null;
  readingMinutes: number | null;
  publishedAt: string | null;
  updatedAt: string;
  featured: boolean;
  countryIsos: string[];
  airportIatas: string[];
  serviceTypes: string[];
};

/** A commerce card offered only when a real published product backs it. */
export type GuideServiceOffer = {
  serviceType: "ESIM" | "LOUNGE";
  scope: "COUNTRY" | "AIRPORT" | "ROUTE";
  code: string;
  label: string | null;
  routeIsos: string[];
  productCount: number;
  amount: number;
  currency: string;
};

export type GuideRouteStop = {
  countryIso: string;
  offers: GuideServiceOffer[];
};

export type GuideDetail = GuideListItem & {
  intro: string | null;
  sections: GuideSection[];
  faq: GuideFaq[];
  seoTitle: string | null;
  seoDescription: string | null;
  localeSlugs: Partial<Record<Locale, string>>;
  relations: GuideRelation[];
  offers: GuideServiceOffer[];
  routeStops: GuideRouteStop[];
};

export type GuideHub = {
  categories: GuideCategory[];
  guides: GuideListItem[];
};

export type GuideDestinationHub = {
  countryIso: string;
  guides: GuideListItem[];
  offers: GuideServiceOffer[];
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const LOCALES: Locale[] = ["tr", "de", "en"];

function normalizeLocale(value: unknown): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : "tr";
}

function labelOf(labels: any, locale: Locale, fallback: string) {
  const dict = labels && typeof labels === "object" ? labels : {};
  return (
    dict?.[locale]?.name ?? dict?.["tr"]?.name ?? dict?.["en"]?.name ?? fallback
  );
}

function routeLabelOf(labels: any, fallback: string) {
  const dict = labels && typeof labels === "object" ? labels : {};
  return dict?.tr?.name ?? dict?.en?.name ?? dict?.de?.name ?? fallback;
}

function sectionsOf(value: unknown): GuideSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row: any) => ({ heading: String(row?.heading ?? ""), body: String(row?.body ?? "") }))
    .filter((row) => row.heading || row.body);
}

function faqOf(value: unknown): GuideFaq[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row: any) => ({ question: String(row?.question ?? ""), answer: String(row?.answer ?? "") }))
    .filter((row) => row.question && row.answer);
}

function relationsOf(rows: any[]): GuideRelation[] {
  return rows.map((row) => ({
    type: row.relation_type as GuideRelationType,
    countryIso: row.country_iso ? String(row.country_iso).toUpperCase() : null,
    cityName: row.city_name ?? null,
    airportIata: row.airport_iata ? String(row.airport_iata).toUpperCase() : null,
    routeSlug: row.guide_routes?.slug ?? null,
    routeLabel: row.guide_routes?.slug ? routeLabelOf(row.guide_routes?.labels, row.guide_routes.slug) : null,
    routeIsos: Array.isArray(row.guide_routes?.country_isos)
      ? row.guide_routes.country_isos.map((iso: string) => String(iso).toUpperCase()).filter(Boolean)
      : [],
    serviceType: row.service_type ?? null,
    productId: row.product_id ?? null,
    ctaEnabled: row.cta_enabled !== false,
  }));
}

const GUIDE_SELECT =
  "id, slug, content_type, status, published_at, updated_at, featured, sort_order, hero_image_url, hero_alt, reading_minutes, " +
  "guide_categories(slug, labels), " +
  "guide_translations(locale, slug, title, excerpt, intro, sections, faq, seo_title, seo_description, translation_status), " +
  "guide_relations(relation_type, country_iso, city_name, airport_iata, service_type, product_id, cta_enabled, sort_order, guide_routes(slug, labels, country_isos))";

function pickTranslation(row: any, locale: Locale) {
  const published = (row.guide_translations ?? []).filter(
    (t: any) => t.translation_status === "PUBLISHED",
  );
  return (
    published.find((t: any) => t.locale === locale) ??
    published.find((t: any) => t.locale === "tr") ??
    published.find((t: any) => t.locale === "en") ??
    null
  );
}

function toListItem(row: any, locale: Locale): GuideListItem | null {
  const translation = pickTranslation(row, locale);
  if (!translation) return null;
  const relations = relationsOf(row.guide_relations ?? []);
  return {
    id: row.id,
    slug: translation.slug,
    categorySlug: row.guide_categories?.slug ?? null,
    categoryName: row.guide_categories
      ? labelOf(row.guide_categories.labels, locale, row.guide_categories.slug)
      : null,
    contentType: row.content_type as GuideContentType,
    title: translation.title,
    excerpt: translation.excerpt ?? null,
    heroImageUrl: row.hero_image_url ?? null,
    heroAlt: row.hero_alt ?? null,
    readingMinutes: row.reading_minutes ?? null,
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at,
    featured: Boolean(row.featured),
    countryIsos: [...new Set(relations.filter((r) => r.countryIso).map((r) => r.countryIso!))],
    airportIatas: [...new Set(relations.filter((r) => r.airportIata).map((r) => r.airportIata!))],
    serviceTypes: [...new Set(relations.filter((r) => r.serviceType).map((r) => r.serviceType!))],
  };
}

function sortGuides(items: GuideListItem[]) {
  return items.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return String(b.publishedAt ?? b.updatedAt).localeCompare(String(a.publishedAt ?? a.updatedAt));
  });
}

/** Services that are switched on for customers right now. */
async function enabledServices(client: ReturnType<typeof publicClient>) {
  const { data } = await client
    .from("services")
    .select("service_type, enabled, customer_visible");
  return new Set(
    (data ?? [])
      .filter((row: any) => row.enabled && row.customer_visible)
      .map((row: any) => row.service_type as string),
  );
}

/** Real minimum sellable eSIM price per requested country ISO. */
async function esimOffers(
  client: ReturnType<typeof publicClient>,
  isos: string[],
  showTest: boolean,
): Promise<GuideServiceOffer[]> {
  if (!isos.length) return [];
  const offers = new Map<string, GuideServiceOffer>();
  for (const iso of isos) {
    const { data, error } = await client
      .from("service_products")
      .select("currency, sale_price, is_test, esim_product_details!inner(coverage_country_isos)")
      .eq("service_type", "ESIM")
      .eq("lifecycle", "PUBLISHED")
      .eq("customer_visible", true)
      .eq("provider_available", true)
      .eq("margin_flagged", false)
      .gt("sale_price", 0)
      .filter("esim_product_details.coverage_country_isos", "cs", `{${iso}}`)
      .limit(400);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as any[]) {
      if (row.is_test && !showTest) continue;
      const amount = Number(row.sale_price);
      if (!Number.isFinite(amount)) continue;
      const current = offers.get(iso);
      if (!current) {
        offers.set(iso, {
          serviceType: "ESIM",
          scope: "COUNTRY",
          code: iso,
          label: null,
          routeIsos: [],
          productCount: 1,
          amount,
          currency: row.currency ?? "EUR",
        });
      } else {
        current.productCount += 1;
        if (amount < current.amount) {
          current.amount = amount;
          current.currency = row.currency ?? current.currency;
        }
      }
    }
  }
  return [...offers.values()];
}

async function routeEsimOffers(
  client: ReturnType<typeof publicClient>,
  routes: Array<{ slug: string; label: string | null; countryIsos: string[] }>,
  showTest: boolean,
): Promise<GuideServiceOffer[]> {
  if (!routes.length) return [];
  const offers: GuideServiceOffer[] = [];
  for (const route of routes) {
    if (!route.countryIsos.length) continue;
    const { data, error } = await client
      .from("service_products")
      .select("currency, sale_price, is_test, esim_product_details!inner(coverage_country_isos)")
      .eq("service_type", "ESIM")
      .eq("lifecycle", "PUBLISHED")
      .eq("customer_visible", true)
      .eq("provider_available", true)
      .eq("margin_flagged", false)
      .gt("sale_price", 0)
      .contains("esim_product_details.coverage_country_isos", route.countryIsos)
      .limit(400);
    if (error) throw new Error(error.message);
    let productCount = 0;
    let amount = Number.POSITIVE_INFINITY;
    let currency = "EUR";
    for (const row of (data ?? []) as any[]) {
      if (row.is_test && !showTest) continue;
      const salePrice = Number(row.sale_price);
      if (!Number.isFinite(salePrice)) continue;
      productCount += 1;
      if (salePrice < amount) {
        amount = salePrice;
        currency = row.currency ?? currency;
      }
    }
    if (productCount > 0 && Number.isFinite(amount)) {
      offers.push({
        serviceType: "ESIM",
        scope: "ROUTE",
        code: route.slug,
        label: route.label,
        routeIsos: route.countryIsos,
        productCount,
        amount,
        currency,
      });
    }
  }
  return offers;
}

/** Real minimum sellable lounge price per requested airport IATA. */
async function loungeOffers(
  client: ReturnType<typeof publicClient>,
  iatas: string[],
  showTest: boolean,
): Promise<GuideServiceOffer[]> {
  if (!iatas.length) return [];
  const { data, error } = await client
    .from("service_products")
    .select("currency, sale_price, is_test, lounge_product_details!inner(iata)")
    .eq("service_type", "LOUNGE")
    .eq("lifecycle", "PUBLISHED")
    .eq("customer_visible", true)
    .eq("provider_available", true)
    .gt("sale_price", 0)
    .limit(600);
  if (error) throw new Error(error.message);
  const wanted = new Set(iatas);
  const offers = new Map<string, GuideServiceOffer>();
  for (const row of (data ?? []) as any[]) {
    if (row.is_test && !showTest) continue;
    const details = Array.isArray(row.lounge_product_details)
      ? row.lounge_product_details[0]
      : row.lounge_product_details;
    const iata = details?.iata ? String(details.iata).toUpperCase() : null;
    if (!iata || !wanted.has(iata)) continue;
    const amount = Number(row.sale_price);
    if (!Number.isFinite(amount)) continue;
    const current = offers.get(iata);
    if (!current) {
      offers.set(iata, {
        serviceType: "LOUNGE",
        scope: "AIRPORT",
        code: iata,
        label: null,
        routeIsos: [],
        productCount: 1,
        amount,
        currency: row.currency ?? "EUR",
      });
    } else {
      current.productCount += 1;
      if (amount < current.amount) {
        current.amount = amount;
        current.currency = row.currency ?? current.currency;
      }
    }
  }
  return [...offers.values()];
}

/**
 * Contextual commerce resolution: only services that are switched on and that
 * genuinely have published products for the guide's own countries/airports.
 */
async function resolveOffers(
  client: ReturnType<typeof publicClient>,
  countryIsos: string[],
  airportIatas: string[],
  routeTargets: Array<{ slug: string; label: string | null; countryIsos: string[] }> = [],
): Promise<GuideServiceOffer[]> {
  const [services, showTest] = await Promise.all([
    enabledServices(client),
    isTestCatalogueVisible(),
  ]);
  const result: GuideServiceOffer[] = [];
  if (services.has("ESIM")) {
    result.push(...(await routeEsimOffers(client, routeTargets, showTest)));
    result.push(...(await esimOffers(client, countryIsos, showTest)));
  }
  if (services.has("LOUNGE")) result.push(...(await loungeOffers(client, airportIatas, showTest)));
  return result;
}

/** Public hub: active categories plus every published guide for the locale. */
export const getGuideHub = createServerFn({ method: "GET" })
  .inputValidator((data: { locale?: string } | undefined) => ({
    locale: normalizeLocale(data?.locale),
  }))
  .handler(async ({ data }): Promise<GuideHub> => {
    const client = publicClient();
    const [categoriesResult, guidesResult] = await Promise.all([
      client
        .from("guide_categories")
        .select("id, slug, icon, sort_order, labels")
        .eq("active", true)
        .order("sort_order"),
      client.from("guides").select(GUIDE_SELECT).eq("status", "PUBLISHED").limit(300),
    ]);
    if (categoriesResult.error) throw new Error(categoriesResult.error.message);
    if (guidesResult.error) throw new Error(guidesResult.error.message);

    const categories: GuideCategory[] = (categoriesResult.data ?? []).map((row: any) => ({
      id: row.id,
      slug: row.slug,
      icon: row.icon,
      sortOrder: row.sort_order,
      name: labelOf(row.labels, data.locale, row.slug),
    }));

    const guides = sortGuides(
      (guidesResult.data ?? [])
        .map((row: any) => toListItem(row, data.locale))
        .filter((item): item is GuideListItem => Boolean(item)),
    );

    return { categories, guides };
  });

/** Homepage strip: featured guides only, never auto-filled with thin content. */
export const listFeaturedGuides = createServerFn({ method: "GET" })
  .inputValidator((data: { locale?: string; limit?: number } | undefined) => ({
    locale: normalizeLocale(data?.locale),
    limit: Math.min(Math.max(Number(data?.limit ?? 3), 1), 6),
  }))
  .handler(async ({ data }): Promise<GuideListItem[]> => {
    const { data: rows, error } = await publicClient()
      .from("guides")
      .select(GUIDE_SELECT)
      .eq("status", "PUBLISHED")
      .eq("featured", true)
      .order("sort_order")
      .limit(24);
    if (error) throw new Error(error.message);
    return sortGuides(
      (rows ?? [])
        .map((row: any) => toListItem(row, data.locale))
        .filter((item): item is GuideListItem => Boolean(item)),
    ).slice(0, data.limit);
  });

/** One guide by its localized slug, with contextual service offers. */
export const getGuideBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { locale?: string; slug: string }) => ({
    locale: normalizeLocale(data?.locale),
    slug: String(data?.slug ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data }): Promise<GuideDetail | null> => {
    if (!data.slug) return null;
    const client = publicClient();
    const { data: match, error: matchError } = await client
      .from("guide_translations")
      .select("guide_id")
      .eq("slug", data.slug)
      .eq("translation_status", "PUBLISHED")
      .limit(1)
      .maybeSingle();
    if (matchError) throw new Error(matchError.message);
    if (!match) return null;

    const { data: row, error } = await client
      .from("guides")
      .select(GUIDE_SELECT)
      .eq("id", match.guide_id)
      .eq("status", "PUBLISHED")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const base = toListItem(row, data.locale);
    if (!base) return null;
    const translation = pickTranslation(row, data.locale)!;
    const relations = relationsOf((row as any).guide_relations ?? []);
    const ctaCountries = [
      ...new Set(relations.filter((r) => r.countryIso && r.ctaEnabled).map((r) => r.countryIso!)),
    ];
    const ctaAirports = [
      ...new Set(relations.filter((r) => r.airportIata && r.ctaEnabled).map((r) => r.airportIata!)),
    ];
    const routeTargets = relations
      .filter((r) => r.type === "ROUTE" && r.routeSlug && r.routeIsos.length && r.ctaEnabled)
      .map((r) => ({ slug: r.routeSlug!, label: r.routeLabel, countryIsos: r.routeIsos }));
    const offers = await resolveOffers(client, ctaCountries, ctaAirports, routeTargets);

    const localeSlugs: Partial<Record<Locale, string>> = {};
    for (const t of ((row as any).guide_translations ?? []) as any[]) {
      if (t.translation_status === "PUBLISHED") localeSlugs[t.locale as Locale] = t.slug;
    }

    const routeStops: GuideRouteStop[] =
      base.contentType === "ROAD_TRIP"
        ? relations
            .filter((r) => r.type === "COUNTRY" && r.countryIso)
            .map((r) => ({
              countryIso: r.countryIso!,
              offers: offers.filter((o) => o.scope === "COUNTRY" && o.code === r.countryIso),
            }))
        : [];

    return {
      ...base,
      intro: translation.intro ?? null,
      sections: sectionsOf(translation.sections),
      faq: faqOf(translation.faq),
      seoTitle: translation.seo_title ?? null,
      seoDescription: translation.seo_description ?? null,
      localeSlugs,
      relations,
      offers,
      routeStops,
    };
  });

/** Country hub: every published guide that mentions the country + real offers. */
export const getGuideDestinationHub = createServerFn({ method: "GET" })
  .inputValidator((data: { locale?: string; iso: string }) => ({
    locale: normalizeLocale(data?.locale),
    iso: String(data?.iso ?? "").trim().toUpperCase().slice(0, 2),
  }))
  .handler(async ({ data }): Promise<GuideDestinationHub | null> => {
    if (data.iso.length !== 2) return null;
    const client = publicClient();
    const { data: relationRows, error: relationError } = await client
      .from("guide_relations")
      .select("guide_id")
      .eq("country_iso", data.iso)
      .limit(300);
    if (relationError) throw new Error(relationError.message);
    const ids = [...new Set((relationRows ?? []).map((row: any) => row.guide_id))];

    let guides: GuideListItem[] = [];
    if (ids.length) {
      const { data: rows, error } = await client
        .from("guides")
        .select(GUIDE_SELECT)
        .eq("status", "PUBLISHED")
        .in("id", ids)
        .limit(200);
      if (error) throw new Error(error.message);
      guides = sortGuides(
        (rows ?? [])
          .map((row: any) => toListItem(row, data.locale))
          .filter((item): item is GuideListItem => Boolean(item)),
      );
    }

    const airportIatas = [...new Set(guides.flatMap((guide) => guide.airportIatas))];
    const offers = await resolveOffers(client, [data.iso], airportIatas);
    return { countryIso: data.iso, guides, offers };
  });

/* ------------------------------ admin surface ------------------------------ */

export type AdminGuideTranslation = {
  locale: Locale;
  slug: string;
  title: string;
  excerpt: string;
  intro: string;
  sections: GuideSection[];
  faq: GuideFaq[];
  seoTitle: string;
  seoDescription: string;
  published: boolean;
};

export type AdminGuide = {
  id: string;
  slug: string;
  categoryId: string | null;
  contentType: GuideContentType;
  published: boolean;
  featured: boolean;
  sortOrder: number;
  heroImageUrl: string;
  heroAlt: string;
  readingMinutes: number | null;
  publishedAt: string | null;
  updatedAt: string;
  countryIsos: string[];
  airportIatas: string[];
  serviceTypes: string[];
  translations: AdminGuideTranslation[];
};

const emptyTranslation = (locale: Locale): AdminGuideTranslation => ({
  locale,
  slug: "",
  title: "",
  excerpt: "",
  intro: "",
  sections: [],
  faq: [],
  seoTitle: "",
  seoDescription: "",
  published: false,
});

function toAdminGuide(row: any): AdminGuide {
  const relations = relationsOf(row.guide_relations ?? []);
  const translations = LOCALES.map((locale) => {
    const found = (row.guide_translations ?? []).find((t: any) => t.locale === locale);
    if (!found) return emptyTranslation(locale);
    return {
      locale,
      slug: found.slug ?? "",
      title: found.title ?? "",
      excerpt: found.excerpt ?? "",
      intro: found.intro ?? "",
      sections: sectionsOf(found.sections),
      faq: faqOf(found.faq),
      seoTitle: found.seo_title ?? "",
      seoDescription: found.seo_description ?? "",
      published: found.translation_status === "PUBLISHED",
    };
  });
  return {
    id: row.id,
    slug: row.slug,
    categoryId: row.category_id ?? null,
    contentType: row.content_type as GuideContentType,
    published: row.status === "PUBLISHED",
    featured: Boolean(row.featured),
    sortOrder: row.sort_order ?? 0,
    heroImageUrl: row.hero_image_url ?? "",
    heroAlt: row.hero_alt ?? "",
    readingMinutes: row.reading_minutes ?? null,
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at,
    countryIsos: [...new Set(relations.filter((r) => r.countryIso).map((r) => r.countryIso!))],
    airportIatas: [...new Set(relations.filter((r) => r.airportIata).map((r) => r.airportIata!))],
    serviceTypes: [...new Set(relations.filter((r) => r.serviceType).map((r) => r.serviceType!))],
    translations,
  };
}

const ADMIN_GUIDE_SELECT =
  "id, slug, category_id, content_type, status, published_at, updated_at, featured, sort_order, hero_image_url, hero_alt, reading_minutes, " +
  "guide_translations(locale, slug, title, excerpt, intro, sections, faq, seo_title, seo_description, translation_status), " +
  "guide_relations(relation_type, country_iso, city_name, airport_iata, service_type, product_id, cta_enabled, sort_order, guide_routes(slug))";

export const listAdminGuides = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ guides: AdminGuide[]; categories: GuideCategory[] }> => {
    const db = await adminDb(context as any);
    const [guidesResult, categoriesResult] = await Promise.all([
      db.from("guides").select(ADMIN_GUIDE_SELECT).order("updated_at", { ascending: false }).limit(300),
      db.from("guide_categories").select("id, slug, icon, sort_order, labels").order("sort_order"),
    ]);
    if (guidesResult.error) throw new Error(guidesResult.error.message);
    if (categoriesResult.error) throw new Error(categoriesResult.error.message);
    return {
      guides: (guidesResult.data ?? []).map(toAdminGuide),
      categories: (categoriesResult.data ?? []).map((row: any) => ({
        id: row.id,
        slug: row.slug,
        icon: row.icon,
        sortOrder: row.sort_order,
        name: labelOf(row.labels, "tr", row.slug),
      })),
    };
  });

export type SaveGuideInput = {
  id?: string | null;
  slug: string;
  categoryId?: string | null;
  contentType: GuideContentType;
  published: boolean;
  featured: boolean;
  sortOrder?: number;
  heroImageUrl?: string;
  heroAlt?: string;
  readingMinutes?: number | null;
  countryIsos: string[];
  airportIatas: string[];
  serviceTypes: string[];
  translations: AdminGuideTranslation[];
};

export const saveGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: SaveGuideInput) => data)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const db = await adminDb(context as any);
    const slug = String(data.slug ?? "").trim().toLowerCase();
    if (!slug) throw new Error("Rehber için bir kısa ad (slug) gerekiyor.");

    const payload = {
      slug,
      category_id: data.categoryId || null,
      content_type: data.contentType,
      status: data.published ? "PUBLISHED" : "DRAFT",
      published_at: data.published ? new Date().toISOString() : null,
      featured: Boolean(data.featured),
      sort_order: Number(data.sortOrder ?? 0),
      hero_image_url: data.heroImageUrl?.trim() || null,
      hero_alt: data.heroAlt?.trim() || null,
      reading_minutes: data.readingMinutes ?? null,
      updated_by: context.userId,
    };

    let guideId = data.id ?? null;
    if (guideId) {
      const { error } = await db.from("guides").update(payload).eq("id", guideId);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await db
        .from("guides")
        .insert({ ...payload, created_by: context.userId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      guideId = inserted.id as string;
    }

    for (const translation of data.translations ?? []) {
      const title = translation.title?.trim();
      const tSlug = translation.slug?.trim().toLowerCase();
      if (!title || !tSlug) {
        await db.from("guide_translations").delete().eq("guide_id", guideId).eq("locale", translation.locale);
        continue;
      }
      const { error } = await db.from("guide_translations").upsert(
        {
          guide_id: guideId,
          locale: translation.locale,
          slug: tSlug,
          title,
          excerpt: translation.excerpt?.trim() || null,
          intro: translation.intro?.trim() || null,
          sections: translation.sections ?? [],
          faq: translation.faq ?? [],
          seo_title: translation.seoTitle?.trim() || null,
          seo_description: translation.seoDescription?.trim() || null,
          translation_status: translation.published ? "PUBLISHED" : "DRAFT",
        },
        { onConflict: "guide_id,locale" },
      );
      if (error) throw new Error(error.message);
    }

    await db.from("guide_relations").delete().eq("guide_id", guideId);
    const relationRows = [
      ...data.countryIsos
        .map((iso) => String(iso).trim().toUpperCase())
        .filter((iso) => iso.length === 2)
        .map((iso, index) => ({
          guide_id: guideId,
          relation_type: "COUNTRY",
          country_iso: iso,
          sort_order: index,
        })),
      ...data.airportIatas
        .map((iata) => String(iata).trim().toUpperCase())
        .filter((iata) => iata.length === 3)
        .map((iata, index) => ({
          guide_id: guideId,
          relation_type: "AIRPORT",
          airport_iata: iata,
          sort_order: index,
        })),
      ...data.serviceTypes
        .filter((value) => ["ESIM", "LOUNGE", "CAR_RENTAL", "TRANSFER"].includes(value))
        .map((value, index) => ({
          guide_id: guideId,
          relation_type: "SERVICE",
          service_type: value,
          sort_order: index,
        })),
    ];
    if (relationRows.length) {
      const { error } = await db.from("guide_relations").insert(relationRows);
      if (error) throw new Error(error.message);
    }

    await audit(
      db,
      data.id ? (payload.status === "PUBLISHED" ? "GUIDE_PUBLISH" : "GUIDE_UNPUBLISH") : payload.status === "PUBLISHED" ? "GUIDE_PUBLISH" : "guide.create",
      "guide",
      guideId,
      null,
      { slug, status: payload.status },
    );
    return { id: guideId! };
  });

export const deleteGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => ({ id: String(data.id) }))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as any);
    const { error } = await db.from("guides").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(db, "guide.delete", "guide", data.id, null, null);
    return { ok: true };
  });
