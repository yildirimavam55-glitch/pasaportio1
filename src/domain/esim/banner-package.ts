/** Keep price and coverage tied to one catalogue row. */
export function lowestBannerPackage<T extends { salePrice: number | null; currency: string; coverage: string[] }>(rows: T[]) {
  return rows.reduce<T | null>((best, row) => row.salePrice != null && row.salePrice > 0 && row.coverage.length > 0 && (!best || row.salePrice < (best.salePrice ?? Infinity)) ? row : best, null);
}
