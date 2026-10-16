import type { V2Section } from './v2';
import type { CoverageRegionKey } from '@/domain/geo/coverage-regions';

/** Presentation overrides never decide catalogue eligibility or pricing. */
export function homepageImageId(section: V2Section, key: string): string | null {
  return section.imageOverrides?.[key.toUpperCase()] ?? section.items.find(item => item.entity === key.toUpperCase())?.mediaId ?? (key === 'GLOBAL' ? section.mediaId : null);
}
export function uniqueDestinations<T extends { iso: string }>(rows: T[]): T[] {
  return [...new Map(rows.map(row => [row.iso, row])).values()];
}
export function uniqueRegions<T extends { region: CoverageRegionKey }>(rows: T[]): T[] {
  return [...new Map(rows.map(row => [row.region, row])).values()];
}
export const HOMEPAGE_IMAGE_TYPES = ['image/jpeg', 'image/webp', 'image/avif', 'image/png', 'image/svg+xml'] as const;
export const MAX_HOMEPAGE_IMAGE_BYTES = 10 * 1024 * 1024;
export function imageUploadError(file: { type: string; size: number }): string | null {
  if (!(HOMEPAGE_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'JPEG, WebP, AVIF, PNG veya SVG görsel seçin.';
  if (file.size <= 0 || file.size > MAX_HOMEPAGE_IMAGE_BYTES) return 'Dosya boş olamaz ve 10 MB sınırını aşamaz.';
  return null;
}