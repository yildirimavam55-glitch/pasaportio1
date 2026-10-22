/**
 * One visual identity per destination.
 *
 * The same ISO always renders the same scene, on the homepage, on the
 * all-countries page and in the package page header. Unknown future ISO codes
 * fall back to a neutral travel scene instead of breaking the page.
 */
import { useState } from "react";
import { getCountryPhoto, getCountryPhotoFallback } from "./countryPhotos";
import { getRegionPhoto } from "./regionPhotos";
import { useI18n } from "@/i18n";
import type { CoverageRegionKey } from "@/domain/geo/coverage-regions";

const warned = new Set<string>();

export function CountryScene({
  iso,
  className = "",
  eager = false,
}: {
  iso: string;
  className?: string;
  eager?: boolean;
}) {
  const { locale } = useI18n();
  const code = iso.toUpperCase();
  const photo = getCountryPhoto(code);
  // Asset pointers may resolve in Lovable but fail after moving the site to Vercel.
  // Track the failed URL, rather than the country code, to allow later image recovery.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(photo && photo.cardImage !== failedUrl);
  if (!photo && import.meta.env.DEV && !warned.has(code)) {
    warned.add(code);
    console.warn(`Missing country photo mapping: ${code}`);
  }
  const fallback = getCountryPhotoFallback(code);
  return (
    <span
      className={`country-scene ${showPhoto ? "has-photo" : "is-fallback"} ${className}`}
      data-country={code}
    >
      {photo && showPhoto ? (
        <img
          src={photo.cardImage}
          onError={() => setFailedUrl(photo.cardImage)}
          alt={photo.alt[locale]}
          width={960}
          height={540}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          style={{ objectPosition: `${photo.focalX}% ${photo.focalY}%` }}
        />
      ) : (
        <span className="country-scene-fallback" role="img" aria-label={fallback.label}>
          <span aria-hidden="true">{fallback.flag}</span>
          <span>{fallback.label}</span>
        </span>
      )}
    </span>
  );
}

/**
 * Coverage regions never borrow a single country's landmark: each region gets
 * its own real travel photograph from the region photo registry.
 */
export function RegionScene({
  region,
  className = "",
  eager = false,
}: {
  region: CoverageRegionKey;
  className?: string;
  eager?: boolean;
}) {
  const { locale } = useI18n();
  const photo = getRegionPhoto(region);
  return (
    <span
      className={`country-scene is-region ${photo ? "has-photo" : "is-region-fallback"} ${className}`}
      data-region={region}
    >
      {photo ? (
        <img
          src={photo.url}
          alt={photo.alt[locale]}
          width={960}
          height={540}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
        />
      ) : null}
    </span>
  );
}
