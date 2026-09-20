/**
 * One visual identity per destination.
 *
 * The same ISO always renders the same scene, on the homepage, on the
 * all-countries page and in the package page header. Unknown future ISO codes
 * fall back to a neutral travel scene instead of breaking the page.
 */
import type { ReactNode } from "react";

import { getCountryPhoto, getCountryPhotoFallback } from "./countryPhotos";
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
  if (!photo && import.meta.env.DEV && !warned.has(code)) {
    warned.add(code);
    console.warn(`Missing country photo mapping: ${code}`);
  }
  const fallback = getCountryPhotoFallback(code);
  return (
    <span
      className={`country-scene ${photo ? "has-photo" : "is-fallback"} ${className}`}
      data-country={code}
    >
      {photo ? (
        <img
          src={photo.cardImage}
          alt={photo.alt[locale]}
          width={960}
          height={540}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
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
 * an abstract coverage graphic instead.
 */
const REGION_ART: Record<CoverageRegionKey, ReactNode> = {
  GLOBAL: (
    <>
      <circle cx="50" cy="44" r="30" />
      <path d="M20 44h60M50 14c10 12 10 48 0 60M50 14c-10 12-10 48 0 60M26 26c14 8 34 8 48 0M26 62c14-8 34-8 48 0" />
    </>
  ),
  EUROPE: (
    <>
      <circle cx="50" cy="44" r="16" />
      <path d="M50 12v8M50 68v8M18 44h8M74 44h8M27 21l6 6M67 61l6 6M73 21l-6 6M33 61l-6 6" />
    </>
  ),
  MIDDLE_EAST: (
    <>
      <path d="M22 62c10-26 26-40 46-44-6 12-6 26 0 38-16 6-32 8-46 6Z" />
      <path d="M32 70h44" />
    </>
  ),
  ASIA: (
    <>
      <circle cx="50" cy="40" r="15" />
      <path d="M18 66c12-6 26-9 32-9s20 3 32 9" />
      <path d="M26 24c8 4 16 6 24 6s16-2 24-6" />
    </>
  ),
  AMERICAS: (
    <>
      <path d="M38 14c10 6 18 10 18 18s-14 10-14 18 12 10 12 18-8 12-14 18" />
      <circle cx="50" cy="44" r="30" />
    </>
  ),
  AFRICA: (
    <>
      <path d="M32 16h36l-8 22-10 34-10-34Z" />
      <path d="M22 44h56" />
    </>
  ),
  OCEANIA: (
    <>
      <path d="M18 56c10-8 22-8 32 0s22 8 32 0" />
      <path d="M18 70c10-8 22-8 32 0s22 8 32 0" />
      <circle cx="50" cy="26" r="10" />
    </>
  ),
  MULTI: (
    <>
      <circle cx="34" cy="36" r="14" />
      <circle cx="62" cy="52" r="14" />
      <path d="M18 72h64" />
    </>
  ),
};

export function RegionScene({
  region,
  className = "",
}: {
  region: CoverageRegionKey;
  className?: string;
}) {
  return (
    <span
      className={`country-scene is-region ${className}`}
      data-region={region}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 88"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        preserveAspectRatio="xMidYMid meet"
      >
        {REGION_ART[region] ?? REGION_ART.GLOBAL}
      </svg>
    </span>
  );
}
