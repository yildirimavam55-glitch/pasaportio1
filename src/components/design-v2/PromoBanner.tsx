import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, TicketPercent, X } from "lucide-react";
import { toast } from "sonner";
import { promotionBannerQuery } from "@/lib/promotion-banner-query";
import { bannerHeadline, bannerParts, bannerTagline, formatDiscount, isStructuredBanner } from "@/domain/promotions";
import { useI18n } from "@/i18n";
import { getActiveUiLocale } from "@/i18n/overlay";
const pick = <T,>(l: string, v: Record<string, T>): T => v[l] ?? v["tr"]!;
import { PROMO_COPY, copyText } from "./promo-copy";

const DISMISS_KEY = "travely.promo.dismissed";

/** Compact storefront promotion strip under the header; content comes only from Admin. */
export function PromoBanner() {
  const { locale } = useI18n();
  const c = pick(locale, PROMO_COPY);
  const banner = useQuery(promotionBannerQuery);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { try { setDismissed(window.sessionStorage.getItem(DISMISS_KEY)); } catch { /* ignore */ } }, []);

  const data = banner.data;
  if (!data || dismissed === data.id) return null;
  const ui = getActiveUiLocale();
  const template = bannerHeadline(data.text, ui, locale);
  const parts = bannerParts(template, formatDiscount(data.discountType, data.discountValue, ui, data.currency), data.code);
  const tagline = isStructuredBanner(data.text) ? bannerTagline(data.text, ui) : "";

  const onCopy = async () => {
    if (!data.code) return;
    const ok = await copyText(data.code);
    if (ok) { setCopied(true); toast.success(c.copied); window.setTimeout(() => setCopied(false), 1800); }
    else toast.error(c.copyFailed);
  };
  const dismiss = () => { try { window.sessionStorage.setItem(DISMISS_KEY, data.id); } catch { /* ignore */ } setDismissed(data.id); };

  return (
    <div role="region" aria-label={parts.before} className="mt-2 mb-1 flex min-h-11 items-center gap-2 rounded-xl border border-primary/15 bg-accent-soft px-3 py-1.5 text-primary">
      <TicketPercent className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-[13px] font-semibold leading-snug [overflow-wrap:anywhere] sm:text-sm">
        {parts.before}
        {parts.code && <strong className="font-display font-extrabold tracking-wide" translate="no">{parts.code}</strong>}
        {parts.after}
        {tagline && <span className="block text-[12px] font-medium text-primary/80" dir="auto">{tagline}</span>}
      </p>
      {parts.code && data.showCopy && (
        <button type="button" onClick={onCopy} aria-label={copied ? c.copied : c.copy} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-primary/10">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      )}
      <button type="button" onClick={dismiss} aria-label={c.close} className="grid size-9 shrink-0 place-items-center rounded-full text-primary/70 hover:bg-primary/10">
        <X className="size-4" />
      </button>
    </div>
  );
}
