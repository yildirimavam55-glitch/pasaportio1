/** A product may be published only with a real sale price, completed price review and an available supplier. */
export function isPublishable(row: { sale_price: number | string | null; pricing_review_required: boolean | null; provider_available: boolean | null }): boolean {
  const price = Number(row.sale_price);
  return Number.isFinite(price) && price > 0 && row.pricing_review_required !== true && row.provider_available !== false;
}
