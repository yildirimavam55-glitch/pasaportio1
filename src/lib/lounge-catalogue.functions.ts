import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export type LoungeOption = {
  id: string;
  slug: string;
  name: string;
  loungeName: string | null;
  currency: string;
  salePrice: number | null;
  badge: string | null;
  iata: string | null;
  terminal: string | null;
  maxStayMinutes: number | null;
  amenities: string[];
  departureEligible: boolean;
  transitEligible: boolean;
  arrivalEligible: boolean;
};

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

/**
 * Published lounge products for one airport. Real catalogue rows only —
 * never generated or placeholder offers.
 */
export const listLoungeOptions = createServerFn({ method: "GET" })
  .inputValidator((input: { iata: string; situation?: string }) => ({
    iata: String(input.iata ?? "").toUpperCase().slice(0, 3),
    situation: String(input.situation ?? "DEPARTURE").toUpperCase().slice(0, 12),
  }))
  .handler(async ({ data }): Promise<LoungeOption[]> => {
    if (!data.iata) return [];
    const { data: rows, error } = await publicClient()
      .from("service_products")
      .select(
        "id, slug, name, currency, sale_price, badge, sort_order, lounge_product_details(lounge_name, iata, terminal, max_stay_minutes, amenities, departure_eligible, transit_eligible, arrival_eligible)",
      )
      .eq("service_type", "LOUNGE")
      .eq("lifecycle", "PUBLISHED")
      .eq("customer_visible", true)
      .order("sort_order");
    if (error) throw new Error(error.message);

    return (rows ?? [])
      .map((row) => {
        const raw = row as Record<string, unknown>;
        const details = (Array.isArray(raw["lounge_product_details"]) ? (raw["lounge_product_details"] as unknown[])[0] : raw["lounge_product_details"]) as
          | {
              lounge_name: string | null;
              iata: string | null;
              terminal: string | null;
              max_stay_minutes: number | null;
              amenities: string[] | null;
              departure_eligible: boolean | null;
              transit_eligible: boolean | null;
              arrival_eligible: boolean | null;
            }
          | null
          | undefined;
        return {
          id: String(raw["id"]),
          slug: String(raw["slug"]),
          name: String(raw["name"]),
          loungeName: details?.lounge_name ?? null,
          currency: (raw["currency"] as string) ?? "EUR",
          salePrice: raw["sale_price"] == null ? null : Number(raw["sale_price"]),
          badge: (raw["badge"] as string | null) ?? null,
          iata: details?.iata ? details.iata.toUpperCase() : null,
          terminal: details?.terminal ?? null,
          maxStayMinutes: details?.max_stay_minutes ?? null,
          amenities: details?.amenities ?? [],
          departureEligible: details?.departure_eligible !== false,
          transitEligible: details?.transit_eligible !== false,
          arrivalEligible: details?.arrival_eligible !== false,
        } satisfies LoungeOption;
      })
      .filter((option) => option.iata === data.iata)
      .filter((option) =>
        data.situation === "TRANSIT" ? option.transitEligible : data.situation === "ARRIVAL" ? option.arrivalEligible : option.departureEligible,
      )
      .filter((option) => option.salePrice != null && option.salePrice > 0);
  });
