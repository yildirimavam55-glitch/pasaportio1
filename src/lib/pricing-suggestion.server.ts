/**
 * Suggested prices for NEW supplier products from the approved Pasaport engine.
 * Suggestions are stored for Admin review only; they never become a live price here.
 */
import { packageKey } from "@/domain/pricing/manual-prices";
import { suggestPrice } from "@/domain/pricing/final-engine";

export type AiraloExactIndex = Map<string, number>;

/** Current verified EUR Airalo prices keyed by "ISO|package". Historical/possibly-removed prices are excluded. */
export async function loadAiraloExactIndex(db: any): Promise<AiraloExactIndex> {
  const index: AiraloExactIndex = new Map();
  try {
    const { data } = await db.from("platform_settings").select("data").eq("id", "competitor_prices").maybeSingle();
    for (const e of (data?.data?.entries ?? []) as any[]) {
      if (e?.competitor !== "Airalo" || !e.verifiedAt || e.possiblyRemoved || String(e.currency).toUpperCase() !== "EUR") continue;
      const price = Number(e.price);
      if (e.iso && e.key && Number.isFinite(price) && price > 0) index.set(`${e.iso}|${e.key}`, price);
    }
  } catch {
    // No competitor data -> cost fallback only.
  }
  return index;
}

export function suggestionFor(
  item: { providerCost: number; countryIso: string | null; unlimited: boolean; dataGb: number | null; validityDays: number | null },
  airalo: AiraloExactIndex,
) {
  const key = packageKey({ unlimited: item.unlimited, dataGb: item.dataGb, validityDays: item.validityDays });
  const airaloExact = item.countryIso ? airalo.get(`${item.countryIso}|${key}`) ?? null : null;
  const s = suggestPrice(item.providerCost, airaloExact);
  return {
    source: "SUGGESTED_NEW_PRODUCT",
    approved: false,
    status: s.status,
    suggestedPrice: s.price,
    rule: s.rule,
    airaloPrice: s.airaloPrice,
    supplierCost: item.providerCost,
    package: item.countryIso ? `${item.countryIso}|${key}` : key,
    calculatedAt: new Date().toISOString(),
  };
}
