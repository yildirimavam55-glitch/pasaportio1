import { Plane, SimCard } from "lucide-react";

type ServiceIconProps = { className?: string };

/** Shared customer-facing service symbols. The brand mark remains separate. */
export function EsimServiceIcon({ className }: ServiceIconProps) {
  return <SimCard className={className} aria-hidden="true" />;
}

export function LoungeServiceIcon({ className }: ServiceIconProps) {
  return <Plane className={className} aria-hidden="true" />;
}