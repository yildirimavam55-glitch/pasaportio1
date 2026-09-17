import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { normalizeStatus, type DeviceRecord } from "@/domain/esim/device-compatibility";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

type Row = Database["public"]["Tables"]["esim_device_compatibility"]["Row"];

function toRecord(row: Row): DeviceRecord {
  return {
    id: row.id,
    brand: row.brand,
    family: row.family,
    model: row.model,
    aliases: row.aliases ?? [],
    status: normalizeStatus(row.status),
    notes: row.notes,
    regionVariantWarning: row.region_variant_warning,
    active: row.active,
    lastReviewed: row.last_reviewed,
  };
}

/** Public read: curated, active device compatibility catalogue. */
export const listDeviceCompatibility = createServerFn({ method: "GET" }).handler(async (): Promise<DeviceRecord[]> => {
  const { data, error } = await publicClient()
    .from("esim_device_compatibility")
    .select("*")
    .eq("active", true)
    .order("brand")
    .order("model");
  if (error || !data) return [];
  return data.map(toRecord);
});

/** Admin read: includes disabled records. */
export const listAllDeviceCompatibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeviceRecord[]> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Yönetici yetkisi gerekiyor.");
    const { data, error } = await context.supabase
      .from("esim_device_compatibility")
      .select("*")
      .order("brand")
      .order("model");
    if (error) throw new Error(error.message);
    return (data ?? []).map(toRecord);
  });

export type DeviceUpsertInput = {
  id?: string;
  brand: string;
  family?: string | null;
  model: string;
  aliases?: string[];
  status: string;
  notes?: string | null;
  regionVariantWarning?: boolean;
  active?: boolean;
};

/** Admin write: add or update a curated device record. */
export const saveDeviceCompatibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DeviceUpsertInput) => input)
  .handler(async ({ data, context }): Promise<DeviceRecord> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Yönetici yetkisi gerekiyor.");
    const brand = data.brand.trim();
    const model = data.model.trim();
    if (!brand || !model) throw new Error("Marka ve model zorunludur.");

    const payload = {
      brand,
      model,
      family: data.family?.trim() || null,
      aliases: (data.aliases ?? []).map((alias) => alias.trim()).filter(Boolean),
      status: normalizeStatus(data.status),
      notes: data.notes?.trim() || null,
      region_variant_warning: Boolean(data.regionVariantWarning),
      active: data.active ?? true,
      last_reviewed: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    };

    const query = data.id
      ? context.supabase.from("esim_device_compatibility").update(payload).eq("id", data.id).select("*").single()
      : context.supabase.from("esim_device_compatibility").upsert(payload, { onConflict: "brand,model" }).select("*").single();
    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    return toRecord(row as Row);
  });
