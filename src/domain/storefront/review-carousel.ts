import { isPreviewHost } from '@/security/headers';
export function reviewDesignPreviewHost(host: string) {
  return isPreviewHost(host) || /^preview--[a-z0-9-]+\.lovable\.app$/i.test(host);
}
export const REVIEW_INTERVAL_MS = 6000;
export const REVIEW_TEXT_LIMIT = 180;
export function reviewDotIndices(count: number, active: number) {
  const size = Math.min(5, Math.max(0, count));
  const start = Math.max(0, Math.min(active - 2, count - size));
  return Array.from({ length: size }, (_, index) => start + index);
}
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

type LocalizedReview = { originalLanguage?: string; text: Record<string, unknown>; reviewSource?: string };
export function reviewLanguagePresentation(review: LocalizedReview, locale: string) {
  const originalLanguage = review.originalLanguage ?? 'en';
  const originalValue = review.text[originalLanguage], localizedValue = review.text[locale];
  const originalText = typeof originalValue === 'string' ? originalValue.trim() : '';
  const localizedText = typeof localizedValue === 'string' ? localizedValue.trim() : '';
  const translated = locale !== originalLanguage && Boolean(localizedText) && localizedText !== originalText;
  return { text: localizedText || originalText, originalText, originalLanguage, translated,
    source: review.reviewSource ?? 'Direct', priority: originalLanguage === locale ? 0 : translated ? 1 : 2 };
}
export function reviewRatingSummary(raw: ReviewSourceRating[] | undefined, sampleMode: boolean) {
  return combinedSourceRating(raw) ?? (sampleMode ? { rating: 4.8, displayRating: 4.8, count: 210 } : null);
}