import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Info, Minus, Plus, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WhatsAppLogo } from "@/components/travel/WhatsAppLogo";
import { cn } from "@/lib/utils";
import { waLink } from "@/lib/whatsapp";
import type { V2Service } from "@/components/design-v2/V2Shell";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { useCommercePanels } from "./commerce-panels";

export function V2ProductSelectionCard({
  service,
  selected,
  onSelect,
  onDetails,
  detailsLabel,
  className,
  showSelectedCheck = true,
  children,
}: {
  service: V2Service;
  selected: boolean;
  onSelect: () => void;
  onDetails?: (() => void) | undefined;
  detailsLabel?: string | undefined;
  className?: string | undefined;
  showSelectedCheck?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-service={service}
      data-selected={selected || undefined}
      className={cn(
        "relative h-full rounded-xl border bg-card shadow-sm transition-[border-color,background-color,box-shadow]",
        selected && "border-[var(--v2-service)] bg-[color-mix(in_oklab,var(--v2-service)_8%,var(--color-card))] shadow-md ring-1 ring-[var(--v2-service)]",
        className,
      )}
    >
      <Button type="button" variant="ghost" onClick={onSelect} aria-pressed={selected} className="h-full w-full justify-start whitespace-normal rounded-xl p-0 text-left hover:bg-transparent">
        {children}
      </Button>
      {onDetails && (
        <Button type="button" variant="ghost" size="icon" onClick={onDetails} aria-label={detailsLabel} className="absolute right-0.5 top-0.5 z-10 size-9 rounded-full text-muted-foreground hover:bg-secondary">
          <Info className="size-4" />
        </Button>
      )}
      {selected && showSelectedCheck && (
        <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 grid size-6 place-items-center rounded-full bg-[var(--v2-service)] text-primary-foreground shadow-sm">
          <Check className="size-4" strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

export function V2SelectedProductSummary({
  heading,
  facts,
  referenceLayout = false,
  canPurchase = true,
  title,
  subtitle,
  flagIso,
  price,
  quantity,
  inCart,
  addLabel,
  addingLabel,
  addedLabel,
  cartLabel,
  decreaseLabel,
  increaseLabel,
  whatsappLabel,
  onQuantityChange,
  onAdd,
}: {
  heading?: string;
  facts?: Array<{ label: string; value: string }>;
  referenceLayout?: boolean;
  canPurchase?: boolean;
  title: string;
  subtitle: string;
  flagIso?: string | null | undefined;
  price: string;
  quantity: number;
  inCart: boolean;
  addLabel: string;
  addingLabel: string;
  addedLabel: string;
  cartLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
  whatsappLabel: string;
  onQuantityChange: (quantity: number) => void;
  onAdd: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const { setPanel } = useCommercePanels();
  const addingRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);
  const addOnce = () => {
    if (addingRef.current || inCart || !canPurchase) return;
    addingRef.current = true;
    setAdding(true);
    // The existing cart update is synchronous. Give its pending state a paint,
    // without delaying the update beyond the next frame or inferring success from a click.
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = requestAnimationFrame(() => {
        try { onAdd(); } finally {
          addingRef.current = false;
          setAdding(false);
          frameRef.current = null;
        }
      });
    });
  };
  if (inCart) return null;
  return (
    <section aria-label={heading ?? title} data-testid="selected-plan-summary" className={cn(
      "pointer-events-auto w-full rounded-2xl border border-[var(--v2-service)]/40 bg-card/98 shadow-xl backdrop-blur",
      referenceLayout ? "p-4 sm:p-5 lg:w-full" : "p-3 lg:w-[25rem] lg:p-4",
    )}>
      {heading && <h2 className="mb-4 font-display text-lg font-bold text-foreground lg:text-xl">{heading}</h2>}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        {flagIso ? <CountryFlag iso={flagIso} className="mt-0.5 h-7 w-10 rounded-md" /> : <span />}
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <strong className="block font-display text-base text-[var(--v2-service)]">{price}</strong>
          {inCart && <span role="status" className="block text-[11px] font-semibold leading-4 text-[var(--v2-service)]">{addedLabel} ✓</span>}
        </div>
      </div>
      {referenceLayout && facts && facts.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-border/70 py-4 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{fact.label}</dt>
              <dd className="mt-1 break-words text-xs font-semibold text-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className={referenceLayout ? "mt-4 flex flex-wrap items-center gap-3" : "mt-2 flex items-center gap-2"}>
        <div className={cn("flex h-10 shrink-0 items-center rounded-xl border border-border bg-background", referenceLayout && "order-1")} aria-label={`${decreaseLabel} / ${increaseLabel}`}>
          <Button type="button" variant="ghost" size="icon" disabled={adding || quantity <= 1} onClick={() => onQuantityChange(quantity - 1)} aria-label={decreaseLabel} className="size-10 rounded-xl"><Minus className="size-4" /></Button>
          <span className="min-w-6 text-center text-sm font-bold text-foreground">{quantity}</span>
          <Button type="button" variant="ghost" size="icon" disabled={adding || quantity >= 9} onClick={() => onQuantityChange(quantity + 1)} aria-label={increaseLabel} className="size-10 rounded-xl"><Plus className="size-4" /></Button>
        </div>
        {inCart ? (
          <Button onClick={() => setPanel("cart")} variant="default" className={cn("h-10 min-w-0 flex-1 rounded-xl px-3", referenceLayout && "order-3 h-12 w-full flex-auto")}>
            <Check className="size-4 shrink-0" /><span className="truncate">{cartLabel}</span><ArrowRight className="size-4 shrink-0" />
          </Button>
        ) : (
          <Button type="button" onClick={addOnce} disabled={adding || !canPurchase} aria-busy={adding} className={cn("h-10 min-w-0 flex-1 rounded-xl px-3", referenceLayout && "order-3 h-12 w-full flex-auto bg-[var(--v2-service)] font-bold text-primary-foreground hover:opacity-90")}><ShoppingBag className="size-4 shrink-0" /><span className="truncate">{adding ? addingLabel : addLabel}</span></Button>
        )}
        <Button asChild variant="ghost" size="icon" className={cn("size-10 shrink-0 rounded-xl p-0 shadow-sm", referenceLayout && "order-2 ml-auto")} style={{ backgroundColor: "#25D366", color: "#fff" }}>
          <a href={waLink()} target="_blank" rel="noopener noreferrer" aria-label={whatsappLabel}><WhatsAppLogo className="size-5" /></a>
        </Button>
      </div>
    </section>
  );
}