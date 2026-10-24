/**
 * Central photo registry for every currently sellable single-country destination.
 *
 * Photos are stored as immutable CDN assets; the same ISO resolves to the same
 * image on discovery cards and the package-page destination header.
 */
import { getCountryByIso, flagOf } from "@/domain/geo/countries";
import type { Locale } from "@/domain/enums";

type CountryPhotoPointer = { url: string };
type CountryPhotoModules = Record<string, CountryPhotoPointer>;

const photoModules = import.meta.glob<CountryPhotoPointer>(
  "../../assets/countries/*.webp.asset.json",
  { eager: true, import: "default" },
) as CountryPhotoModules;

const portableModules=import.meta.glob<string>("../../assets/countries/portable/*.{jpg,png,webp}",{eager:true,import:"default"});
const portablePhotos=Object.fromEntries(Object.entries(portableModules).map(([path,url])=>[path.match(/\/([A-Z]{2})\./)?.[1],url]));

export type CountryPhoto = {
  iso: string;
  cardImage: string;
  heroImage: string;
  focalX: number;
  focalY: number;
  alt: Record<Locale, string>;
};

function localizedAlt(iso: string): Record<Locale, string> {
  const country = getCountryByIso(iso);
  const territoryNames: Record<string, Record<Locale, string>> = {
    AN: { tr: "Hollanda Antilleri", de: "Niederländische Antillen", en: "Netherlands Antilles" },
    GL: { tr: "Grönland", de: "Grönland", en: "Greenland" },
    IC: { tr: "Kanarya Adaları", de: "Kanarische Inseln", en: "Canary Islands" },
  };
  const fallback = territoryNames[iso] ?? { tr: iso, de: iso, en: iso };
  return {
    tr: `${country?.name.tr ?? fallback.tr} seyahat görünümü`,
    de: `Reiseziel ${country?.name.de ?? fallback.de}`,
    en: `${country?.name.en ?? fallback.en} travel destination`,
  };
}

function isoFromPath(path: string) {
  return path.match(/\/([a-z]{2})\.webp\.asset\.json$/)?.[1]?.toUpperCase() ?? "";
}

export const countryPhotoRegistry: Readonly<Record<string, CountryPhoto>> = Object.freeze(
  Object.fromEntries(
    Object.entries(photoModules).map(([path, pointer]) => {
      const iso = isoFromPath(path);
      return [
        iso,
        {
          iso,
          cardImage: portablePhotos[iso] ?? pointer.url,
          heroImage: pointer.url,
          focalX: 50,
          focalY: 50,
          alt: localizedAlt(iso),
        } satisfies CountryPhoto,
      ];
    }),
  ),
);

export function getCountryPhoto(iso: string | null | undefined) {
  return iso ? countryPhotoRegistry[iso.toUpperCase()] : undefined;
}

/** Future-country fallback; current sellable destinations are required to have a photo. */
export function getCountryPhotoFallback(iso: string) {
  return { flag: flagOf(iso), label: getCountryByIso(iso)?.name.en ?? iso.toUpperCase() };
}

