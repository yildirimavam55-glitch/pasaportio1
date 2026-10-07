import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { promotionBannerQuery, PROMOTION_CHANGE_KEY } from "@/lib/promotion-banner-query";
import { bannerTagline, formatDiscount, PROMO_HEADLINE } from "@/domain/promotions";
import { copyText, PROMO_COPY } from "./promo-copy";

const localizedField = (text: Record<string, string>, key: string, locale: string) => text[`${key}:${locale}`]?.trim() || text[`${key}:en`]?.trim() || text[`${key}:tr`]?.trim() || "";

export function HeroPromotion() {
  const { uiLocale, locale, dir } = useI18n();
  const query = useQuery(promotionBannerQuery);
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const data = query.data;
  useEffect(() => {
    const refresh = () => { void qc.invalidateQueries({ queryKey: ["promotion-banner"] }); };
    const storage = (event: StorageEvent) => { if (event.key === PROMOTION_CHANGE_KEY) refresh(); };
    window.addEventListener(PROMOTION_CHANGE_KEY, refresh);
    window.addEventListener("storage", storage);
    return () => { window.removeEventListener(PROMOTION_CHANGE_KEY, refresh); window.removeEventListener("storage", storage); };
  }, [qc]);
  useEffect(() => { setCopied(false); }, [data?.code]);
  if (!data) return null;
  const c = PROMO_COPY[locale];
  const title = localizedField(data.text, "title", uiLocale) || bannerTagline(data.text, uiLocale);
  const description = localizedField(data.text, "description", uiLocale);
  const conditions = localizedField(data.text, "conditions", uiLocale);
  const discount = (PROMO_HEADLINE[uiLocale] ?? PROMO_HEADLINE["en"] ?? "{discount}").split("|")[0]?.replace("{discount}", formatDiscount(data.discountType, data.discountValue, uiLocale, data.currency)).trim();
  return <aside data-testid="hero-promotion" dir={dir} className="pasaport-hero-promotion rounded-2xl bg-card p-4 text-card-foreground shadow-panel ring-1 ring-border/50 lg:p-5">
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
      <Gift className="size-9 shrink-0 text-primary lg:size-10" />
      <div className="min-w-0">{title && <p className="text-xs font-semibold lg:text-sm">{title}</p>}<p className="font-display text-2xl font-bold leading-tight text-primary lg:text-3xl">{discount}</p></div>
    </div>
    {description && <p className="mt-2 text-xs text-muted-foreground">{description}</p>}
    {data.code && <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <span className="truncate rounded-lg border border-dashed border-primary/35 bg-primary-soft px-3 py-2 font-mono text-base font-bold text-primary" dir="ltr" translate="no">{data.code}</span>
      {data.showCopy && <Button variant="ghost" size="icon" title={copied ? c.copied : c.copy} aria-label={copied ? c.copied : c.copy} onClick={async () => { if (await copyText(data.code ?? "")) { setCopied(true); toast.success(c.copied); } else toast.error(c.copyFailed); }}>{copied ? <Check /> : <Copy />}</Button>}
    </div>}
    {conditions && <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{conditions}</p>}
  </aside>;
}