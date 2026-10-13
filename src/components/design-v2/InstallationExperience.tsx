import { Check, ChevronLeft, ChevronRight, Link2, Pointer, QrCode, Signal, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";
import { installationStepState } from './installation-step-navigation';

const PHONE_COPY = localize({
  tr: { link: "Link ile kur", quickTab: "Link ile", qrTab: "QR kodu" },
  de: { link: "Per Link installieren", quickTab: "Per Link", qrTab: "QR-Code" },
  en: { link: "Install via link", quickTab: "Via link", qrTab: "QR code" },
});

export function useInstallationLabels() {
  const { locale } = useI18n();
  return PHONE_COPY[locale];
}

/** One safe screen for both educational phones; credentials remain account-only. */
export function InstallationPhone({ children, android = false, phase }: { children: ReactNode; android?: boolean; phase: string }) {
  return (
    <div className="installation-phone" data-install-phone aria-hidden="true">
      <span className="installation-notch" />
      <div className="installation-screen" data-install-screen>
        <div key={phase} data-install-content className="installation-content motion-safe:animate-in motion-safe:fade-in">{children}</div>
      </div>
      <span className="installation-home-indicator" data-platform={android ? "android" : "ios"} />
    </div>
  );
}

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
             compact ? "h-auto min-h-11 rounded-full text-xs sm:px-3" : "h-auto min-h-11 rounded-xl text-sm",
             "whitespace-normal py-2",
            value === method
              ? "bg-primary-soft text-primary shadow-sm ring-1 ring-primary/25 hover:bg-primary-soft hover:text-primary"
              : "text-muted-foreground hover:bg-card hover:text-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
           <span className="min-w-0 text-center leading-snug">{label}</span>
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
    <div className={cn("installation-qr grid grid-cols-9 gap-[2px] rounded-md bg-card", className)} dir="ltr" aria-hidden="true">
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
       <span className="min-w-0 text-sm font-bold text-foreground">{label}</span>
    </div>
  );
}

export function StepNavigation({
  previous,
  next,
  steps,
  current,
  onSelect,
  stepLabel,
}: {
  previous: string;
  next: string;
  steps: readonly { label: string }[];
  current: number;
  onSelect: (step: number) => void;
  stepLabel: string;
}) {
  const state = installationStepState(current, steps.length);
  return (
    <nav className="installation-step-nav" data-install-step-nav aria-label={stepLabel} dir="ltr" style={{'--step-controls':steps.length+2,'--step-gaps':`${(steps.length+1)*4}px`} as import('react').CSSProperties}>
      <Button type="button" variant="outline" size="icon" onClick={() => onSelect(state.previous)} disabled={state.previousDisabled} className="installation-step-control" aria-label={previous} title={previous}>
        <ChevronLeft className="size-4" />
      </Button>
      <div className="installation-step-numbers">
        {steps.map((item,index) => <Button key={index} type="button" variant={index === state.current ? 'default' : 'outline'} size="icon" className="installation-step-control" onClick={() => onSelect(index)} aria-label={`${stepLabel} ${index+1}: ${item.label}`} aria-current={index === state.current ? 'step' : undefined} title={item.label}>{index+1}</Button>)}
      </div>
      <Button type="button" variant="outline" size="icon" onClick={() => onSelect(state.next)} disabled={state.nextDisabled} className="installation-step-control" aria-label={next} title={next}>
        <ChevronRight className="size-4" />
      </Button>
    </nav>
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
