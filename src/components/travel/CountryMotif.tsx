import type { ReactNode } from "react";

import { countryVisuals, getCountryVisual, type CountryMotifKey } from "./countryVisuals";
import { SUPPORTED_STOREFRONT_COUNTRY_ISOS } from "./supported-country-isos";

export type CountryCardPresentation =
  | "symbolic-single-country"
  | "minimal-single-country"
  | "neutral-multi-country";

const warnedCountryCodes = new Set<string>();

export const missingCountryVisualMappings = SUPPORTED_STOREFRONT_COUNTRY_ISOS.filter(
  (iso) => !getCountryVisual(iso),
);

if (import.meta.env.DEV && missingCountryVisualMappings.length > 0) {
  console.error(`Missing country visual mappings: ${missingCountryVisualMappings.join(", ")}`);
}

export function getCountryCardPresentation(
  countryCode: string | undefined,
  coverageCount: number,
): CountryCardPresentation {
  if (coverageCount !== 1 || !countryCode) return "neutral-multi-country";
  const iso = countryCode.toUpperCase();
  if (getCountryVisual(iso)) return "symbolic-single-country";
  if (import.meta.env.DEV && !warnedCountryCodes.has(iso)) {
    warnedCountryCodes.add(iso);
    console.warn(`Missing country visual mapping: ${iso}`);
  }
  return "minimal-single-country";
}

function MotifArt({ motif }: { motif: CountryMotifKey }) {
  const ground = <path d="M8 78h84" />;
  const mountain = <path d="m7 78 25-32 12 14 15-25 34 43M28 78l16-18" />;
  const skyline = <path d="M12 78V57h13V39h14v39h9V48h17v30h8V29h14v49" />;
  const island = <path d="M8 75c18-8 28 7 44-1s25-1 40-5M55 69V35m0 0c-9-8-18-7-24-1m24 1c7-10 17-11 26-5m-26 5c-3-11 2-20 8-25" />;
  const art: Record<CountryMotifKey, ReactNode> = {
    arch: <><path d="M19 78V33h62v45M31 78V50c0-20 38-20 38 0v28M15 33h70M27 24h46v9" />{ground}</>,
    aurora: <><path d="M9 30c18-18 27 15 46-2s27 3 38-7M13 42c19-13 29 12 45-1s25-1 32-6" />{mountain}</>,
    baobab: <><path d="M49 77c4-17-2-30 3-43M52 36c-7-8-16-8-23-2m22 5c8-13 23-13 30-4M37 32c-2-12 10-20 18-13m11 14c4-10-2-18-10-19" />{ground}</>,
    balloons: <><path d="M26 24c0-18 25-18 25 0 0 11-8 19-13 28-5-9-12-17-12-28Zm8 31h8l-1 8h-6l-1-8ZM61 17c0-13 19-13 19 0 0 8-6 14-10 21-4-7-9-13-9-21Zm6 24h6l-1 6h-4l-1-6Z" />{ground}</>,
    bridge: <><path d="M8 76h84M19 76V31m62 45V31M13 31h72M19 46h62M30 31v15m40-15v15M21 56c15-13 43-13 58 0" /></>,
    cactus: <><path d="M48 78V27c0-8 11-8 11 0v12h7v-8c0-7 10-7 10 0v13c0 5-4 9-9 9h-8v25M48 58H38c-6 0-10-5-10-10V37c0-7 10-7 10 0v7h10" />{ground}</>,
    city: <>{skyline}<path d="M20 57h5m8-12h6m17 10h8m13-19h5" /></>,
    clover: <><path d="M50 76V45M50 48C39 45 26 39 29 28c3-10 16-8 21 2 5-10 18-12 21-2 3 11-10 17-21 20Zm0-4c-10 8-20 3-21-5m21 5c10 8 20 3 21-5" />{ground}</>,
    columns: <><path d="M19 34h62L50 15 19 34Zm5 7h52M28 41v32m15-32v32m14-32v32m15-32v32M18 73h64v7H18z" /></>,
    desert: <><path d="M7 76c20-20 34 2 50-12s25-6 37 2M70 18v30m-10-20h20M64 22l6-8 6 8" /></>,
    fern: <><path d="M52 79C45 58 47 35 62 17M50 66 31 55m18 2 20-15M48 49 32 38m20 2 18-15M53 31 43 21" />{ground}</>,
    gate: <><path d="M18 78V35h64v43M28 78V49h44v29M12 35h76M22 27h56M31 18h38M40 49v29m20-29v29" />{ground}</>,
    harbor: <><path d="M8 77c18-8 27 6 43-1 16-8 25 0 41-5M23 67c10-15 19-25 31-30 3 14 12 24 25 30M54 37V20M54 20l21 9" /></>,
    island: <>{island}</>,
    islands: <>{island}<path d="M14 57c8-4 16-4 24 0m31 4c7-3 13-3 20 0" /></>,
    landscape: <>{mountain}<path d="M17 75c2-18 11-29 20-36M69 75c1-14 7-24 15-31" /></>,
    leaf: <><path d="M51 79V21M50 68 33 54m18 5 19-17M50 47 36 34m15 4 15-14M28 23c14 2 20 11 22 24m23-31c-13 4-19 12-22 24" />{ground}</>,
    mosque: <><path d="M20 78V48h60v30M31 48c2-18 36-18 38 0M15 78V31m-4 0h8m66 47V31m-4 0h8M46 27h8M50 18v9" />{ground}</>,
    mountain: <>{mountain}</>,
    "mountain-city": <>{mountain}<path d="M23 78V62h10v16m32 0V58h12v20" /></>,
    pagoda: <><path d="M14 78h72M27 69h46M31 69V53h38v16M21 53h58L50 39 21 53Zm9-17h40L50 23 30 36Zm12-16h16L50 11 42 20Z" /></>,
    palace: <><path d="M14 78h72M22 78V48h56v30M31 48c1-21 37-21 38 0M42 78V58h16v20M18 48h64M50 20v12m-9 0h18" /></>,
    palm: <>{island}</>,
    pyramid: <><path d="M8 78h84L59 25 32 78M18 78l23-42 18 42M59 25l20 53" /></>,
    savanna: <><path d="M46 78V49m0 0c-17 3-26-6-25-16 10-3 20 0 25 9m0 7c15 2 28-4 30-15-12-5-23-1-30 8M28 78c11-8 34-8 45 0" /></>,
    skyline: <>{skyline}</>,
    steppe: <><path d="M7 76c14-12 28-4 41-10 17-8 28 2 45-4M30 65V40h39v25M25 40h49L50 23 25 40Zm25-17V12" /></>,
    tower: <><path d="M39 78 47 22h6l8 56M43 50h14M38 62h24M31 78h38M40 35h20M50 22v-9" /></>,
    tram: <><path d="M24 69V33h52v36M30 40h18v15H30zm24 0h16v15H54zM20 69h60M33 69l-7 10m41-10 7 10M37 26h26" /></>,
    tropical: <>{island}<path d="M15 69c8-13 17-17 27-17" /></>,
    volcano: <><path d="M11 78h80L63 48l-8 8-8-8-29 30M48 39c-8-8 4-12-3-20m14 22c9-9-3-13 5-24" /></>,
    windmill: <><path d="M40 79h20l-3-43H43l-3 43ZM50 33V9m0 24 23-13M50 33 27 20m23 13 21 15M50 33 29 48" />{ground}</>,
  };
  return <>{art[motif]}</>;
}

/** Decorative only: the flag and localized country name remain the accessible identity. */
export function CountryMotif({ iso }: { iso: string }) {
  const visual = getCountryVisual(iso);
  if (!visual) return null;

  return (
    <span
      className="country-card-motif"
      data-country={iso.toUpperCase()}
      data-motif={visual.motif}
      data-position={visual.position}
      data-tone={visual.tone}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 88" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <MotifArt motif={visual.motif} />
      </svg>
      <span>{iso.slice(0, 2).toUpperCase()}</span>
    </span>
  );
}

export { countryVisuals } from "./countryVisuals";
