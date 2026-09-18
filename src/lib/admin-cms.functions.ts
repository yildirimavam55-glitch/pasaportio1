import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";

/**
 * CMS management on the existing cms_documents / cms_translations foundation.
 * Only structured fields are stored — no raw CSS or JavaScript is accepted.
 */

export const CMS_KINDS = ["GLOBAL_CONTENT", "ESIM_CONTENT", "LOUNGE_CONTENT"] as const;
export type CmsKind = (typeof CMS_KINDS)[number];
export const CMS_LOCALES = ["tr", "de", "en"] as const;

export type CmsCopy = {
  heroHeadline: string;
  heroDescription: string;
  heroCtaLabel: string;
  sectionHeadline: string;
  sectionDescription: string;
  campaign: string;
  crossSell: string;
  support: string;
  header: string;
  footer: string;
  faq: Array<{ question: string; answer: string }>;
};

export type CmsSettings = {
  visible: boolean;
  sortOrder: number;
  variant: "default" | "highlight" | "quiet";
  background: "card" | "soft" | "petrol" | "sand";
  spacing: "compact" | "normal" | "roomy";
  heroDesktopMediaId: string | null;
  heroMobileMediaId: string | null;
  heroCtaHref: string;
};

export const emptyCopy = (): CmsCopy => ({
  heroHeadline: "",
  heroDescription: "",
  heroCtaLabel: "",
  sectionHeadline: "",
  sectionDescription: "",
  campaign: "",
  crossSell: "",
  support: "",
  header: "",
  footer: "",
  faq: [],
});

export const defaultSettings = (): CmsSettings => ({
  visible: true,
  sortOrder: 0,
  variant: "default",
  background: "card",
  spacing: "normal",
  heroDesktopMediaId: null,
  heroMobileMediaId: null,
  heroCtaHref: "/",
});

const text = (value: unknown, max = 600) => String(value ?? "").slice(0, max);
/** Structured-only: strips tags so stored content can never inject markup or script. */
const safe = (value: unknown, max = 600) => text(value, max).replace(/<[^>]*>/g, "").trim();

function sanitizeCopy(input: any): CmsCopy {
  return {
    heroHeadline: safe(input?.heroHeadline, 160),
    heroDescription: safe(input?.heroDescription, 600),
    heroCtaLabel: safe(input?.heroCtaLabel, 80),
    sectionHeadline: safe(input?.sectionHeadline, 160),
    sectionDescription: safe(input?.sectionDescription, 600),
    campaign: safe(input?.campaign, 600),
    crossSell: safe(input?.crossSell, 600),
    support: safe(input?.support, 600),
    header: safe(input?.header, 300),
    footer: safe(input?.footer, 600),
    faq: Array.isArray(input?.faq)
      ? input.faq.slice(0, 20).map((row: any) => ({ question: safe(row?.question, 200), answer: safe(row?.answer, 900) }))
      : [],
  };
}

function sanitizeSettings(input: any): CmsSettings {
  const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
    (allowed as readonly string[]).includes(String(value)) ? (String(value) as T) : fallback;
  const href = safe(input?.heroCtaHref, 120);
  return {
    visible: input?.visible !== false,
    sortOrder: Number.isFinite(Number(input?.sortOrder)) ? Number(input.sortOrder) : 0,
    variant: pick(input?.variant, ["default", "highlight", "quiet"] as const, "default"),
    background: pick(input?.background, ["card", "soft", "petrol", "sand"] as const, "card"),
    spacing: pick(input?.spacing, ["compact", "normal", "roomy"] as const, "normal"),
    heroDesktopMediaId: input?.heroDesktopMediaId ? String(input.heroDesktopMediaId) : null,
    heroMobileMediaId: input?.heroMobileMediaId ? String(input.heroMobileMediaId) : null,
    /** Internal same-site paths only. */
    heroCtaHref: href.startsWith("/") ? href : "/",
  };
}

export const listCmsDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const { data, error } = await db
      .from("cms_documents")
      .select("id, key, kind, status, visible, sort_order, published_at, updated_at, data, cms_translations(locale, data)")
      .in("kind", CMS_KINDS as unknown as string[])
      .order("kind");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      key: row.key,
      kind: row.kind as CmsKind,
      status: row.status as "DRAFT" | "PUBLISHED",
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      settings: sanitizeSettings(row.data?.settings),
      copy: Object.fromEntries(
        CMS_LOCALES.map((locale) => [
          locale,
          sanitizeCopy(
            locale === "tr"
              ? row.data?.copy
              : (row.cms_translations ?? []).find((t: any) => t.locale === locale)?.data,
          ),
        ]),
      ) as Record<(typeof CMS_LOCALES)[number], CmsCopy>,
    }));
  });

export const saveCmsDocument = createServerFn({ method: "POST" })
  .inputValidator((input: { kind: CmsKind; settings: CmsSettings; copy: Record<string, CmsCopy>; publish?: boolean }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    if (!(CMS_KINDS as readonly string[]).includes(data.kind)) throw new Error("Geçersiz içerik türü.");
    const settings = sanitizeSettings(data.settings);
    const copy = Object.fromEntries(CMS_LOCALES.map((l) => [l, sanitizeCopy(data.copy?.[l])]));
    const key = data.kind.toLowerCase();

    const { data: existing } = await db
      .from("cms_documents")
      .select("id, data, status, published_at")
      .eq("key", key)
      .maybeSingle();

    const payload = {
      key,
      kind: data.kind,
      status: data.publish ? "PUBLISHED" : existing?.status === "PUBLISHED" && !data.publish ? "DRAFT" : "DRAFT",
      visible: settings.visible,
      sort_order: settings.sortOrder,
      published_at: data.publish ? new Date().toISOString() : (existing?.published_at ?? null),
      data: { settings, copy: copy["tr"] },
    };

    let documentId = existing?.id as string | undefined;
    if (documentId) {
      const { error } = await db.from("cms_documents").update(payload).eq("id", documentId);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await db.from("cms_documents").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      documentId = inserted.id;
    }

    for (const locale of ["de", "en"] as const) {
      const { error } = await db
        .from("cms_translations")
        .upsert({ document_id: documentId, locale, data: copy[locale] }, { onConflict: "document_id,locale" });
      if (error) throw new Error(error.message);
    }

    await db.from("cms_versions").insert({ document_id: documentId, snapshot: { settings, copy }, created_by: (context as AdminCtx).userId });
    await audit(
      db,
      data.publish ? "cms.publish" : "cms.save_draft",
      "cms_document",
      documentId ?? null,
      existing ? { status: existing.status, settings: existing.data?.settings ?? null } : null,
      { status: payload.status, settings },
    );

    return { id: documentId, status: payload.status };
  });
