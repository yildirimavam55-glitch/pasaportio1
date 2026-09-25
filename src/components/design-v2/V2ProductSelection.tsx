import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Info, Minus, Plus, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { V2Service } from "@/components/design-v2/V2Shell";

export function V2ProductSelectionCard({
  service,
  selected,
  onSelect,
  onDetails,
  detailsLabel,
  className,
  children,
}: {
  service: V2Service;
  selected: boolean;
  onSelect: () => void;
  onDetails?: (() => void) | undefined;
  detailsLabel?: string | undefined;
  className?: string | undefined;
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
      {selected && (
        <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 grid size-6 place-items-center rounded-full bg-[var(--v2-service)] text-primary-foreground shadow-sm">
          <Check className="size-4" strokeWidth={3} />
        </span>
      )}
    </div>
  );
}

export function V2SelectedProductSummary({
  title,
  subtitle,
  price,
  quantity,
  inCart,
  addLabel,
  addedLabel,
  cartLabel,
  decreaseLabel,
  increaseLabel,
  onQuantityChange,
  onAdd,
}: {
  title: string;
  subtitle: string;
  price: string;
  quantity: number;
  inCart: boolean;
  addLabel: string;
  addedLabel: string;
  cartLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
  onQuantityChange: (quantity: number) => void;
  onAdd: () => void;
}) {
  return (
    <section aria-label={title} className="pointer-events-auto rounded-2xl border border-[var(--v2-service)]/40 bg-card/98 p-3 shadow-xl backdrop-blur">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <strong className="shrink-0 font-display text-base text-[var(--v2-service)]">{price}</strong>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex h-10 shrink-0 items-center rounded-xl border border-border bg-background" aria-label={`${decreaseLabel} / ${increaseLabel}`}>
          <Button type="button" variant="ghost" size="icon" disabled={quantity <= 1} onClick={() => onQuantityChange(quantity - 1)} aria-label={decreaseLabel} className="size-10 rounded-xl"><Minus className="size-4" /></Button>
          <span className="min-w-6 text-center text-sm font-bold text-foreground">{quantity}</span>
          <Button type="button" variant="ghost" size="icon" disabled={quantity >= 9} onClick={() => onQuantityChange(quantity + 1)} aria-label={increaseLabel} className="size-10 rounded-xl"><Plus className="size-4" /></Button>
        </div>
        {inCart ? (
          <Button asChild variant="default" className="h-10 min-w-0 flex-1 rounded-xl px-3">
            <Link to="/design-v2/cart"><Check className="size-4" /><span className="truncate">{addedLabel} · {cartLabel} →</span></Link>
          </Button>
        ) : (
          <Button type="button" onClick={onAdd} className="h-10 min-w-0 flex-1 rounded-xl px-3"><ShoppingBag className="size-4" /><span className="truncate">{addLabel}</span></Button>
        )}
      </div>
    </section>
  );
}