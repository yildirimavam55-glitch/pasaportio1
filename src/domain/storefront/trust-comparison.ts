import { isPreviewHost } from '@/security/headers';
export type ComparisonEntry = { kind: "roaming" | "other" | "pasaport"; price: number; currency: string; destination: string; allowance: string; validity: string; provider: string; sourceUrl: string; checkedAt: string };
export function verifiedComparison(entries: ComparisonEntry[] | undefined, approved: boolean) {
  if (!approved || entries?.length !== 3) return null;
  const first = entries[0];
  if (!first || new Set(entries.map(e => e.kind)).size !== 3) return null;
  if (entries.some(e => !(e.price > 0) || !Number.isFinite(e.price) || !/^https:\/\//.test(e.sourceUrl) || !e.provider || !e.destination || !e.allowance || !e.validity || !Number.isFinite(Date.parse(e.checkedAt)) || e.currency !== first.currency || e.destination !== first.destination || e.allowance !== first.allowance || e.validity !== first.validity)) return null;
  return entries;
}
export function comparisonScale(prices: number[]) { const max = Math.max(...prices, 0); return prices.map(p => max > 0 ? p / max : 0); }
export function publicReview(item: { reviewType?: string; verified: boolean; published: boolean; reviewStatus?: string; visible: boolean }) { return item.visible && item.reviewType === "REAL" && item.verified && item.published && item.reviewStatus === "PUBLISHED"; }
export function reviewAutoplay(s: { enough: boolean; paused: boolean; hover: boolean; focused: boolean; visible: boolean; tab: boolean; reduced: boolean }) { return s.enough && !s.paused && !s.hover && !s.focused && s.visible && s.tab && !s.reduced; }
// Owner-approved test demo: the published lovable.app site also shows labelled sample ratings/payment logos (no provider connected).
export const PUBLIC_DEMO_HOSTS: string[] = [];
export function trustPreviewHost(host: string) { return isPreviewHost(host) || /^preview--[a-z0-9-]+\.lovable\.app$/i.test(host) || PUBLIC_DEMO_HOSTS.includes(host.toLowerCase()); }
/**
 * Owner-requested researched example (Türkiye · 20 GB), shown on every host with its sources and check dates.
 * Validity differs for roaming (closest public Telekom pass is 14 days), so it is labelled an example, never a verified offer.
 */
export type ResearchedEntry = ComparisonEntry & { validityDays: number; destinationIso: string };
export const RESEARCHED_COMPARISON: readonly ResearchedEntry[] = [
  { kind: 'roaming', price: 29.95, currency: 'EUR', destination: 'TR', destinationIso: 'TR', allowance: '20 GB', validity: '14', validityDays: 14, provider: 'Telekom Travel & Surf · 2-WeekPass Türkei', sourceUrl: 'https://www.telekom.com/de/newsroom/aktuelles/medieninformationen/2025/02/mit-1-gb-weltweit-gratis-surfen-und-datenpaesse-mit-mehr-volumen', checkedAt: '2026-10-14' },
  { kind: 'other', price: 20.5, currency: 'EUR', destination: 'TR', destinationIso: 'TR', allowance: '20 GB', validity: '30', validityDays: 30, provider: 'Airalo', sourceUrl: 'https://www.airalo.com/turkey-esim', checkedAt: '2026-10-05' },
  { kind: 'pasaport', price: 19.99, currency: 'EUR', destination: 'TR', destinationIso: 'TR', allowance: '20 GB', validity: '30', validityDays: 30, provider: 'Pasaport.io', sourceUrl: 'https://pasaportio1.lovable.app/esim', checkedAt: '2026-10-14' },
];
export function comparisonForPresentation(verified: ComparisonEntry[] | null): readonly (ComparisonEntry & Partial<ResearchedEntry>)[] { return verified ?? RESEARCHED_COMPARISON; }