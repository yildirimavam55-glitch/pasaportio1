import {
  Building2,
  Castle,
  Church,
  Flower2,
  Landmark,
  Palmtree,
  TowerControl,
  type LucideIcon,
} from "lucide-react";

type MotifKey = "arch" | "bridge" | "flower" | "landmark" | "palm" | "skyline" | "temple";

const MOTIF_BY_COUNTRY: Readonly<Record<string, MotifKey>> = {
  AE: "skyline",
  DE: "landmark",
  ES: "palm",
  FR: "landmark",
  GB: "bridge",
  IT: "arch",
  JP: "temple",
  TH: "temple",
  TR: "flower",
  US: "skyline",
};

const ICON_BY_MOTIF: Readonly<Record<MotifKey, LucideIcon>> = {
  arch: Church,
  bridge: TowerControl,
  flower: Flower2,
  landmark: Landmark,
  palm: Palmtree,
  skyline: Building2,
  temple: Castle,
};

export type CountryCardPresentation =
  "symbolic-single-country" | "minimal-single-country" | "neutral-multi-country";

/** One presentation decision for every card; unknown countries intentionally stay minimal. */
export function getCountryCardPresentation(
  countryCode: string | undefined,
  coverageCount: number,
): CountryCardPresentation {
  if (coverageCount !== 1 || !countryCode) return "neutral-multi-country";
  return MOTIF_BY_COUNTRY[countryCode.toUpperCase()]
    ? "symbolic-single-country"
    : "minimal-single-country";
}

/** Decorative only: the flag and localized country name remain the accessible identity. */
export function CountryMotif({ iso }: { iso: string }) {
  const motif = MOTIF_BY_COUNTRY[iso.toUpperCase()];
  if (!motif) return null;
  const Icon = ICON_BY_MOTIF[motif];

  return (
    <span className="country-card-motif" data-motif={motif} aria-hidden="true">
      <Icon strokeWidth={1.15} />
      <span>{iso.slice(0, 2).toUpperCase()}</span>
    </span>
  );
}
