/**
 * SEO Content Engine — a thin layer on top of the existing Travely Guides
 * tables. Public reads are published + indexable-aware; admin writes reuse
 * the existing admin guard and audit log.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit } from "@/lib/admin-guard";
import {
  cityFactsOf,
  getGuideBySlug,
  publicClient,
  type CityFacts,
  type GuideDetail,
} from "@/lib/guides.functions";
import type { Locale } from "@/domain/enums";
import { familyOf, seoPath, type SeoFamily } from "@/domain/seo/paths";

export type SeoLink = { id: string; title: string; path: string; contentType: string; countryIso: string | null };

export type SeoSettings = {
  organizationName: string;
  defaultOgImage: string;
  twitterHandle: string;
};

export type SeoPage = {
  guide: GuideDetail;
  locale: Locale;
  h1: string;
  heroAlt: string | null;
  cityFacts: CityFacts;
  countryIso: string | null;
  cityName: string | null;
  indexable: boolean;
  canonicalOverride: string | null;
  authorName: string | null;
  alternates: Partial<Record<Locale, string>>;
  related: SeoLink[];
  cities: SeoLink[];
  destinations: SeoLink[];
  settings: SeoSettings;
};

const LOCALES: Locale[] = ["tr", "de", "en"];
const DEFAULT_SETTINGS: SeoSettings = { organizationName: "Travely", defaultOgImage: "", twitterHandle: "" };

function settingsOf(value: any): SeoSettings {
  return {
    organizationName: String(value?.organizationName ?? "").trim().slice(0, 80) || "Travely",
    defaultOgImage: String(value?.defaultOgImage ?? "").trim().startsWith("https://")
      ? String(value.defaultOgImage).trim().slice(0, 500)
      : "",
    twitterHandle: String(value?.twitterHandle ?? "").trim().replace(/[^@\w]/g, "").slice(0, 30),
  };
}

const LINK_SELECT = "id, content_type, country_iso, guide_translations(locale, slug, title, translation_status)";

/** Only links whose target exists in *this* locale — never cross-language fallbacks. */
function toLinks(rows: any[], locale: Locale, excludeId: string): SeoLink[] {
  const out: SeoLink[] = [];
  for (const row of rows ?? []) {
    if (row.id === excludeId) continue;
    const t = (row.guide_translations ?? []).find(
      (x: any) => x.locale === locale && x.translation_status === "PUBLISHED",
    );
    if (!t) continue;
    out.push({
      id: row.id,
      title: t.title,
      path: seoPath(locale, row.content_type, t.slug),
      contentType: row.content_type,
      countryIso: row.country_iso ?? null,
    });
  }
  return out;
}

export const getSeoPage = createServerFn({ method: "GET" })
  .inputValidator((data: { locale: string; slug: string; family: SeoFamily }) => ({
    locale: (LOCALES.includes(data?.locale as Locale) ? data.locale : "tr") as Locale,
    slug: String(data?.slug ?? "").trim().toLowerCase().slice(0, 160),
    family: data?.family === "esim" ? ("esim" as const) : ("guide" as const),
  }))
  .handler(async ({ data }): Promise<SeoPage | null> => {
    if (!data.slug) return null;
    const client = publicClient();
    const { data: tr } = await client
      .from("guide_translations")
      .select("guide_id, h1, hero_alt, city_facts")
      .eq("slug", data.slug)
      .eq("locale", data.locale)
      .eq("translation_status", "PUBLISHED")
      .maybeSingle();
    if (!tr) return null;

    const { data: row } = await client
      .from("guides")
      .select(
        "id, content_type, country_iso, city_name, indexable, canonical_override, related_guide_ids, seo_authors(name), guide_translations(locale, slug, translation_status)",
      )
      .eq("id", tr.guide_id)
      .eq("status", "PUBLISHED")
      .maybeSingle();
    if (!row || familyOf(row.content_type) !== data.family) return null;

    const guide = await getGuideBySlug({ data: { slug: data.slug, locale: data.locale } });
    if (!guide) return null;

    const alternates: Partial<Record<Locale, string>> = {};
    for (const t of (row as any).guide_translations ?? []) {
      if (t.translation_status === "PUBLISHED") alternates[t.locale as Locale] = seoPath(t.locale, row.content_type, t.slug);
    }

    const relatedIds: string[] = Array.isArray(row.related_guide_ids) ? row.related_guide_ids : [];
    const countryIso = row.country_iso ?? guide.countryIsos[0] ?? null;

    const [manual, sameCountry, destinations, settingsRow] = await Promise.all([
      relatedIds.length
        ? client.from("guides").select(LINK_SELECT).in("id", relatedIds).eq("status", "PUBLISHED")
        : Promise.resolve({ data: [] as any[] }),
      countryIso
        ? client.from("guides").select(LINK_SELECT).eq("country_iso", countryIso).eq("status", "PUBLISHED").limit(24)
        : Promise.resolve({ data: [] as any[] }),
      client.from("guides").select(LINK_SELECT).eq("content_type", "DESTINATION").eq("status", "PUBLISHED").limit(12),
      client.from("platform_settings").select("data").eq("id", "seo").maybeSingle(),
    ]);

    const manualLinks = toLinks((manual as any).data ?? [], data.locale, row.id);
    const countryLinks = toLinks((sameCountry as any).data ?? [], data.locale, row.id);
    const cities = countryLinks.filter((l) => l.contentType === "CITY");
    const seen = new Set<string>();
    const related = [...manualLinks, ...countryLinks.filter((l) => l.contentType !== "CITY" && l.contentType !== "DESTINATION")]
      .filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)))
      .slice(0, 6);
    const destinationLinks = [
      ...countryLinks.filter((l) => l.contentType === "DESTINATION"),
      ...toLinks((destinations as any).data ?? [], data.locale, row.id),
    ]
      .filter((l, i, arr) => arr.findIndex((x) => x.id === l.id) === i)
      .slice(0, 8);

    return {
      guide,
      locale: data.locale,
      h1: tr.h1 || guide.title,
      heroAlt: tr.hero_alt || guide.heroAlt,
      cityFacts: cityFactsOf(tr.city_facts),
      countryIso,
      cityName: row.city_name ?? null,
      indexable: row.indexable !== false,
      canonicalOverride: row.canonical_override ?? null,
      authorName: (row as any).seo_authors?.name ?? null,
      alternates,
      related,
      cities,
      destinations: destinationLinks,
      settings: (settingsRow as any)?.data?.data ? settingsOf((settingsRow as any).data.data) : DEFAULT_SETTINGS,
    };
  });

/* ---------------------------- Admin: authors ---------------------------- */

export type SeoAuthor = { id: string; name: string; slug: string; bio: string; avatarUrl: string };

export const listSeoAuthors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SeoAuthor[]> => {
    const db = await adminDb(context as any);
    const { data, error } = await db.from("seo_authors").select("id, name, slug, bio, avatar_url").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      bio: String(r.bio?.tr ?? ""),
      avatarUrl: r.avatar_url ?? "",
    }));
  });

export const saveSeoAuthor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string | null; name: string; bio?: string; avatarUrl?: string }) => d)
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as any);
    const name = String(data.name ?? "").replace(/<[^>]*>/g, "").trim().slice(0, 80);
    if (!name) throw new Error("Yazar adı gerekiyor.");
    const slug = name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const avatar = String(data.avatarUrl ?? "").trim();
    const payload = {
      name,
      slug,
      bio: { tr: String(data.bio ?? "").replace(/<[^>]*>/g, "").slice(0, 600) },
      avatar_url: avatar.startsWith("https://") ? avatar : null,
    };
    const result = data.id
      ? await db.from("seo_authors").update(payload).eq("id", data.id).select("id").single()
      : await db.from("seo_authors").insert(payload).select("id").single();
    if (result.error) throw new Error(result.error.message);
    await audit(db, "seo.author.save", "seo_author", result.data.id, null, { name });
    return { id: result.data.id as string };
  });

export const deleteSeoAuthor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as any);
    const { error } = await db.from("seo_authors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(db, "seo.author.delete", "seo_author", data.id, null, null);
    return { ok: true };
  });

/* --------------------------- Admin: settings ---------------------------- */

export const getSeoSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SeoSettings> => {
    const db = await adminDb(context as any);
    const { data } = await db.from("platform_settings").select("data").eq("id", "seo").maybeSingle();
    return data ? settingsOf(data.data) : DEFAULT_SETTINGS;
  });

export const saveSeoSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SeoSettings) => settingsOf(d))
  .handler(async ({ data, context }) => {
    const db = await adminDb(context as any);
    const { error } = await db
      .from("platform_settings")
      .upsert({ id: "seo", data, updated_by: (context as any).userId }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    await audit(db, "seo.settings.save", "platform_settings", "seo", null, data);
    return data;
  });
