import { Check, ChevronLeft, ChevronRight, Link2, Pointer, QrCode, Signal, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type InstallationMethod = "quick" | "qr";

/** Neutral educational pointer; never contains or reveals installation data. */
export function TapIndicator({ className }: { className?: string }) {
  return (
    <span className={cn("install-tap-indicator pointer-events-none absolute z-20 text-foreground/75", className)} aria-hidden="true">
      <Pointer className="size-5 fill-card stroke-[1.8]" />
    </span>
  );
}

export function InstallationMethodSelector({
  value,
  onChange,
  quickLabel,
  qrLabel,
  ariaLabel,
  recommendedLabel,
  compact = false,
}: {
  value: InstallationMethod;
  onChange: (method: InstallationMethod) => void;
  quickLabel: string;
  qrLabel: string;
  ariaLabel: string;
  recommendedLabel?: string;
  compact?: boolean;
}) {
  const options = [
    { value: "quick" as const, label: quickLabel, icon: Link2 },
    { value: "qr" as const, label: qrLabel, icon: QrCode },
  ];
  return (
    <div className={cn("grid grid-cols-2 gap-1 bg-secondary p-1 ring-1 ring-border", compact ? "rounded-full" : "rounded-2xl")} role="tablist" aria-label={ariaLabel}>
      {options.map(({ value: method, label, icon: Icon }) => (
        <Button
          key={method}
          type="button"
          role="tab"
          aria-selected={value === method}
          variant={compact ? "ghost" : value === method ? "default" : "ghost"}
          onClick={() => onChange(method)}
          className={cn(
            "min-w-0 cursor-pointer px-2 transition-colors",
            compact ? "h-8 min-h-8 rounded-full text-[10px] sm:px-3 sm:text-xs" : "min-h-11 rounded-xl text-xs sm:text-sm",
            value === method
              ? "bg-primary-soft text-primary shadow-sm ring-1 ring-primary/25 hover:bg-primary-soft hover:text-primary"
              : "text-muted-foreground hover:bg-card hover:text-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{label}</span>
          {!compact && method === "quick" && recommendedLabel && <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">{recommendedLabel}</span>}
        </Button>
      ))}
    </div>
  );
}

/** Decorative pattern only: it contains no encoded customer or supplier data. */
export function DecorativeQr({ className }: { className?: string }) {
  const cells = Array.from({ length: 81 }, (_, i) => ((i * 37 + (i % 7) * 11) % 5) < 2);
  const finder = (row: number, column: number) =>
    (row < 3 && column < 3) || (row < 3 && column > 5) || (row > 5 && column < 3);
  return (
    <div className={cn("grid size-24 grid-cols-9 gap-[2px] rounded-md bg-card p-1.5", className)} aria-hidden="true">
      {cells.map((on, index) => {
        const row = Math.floor(index / 9);
        const column = index % 9;
        return <span key={index} className={cn("rounded-[1px]", finder(row, column) ? "bg-foreground" : on ? "bg-foreground/80" : "bg-transparent")} />;
      })}
    </div>
  );
}

export function InstallationSuccess({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center" role="status">
      <span className={cn("grid place-items-center rounded-full bg-primary text-primary-foreground motion-safe:animate-in motion-safe:zoom-in-50", compact ? "size-12" : "size-16")}>
        <Check className={compact ? "size-7" : "size-9"} strokeWidth={3} aria-hidden="true" />
      </span>
      <span className={cn("font-bold text-foreground", compact ? "text-[10px]" : "text-sm")}>{label}</span>
    </div>
  );
}

export function StepNavigation({
  previous,
  next,
  onPrevious,
  onNext,
  previousDisabled,
  compact = false,
}: {
  previous: string;
  next: string;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex gap-3", compact && "w-full justify-between")}>
      <Button type="button" variant="outline" size={compact ? "icon" : "lg"} onClick={onPrevious} disabled={previousDisabled} className={cn("min-h-11", !compact && "lg:flex-1")} aria-label={previous}>
        <ChevronLeft className="size-4 rtl:rotate-180" />
        {!compact && <span className="hidden lg:inline">{previous}</span>}
      </Button>
      <Button type="button" variant="default" size={compact ? "icon" : "lg"} onClick={onNext} className={cn("min-h-11", !compact && "flex-1")} aria-label={next}>
        {!compact && next}
        <ChevronRight className="size-4 rtl:rotate-180" />
      </Button>
    </div>
  );
}

export function TravelUsageGuide({ title, lead, steps }: { title: string; lead: string; steps: readonly string[] }) {
  const icons = [Smartphone, Signal, Signal, Check] as const;
  return (
    <section className="mt-8 rounded-2xl bg-card p-5 ring-1 ring-border lg:mt-12 lg:p-7" aria-labelledby="travel-use-title">
      <div className="max-w-2xl">
        <h2 id="travel-use-title" className="font-display text-xl font-bold text-foreground lg:text-2xl">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{lead}</p>
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = icons[index] ?? Check;
          return (
            <li key={step} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl bg-secondary p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon className="size-4" aria-hidden="true" /></span>
              <span className="text-sm leading-relaxed text-foreground"><strong className="me-1 text-primary">{index + 1}.</strong>{step}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
