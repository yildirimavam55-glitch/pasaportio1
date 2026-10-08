export const REVIEW_INTERVAL_MS = 6000;
export const REVIEW_TEXT_LIMIT = 180;
export function reviewCapacity(width: number) {
  return width >= 900 ? 3 : width >= 600 ? 2 : 1;
}
export function reviewPositionCount(count: number, capacity: number) {
  return Math.max(1, count - capacity + 1);
}
export function reviewExcerpt(text: string) {
  const characters = Array.from(text);
  return characters.length > REVIEW_TEXT_LIMIT
    ? { text: characters.slice(0, REVIEW_TEXT_LIMIT).join('').trimEnd() + '…', truncated: true }
    : { text, truncated: false };
}
export type ReviewSourceRating = { source: 'Google' | 'Trustpilot'; rating: number; count: number; sourceUrl: string; verified: boolean };
export function cleanSourceRatings(raw: unknown): ReviewSourceRating[] {
  if (!Array.isArray(raw)) return [];
  return ['Google', 'Trustpilot'].flatMap(source => {
    const r = raw.find(v => v && typeof v === 'object' && v.source === source);
    if (!r) return [];
    return [{ source: source as ReviewSourceRating['source'], rating: Number.isFinite(Number(r.rating)) ? Math.min(5, Math.max(0, Number(r.rating))) : 0,
      count: Number.isFinite(Number(r.count)) ? Math.min(10000000, Math.max(0, Math.floor(Number(r.count)))) : 0,
      sourceUrl: typeof r.sourceUrl === 'string' && /^https:\/\//.test(r.sourceUrl) ? r.sourceUrl.slice(0, 500) : '', verified: r.verified === true }];
  });
}
export function combinedSourceRating(raw: ReviewSourceRating[] | undefined) {
  const rows = cleanSourceRatings(raw);
  if (rows.length !== 2 || rows.some(r => !r.verified || !r.sourceUrl || r.count <= 0)) return null;
  const count = rows.reduce((n, r) => n + r.count, 0);
  const rating = rows.reduce((n, r) => n + r.rating * r.count, 0) / count;
  return { rating, displayRating: Math.round(rating * 10) / 10, count };
}
export function starFill(rating: number, index: number) { return Math.max(0, Math.min(1, rating - index)) * 100; }