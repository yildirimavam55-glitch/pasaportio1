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
export function trustPreviewHost(host: string) { return host === "localhost" || host.startsWith("id-preview--"); }