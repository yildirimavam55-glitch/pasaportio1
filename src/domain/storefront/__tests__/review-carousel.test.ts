import { describe, expect, it } from 'vitest';
import { REVIEW_INTERVAL_MS, reviewCapacity, reviewPositionCount, reviewExcerpt } from '../review-carousel';
describe('approved testimonial behavior', () => {
  it('advances approximately every seven seconds', () => expect(REVIEW_INTERVAL_MS).toBe(7000));
  it('fits three complete desktop cards', () => expect(reviewCapacity(1100)).toBe(3));
  it('fits two tablet cards', () => expect(reviewCapacity(720)).toBe(2));
  it.each([360, 390, 430])('fits one full mobile card at %s', width => expect(reviewCapacity(width)).toBe(1));
  it('hides unnecessary navigation for three desktop examples', () => expect(reviewPositionCount(3, 3)).toBe(1));
  it('advances by one card on mobile', () => expect(reviewPositionCount(3, 1)).toBe(3));
  it('does not expand short reviews', () => expect(reviewExcerpt('A short review.')).toEqual({ text: 'A short review.', truncated: false }));
  it('offers expansion only beyond the text limit', () => expect(reviewExcerpt('x'.repeat(181))).toEqual({ text: 'x'.repeat(180) + '…', truncated: true }));
});