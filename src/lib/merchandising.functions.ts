import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { safeHref, sanitizeMarketing, type MarketingContent } from "@/domain/merchandising";

/**
 * Destination / airport / route preset / campaign merchandising.
 * Canonical countries and airports remain system reference data: admins only
 * manage presentation (featured, visibility, imagery, copy, ordering, SEO).
 */

type MerchandisingPatch = {
  featured?: boolean;
  customerVisible?: boolean;
  sortOrder?: number;
  mediaId?: string | null;
  mobileMediaId?: string | null;
  content?: MarketingContent;
};

function merchandisingColumns(data: MerchandisingPatch) {
  const patch: Record<string, unknown> = {};
  if (data.featured !== undefined) patch["featured"] = Boolean(data.featured);
  if (data.customerVisible !== undefined) patch["customer_visible"] = Boolean(data.customerVisible);
  if (data.sortOrder !== undefined) patch["sort_order"] = Number(data.sortOrder) || 0;
  if (data.mediaId !== undefined) patch["media_id"] = data.mediaId || null;
  if (data.mobileMediaId !== undefined) patch["mobile_media_id"] = data.mobileMediaId || null;
  if (data.content !== undefined) patch["content"] = sanitizeMarketing(data.content);
  return patch;
}

/* --------------------------------- destinations -------------------------------- */

export const listDestinations = createServerFn({ method: "GET" })
  .inputValidator((input: { search?: string } | undefined) => input ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    let query = db.from("countries").select("id, name, iso2, regions(name)").order("name").limit(300);
    if (data.search) query = query.ilike("name", `%${data.search}%`);
    const { data: countries, error } = await query;
    if (error) throw new Error(error.message);
    const { data: content } = await db.from("destination_content").select("*");
    const byCountry = new Map<string, any>((content ?? []).map((row: any) => [row.country_id, row]));
    return (countries ?? []).map((country: any) => {
      const row = byCountry.get(country.id);
      return {
        countryId: country.id,
        name: country.name,
        iso2: country.iso2,
        region: country.regions?.name ?? null,
        featured: Boolean(row?.featured),
        customerVisible: row ? Boolean(row.customer_visible) : true,
        sortOrder: Number(row?.sort_order ?? 0),
        mediaId: row?.media_id ?? null,
        mobileMediaId: row?.mobile_media_id ?? null,
        content: sanitizeMarketing(row?.content),
      };
    });
  });

export const saveDestination = createServerFn({ method: "POST" })
  .inputValidator((input: { countryId: string } & MerchandisingPatch) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const patch = { country_id: data.countryId, ...merchandisingColumns(data) };
    const { error } = await db.from("destination_content").upsert(patch, { onConflict: "country_id" });
    if (error) throw new Error(error.message);
    await audit(db, "destination.update", "destination_content", data.countryId, null, patch);
    return { ok: true };
  });

/* ---------------------------------- airports ---------------------------------- */

export const listAirportContent = createServerFn({ method: "GET" })
  .inputValidator((input: { search?: string } | undefined) => input ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    let query = db.from("airports").select("id, name, iata, city").order("iata").limit(300);
    if (data.search) query = query.or(`name.ilike.%${data.search}%,iata.ilike.%${data.search}%,city.ilike.%${data.search}%`);
    const { data: airports, error } = await query;
    if (error) throw new Error(error.message);
    const { data: content } = await db.from("airport_content").select("*");
    const byAirport = new Map<string, any>((content ?? []).map((row: any) => [row.airport_id, row]));
    return (airports ?? []).map((airport: any) => {
      const row = byAirport.get(airport.id);
      return {
        airportId: airport.id,
        name: airport.name,
        iata: airport.iata,
        city: airport.city,
        featured: Boolean(row?.featured),
        customerVisible: row ? Boolean(row.customer_visible) : true,
        sortOrder: Number(row?.sort_order ?? 0),
        mediaId: row?.media_id ?? null,
        mobileMediaId: row?.mobile_media_id ?? null,
        content: sanitizeMarketing(row?.content),
      };
    });
  });

export const saveAirportContent = createServerFn({ method: "POST" })
  .inputValidator((input: { airportId: string } & MerchandisingPatch) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const patch = { airport_id: data.airportId, ...merchandisingColumns(data) };
    const { error } = await db.from("airport_content").upsert(patch, { onConflict: "airport_id" });
    if (error) throw new Error(error.message);
    await audit(db, "airport.update", "airport_content", data.airportId, null, patch);
    return { ok: true };
  });

/* -------------------------------- route presets -------------------------------- */

const slugify = (value: string) =>
  value.toLowerCase().replace(/[ıİ]/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export const listRoutePresets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const { data, error } = await db.from("route_presets").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({ ...row, content: sanitizeMarketing(row.content) }));
  });

export const saveRoutePreset = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string | null;
      name: string;
      icon?: string;
      countries?: string[];
      active?: boolean;
      featured?: boolean;
      sortOrder?: number;
      mediaId?: string | null;
      mobileMediaId?: string | null;
      content?: MarketingContent;
    }) => input,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const patch: Record<string, unknown> = {
      slug: slugify(data.name || "rota") || "rota",
      icon: String(data.icon ?? "Route").replace(/[^A-Za-z0-9]/g, "").slice(0, 40) || "Route",
      countries: (data.countries ?? []).map((code) => String(code).toUpperCase().slice(0, 2)).filter(Boolean).slice(0, 40),
      active: data.active !== false,
      featured: Boolean(data.featured),
      sort_order: Number(data.sortOrder) || 0,
      media_id: data.mediaId || null,
      mobile_media_id: data.mobileMediaId || null,
      content: sanitizeMarketing(data.content),
    };
    if (data.id) {
      const { error } = await db.from("route_presets").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      await audit(db, "route_preset.update", "route_preset", data.id, null, patch);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await db.from("route_presets").insert(patch).select("id").single();
    if (error) throw new Error(error.message);
    await audit(db, "route_preset.create", "route_preset", inserted.id, null, patch);
    return { ok: true, id: inserted.id as string };
  });

export const deleteRoutePreset = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const { error } = await db.from("route_presets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(db, "route_preset.delete", "route_preset", data.id, null, null);
    return { ok: true };
  });

/* ---------------------------------- campaigns --------------------------------- */

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await adminDb(context as AdminCtx);
    const { data, error } = await db.from("campaigns").select("*").order("priority").limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({ ...row, content: sanitizeMarketing(row.content) }));
  });

export const saveCampaign = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string | null;
      name: string;
      serviceType?: "ESIM" | "LOUNGE" | null;
      startsAt?: string | null;
      endsAt?: string | null;
      active?: boolean;
      priority?: number;
      ctaHref?: string;
      mediaId?: string | null;
      mobileMediaId?: string | null;
      content?: MarketingContent;
    }) => input,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const patch: Record<string, unknown> = {
      name: String(data.name ?? "").slice(0, 120) || "Kampanya",
      service_type: data.serviceType === "ESIM" || data.serviceType === "LOUNGE" ? data.serviceType : null,
      starts_at: data.startsAt || null,
      ends_at: data.endsAt || null,
      active: data.active !== false,
      priority: Number(data.priority) || 0,
      cta_href: safeHref(data.ctaHref),
      media_id: data.mediaId || null,
      mobile_media_id: data.mobileMediaId || null,
      content: sanitizeMarketing(data.content),
    };
    if (data.id) {
      const { error } = await db.from("campaigns").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      await audit(db, "campaign.update", "campaign", data.id, null, patch);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await db.from("campaigns").insert(patch).select("id").single();
    if (error) throw new Error(error.message);
    await audit(db, "campaign.create", "campaign", inserted.id, null, patch);
    return { ok: true, id: inserted.id as string };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const { error } = await db.from("campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(db, "campaign.delete", "campaign", data.id, null, null);
    return { ok: true };
  });
