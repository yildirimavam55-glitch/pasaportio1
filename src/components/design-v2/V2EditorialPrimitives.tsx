import type { ReactNode } from "react";
import { CataloguePhoto } from "./CataloguePhoto";

export function TrustRow({ items, compact = false }: { items: Array<{ icon: ReactNode; label: string }>; compact?: boolean }) {
  if (!items.length) return null;
  return (
    <ul className={`${compact ? "mt-2" : "mt-4"} flex divide-x divide-border lg:-mt-1 lg:w-full lg:rounded-2xl lg:bg-card lg:px-5 lg:py-5 lg:shadow-card lg:ring-1 lg:ring-border`}>
      {items.map((item) => (
        <li key={item.label} className={`flex min-w-0 flex-1 flex-col items-center ${compact ? "gap-0.5 py-1" : "gap-1"} px-1.5 text-center text-[10px] font-medium leading-tight text-foreground lg:flex-row lg:justify-center lg:gap-3 lg:px-5 lg:text-sm`}>
          <span className={`text-[var(--v2-service)] ${compact ? "[&_svg]:size-[18px]" : "[&_svg]:size-5"} lg:[&_svg]:size-6`}>{item.icon}</span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between gap-2 lg:mb-4 lg:mt-12">
      <h2 className="min-w-0 font-display text-base font-bold text-foreground lg:text-3xl">{children}</h2>
      {action && <span className="shrink-0 whitespace-nowrap">{action}</span>}
    </div>
  );
}

export function HowItWorks({ title, steps }: { title: string; steps: Array<{ t: string; s: string; image?: string | undefined; media?:ReactNode }> }) {
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <ol className={`grid gap-3 border-b border-border pb-2 ${steps.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
        {steps.map((step, i) => (
          <li key={step.t} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 gap-y-0.5">
            {step.media ? step.media : step.image ? <CataloguePhoto src={step.image} alt={step.t} className="row-span-2 size-10 object-contain" /> : <span className="row-span-2 grid size-7 place-items-center rounded-full bg-[var(--v2-service)] font-display text-xs font-bold text-primary-foreground">{i + 1}</span>}
            <span className="text-[11px] font-bold leading-tight text-foreground">{step.t}</span>
            <span className="text-[9px] leading-snug text-muted-foreground">{step.s}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

