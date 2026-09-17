import type { RoutePreset, RouteStop } from "./types";
import type { ServiceSlug } from "@/content/travel-content";

export function normalizeService(value: unknown): ServiceSlug {
  return value === "lounge" ? "lounge" : "esim";
}
export function stableStop(countryId: string, countryIso: string, order: number): RouteStop {
  return { id: `${countryIso.toLowerCase()}-${order}-${Math.random().toString(36).slice(2, 8)}`, countryId, countryIso, order };
}
export function normalizeRouteStops(stops: RouteStop[]): RouteStop[] {
  const seen = new Set<string>();
  return stops.filter((stop) => Boolean(stop.id && stop.countryId && stop.countryIso) && !seen.has(stop.id) && Boolean(seen.add(stop.id))).map((stop, order) => ({ ...stop, order }));
}
export function routeFromPreset(preset: RoutePreset): RouteStop[] {
  return preset.stops.map((stop, order) => stableStop(stop.countryId, stop.countryIso, order));
}
export function moveStop(stops: RouteStop[], id: string, direction: -1 | 1): RouteStop[] {
  const normalized = normalizeRouteStops(stops);
  const index = normalized.findIndex((stop) => stop.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= normalized.length) return normalized;
  const copy = [...normalized];
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy.map((stop, order) => ({ ...stop, order }));
}
export function removeStop(stops: RouteStop[], id: string): RouteStop[] { return normalizeRouteStops(stops.filter((stop) => stop.id !== id)); }
export function isValidMultiRoute(stops: RouteStop[]): boolean { return normalizeRouteStops(stops).length >= 2; }
