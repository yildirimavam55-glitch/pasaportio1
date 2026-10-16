import { useState } from 'react';
import type { V2Section } from '@/domain/storefront/v2';
import { homepageImageId } from '@/domain/storefront/homepage-media';
import { COVERAGE_REGION_ORDER, COVERAGE_REGION_LABELS } from '@/domain/geo/coverage-regions';
import { countryPhotoRegistry } from '@/components/travel/countryPhotos';
import { getRegionPhoto } from '@/components/travel/regionPhotos';
import { getCountryByIso } from '@/domain/geo/countries';
import { MediaField } from './MediaPicker';

/** All assignments stay inside the existing draft/versioned storefront document. */
export function HomepageImagesEditor({ section, onChange }: { section: V2Section; onChange: (patch: Partial<V2Section>) => void }) {
  const regional = section.type === 'REGION_DISCOVERY';
  const [key, setKey] = useState(regional ? 'EUROPE' : section.items[0]?.entity || 'TR');
  const keys = regional ? COVERAGE_REGION_ORDER : Object.keys(countryPhotoRegistry).sort();
  const label = (id: string) => regional ? COVERAGE_REGION_LABELS[id as keyof typeof COVERAGE_REGION_LABELS]?.tr ?? id : getCountryByIso(id)?.name.tr ?? id;
  const set = (id: string | null) => {
    const overrides = { ...section.imageOverrides };
    if (id) overrides[key] = id; else delete overrides[key];
    // Explicit reset clears any legacy item/global media assignment for this identity too.
    onChange({ imageOverrides: overrides, items: section.items.map(item => item.entity === key ? { ...item, mediaId: null } : item), ...(!id && key === 'GLOBAL' ? { mediaId: null } : {}) });
  };
  const fallback = regional ? getRegionPhoto(key as typeof COVERAGE_REGION_ORDER[number])?.url : countryPhotoRegistry[key]?.cardImage;
  return <div className="space-y-3 border-t border-border pt-3">
    <label className="block text-xs font-semibold">{regional ? 'Bölge / Global görseli' : 'Ülke görseli · sabit ISO'}<select className="admin-field mt-1 w-full" value={key} onChange={event => setKey(event.target.value)}>{keys.map(id => <option key={id} value={id}>{label(id)} · {id}</option>)}</select></label>
    <MediaField label={`${label(key)} · ${key}`} value={homepageImageId(section, key)} category={regional ? 'GLOBAL' : 'DESTINATION'} fallbackUrl={fallback} recommendation="JPEG / WebP / AVIF · en az 800 × 600 önerilir · kartta 1.8:1 kırpma" hint="Kaldırmak varsayılan görseli geri getirir. Değişiklik yalnız taslak kaydedilip içerik yayınlandığında müşteriye görünür; fiyat ve kapsam değişmez." onChange={set} />
  </div>;
}