/**
 * "Buy again" target: the country catalogue of the original package, with the
 * same product suggested for preselection. The catalogue only preselects it if
 * it is still listed (published); otherwise just the country opens. Never adds
 * anything to the cart.
 */
export type RebuyTarget = { country: string; plan?: string };

export function rebuyTarget(
  info: { productId?: string; destinationIso: string | null; coverageIsos: string[] } | null | undefined,
): RebuyTarget {
  const raw = info?.destinationIso ?? (info?.coverageIsos.length === 1 ? info.coverageIsos[0] : null) ?? "";
  const country = /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : "";
  if (!country) return { country: "" };
  return info?.productId ? { country, plan: info.productId } : { country };
}

/** Top-up is shown only with real provider support AND a verified top-up catalogue link (none exists yet). */
export const TOPUP_CATALOGUE_AVAILABLE = false;
export function canOfferTopUp(supported: boolean, catalogueAvailable = TOPUP_CATALOGUE_AVAILABLE) {
  return supported && catalogueAvailable;
}
