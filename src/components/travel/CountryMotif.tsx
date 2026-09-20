import {
  Building2,
  Castle,
  Church,
  Flower2,
  Landmark,
  MapPin,
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

/** Decorative only: the flag and localized country name remain the accessible identity. */
export function CountryMotif({ iso }: { iso: string }) {
  const motif = MOTIF_BY_COUNTRY[iso.toUpperCase()];
  const Icon = motif ? ICON_BY_MOTIF[motif] : MapPin;

  return (
    <span className="country-card-motif" data-motif={motif ?? "fallback"} aria-hidden="true">
      <Icon strokeWidth={1.15} />
      <span>{iso.slice(0, 2).toUpperCase()}</span>
    </span>
  );
}