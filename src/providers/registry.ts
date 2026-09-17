import type { ProviderAdapter } from "./types";
import type { ServiceType } from "@/domain/enums";

/**
 * Adapter registry. Concrete adapters are registered here in later phases
 * (server-side only). Phase 0 intentionally ships zero live providers.
 */
const registry = new Map<string, ProviderAdapter>();

export function registerProviderAdapter(adapter: ProviderAdapter): void {
  registry.set(adapter.describe().code, adapter);
}

export function getProviderAdapter(code: string): ProviderAdapter | undefined {
  return registry.get(code);
}

export function listProviderAdapters(serviceType?: ServiceType): ProviderAdapter[] {
  const all = [...registry.values()];
  return serviceType ? all.filter((a) => a.describe().serviceType === serviceType) : all;
}

/**
 * Routing foundation: choose an adapter for a service.
 * Phase 0 returns the highest-priority registered adapter only — no automatic
 * provider switching is implemented yet.
 */
export type RoutingCandidate = {
  providerCode: string;
  available: boolean;
  providerCost: number | null;
  priority: number;
  reliabilityScore?: number;
};

export function selectProvider(
  candidates: RoutingCandidate[],
  options: { minimumMarginPercent?: number; salePrice?: number } = {},
): RoutingCandidate | null {
  const usable = candidates.filter((c) => {
    if (!c.available) return false;
    if (options.minimumMarginPercent == null || options.salePrice == null) return true;
    if (c.providerCost == null) return true;
    const margin = ((options.salePrice - c.providerCost) / options.salePrice) * 100;
    return margin >= options.minimumMarginPercent;
  });
  if (usable.length === 0) return null;
  return usable.sort(
    (a, b) => a.priority - b.priority || (a.providerCost ?? 0) - (b.providerCost ?? 0),
  )[0]!;
}
