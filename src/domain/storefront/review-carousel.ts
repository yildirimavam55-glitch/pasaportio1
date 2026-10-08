export const REVIEW_INTERVAL_MS = 7000;
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