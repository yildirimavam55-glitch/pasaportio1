import { ArrowRight, ShieldCheck } from "lucide-react";

import { useServiceAvailability } from "@/components/travel/ServiceAvailability";
import { useI18n } from "@/i18n";
import { REFUND_COPY } from "./refund-copy";

/** Link only when the real legal policy URL is configured — never a placeholder page. */
function PolicyLink({ className }: { className?: string }) {
  const { locale } = useI18n();
  const { settings } = useServiceAvailability();
  const url = settings.refundTrust.policyUrl;
  if (!url) return null;
  const external = url.startsWith("https://");
  return (
    <a href={url} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`inline-flex items-center gap-1 font-semibold text-primary underline-offset-2 hover:underline ${className ?? ""}`}>
      {REFUND_COPY[locale].policy} <ArrowRight className="size-3.5" />
    </a>
  );
}

/** Compact homepage trust card — sits with the existing benefit row. */
export function RefundTrustCard() {
  const { locale } = useI18n();
  const { settings } = useServiceAvailability();
  if (!settings.refundTrust.enabled || !settings.refundTrust.homepage) return null;
  const c = REFUND_COPY[locale];
  return (
    <aside aria-label={c.title} className="mt-3 flex items-start gap-3 rounded-2xl bg-primary-soft px-4 py-3 ring-1 ring-primary/10 lg:mt-4 lg:px-6 lg:py-4">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-card text-primary shadow-sm"><ShieldCheck className="size-5" /></span>
      <div className="min-w-0 text-sm">
        <strong className="block font-display text-foreground">{c.title}</strong>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground lg:text-sm">{c.homeLead}</p>
        <PolicyLink className="mt-1 text-xs lg:text-sm" />
      </div>
    </aside>
  );
}

/** Small product-page note — intentionally quiet so it never competes with package selection. */
export function RefundTrustNote() {
  const { locale } = useI18n();
  const { settings } = useServiceAvailability();
  if (!settings.refundTrust.enabled || !settings.refundTrust.productPage) return null;
  const c = REFUND_COPY[locale];
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
      <ShieldCheck className="size-4 shrink-0 text-primary" />
      <strong className="font-semibold text-foreground">{c.title}</strong>
      <span>· {c.productLead}</span>
      <PolicyLink />
    </p>
  );
}

export { PolicyLink as RefundPolicyLink };
