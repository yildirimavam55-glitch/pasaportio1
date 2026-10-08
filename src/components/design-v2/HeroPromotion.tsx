import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [now, setNow] = useState(0);
  const data = query.data;
  useEffect(() => {
    const refresh = () => { void qc.invalidateQueries({ queryKey: ["promotion-banner"] }); };
    const storage = (event: StorageEvent) => { if (event.key === PROMOTION_CHANGE_KEY) refresh(); };
    window.addEventListener(PROMOTION_CHANGE_KEY, refresh);
    window.addEventListener("storage", storage);
    return () => { window.removeEventListener(PROMOTION_CHANGE_KEY, refresh); window.removeEventListener("storage", storage); };
  }, [qc]);
  useEffect(() => { setCopied(false); }, [data?.code]);
  useEffect(() => {
    if (!data?.endsAt) return;
    const delay = new Date(data.endsAt).getTime() - Date.now();
    if (delay <= 0) { setNow(Date.now()); return; }
    const timer = window.setTimeout(() => { setNow(Date.now()); void qc.invalidateQueries({ queryKey: ["promotion-banner"] }); }, Math.min(delay, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [data?.endsAt, qc]);
  if (!data || (now && new Date(data.endsAt).getTime() <= now)) return null;
   const c = PROMO_COPY[locale];
   const feedback = uiLocale === "ar" ? { copy: "نسخ الرمز", copied: "تم نسخ الرمز", copyFailed: "تعذر النسخ" } : c;
  const title = localizedField(data.text, "title", uiLocale) || bannerTagline(data.text, uiLocale);
  const description = localizedField(data.text, "description", uiLocale);
  const conditions = localizedField(data.text, "conditions", uiLocale);
  const discount = (PROMO_HEADLINE[uiLocale] ?? PROMO_HEADLINE["en"] ?? "{discount}").split("|")[0]?.replace("{discount}", formatDiscount(data.discountType, data.discountValue, uiLocale, data.currency)).trim();
   const detailsLabel = ({ tr: "Kampanya detayları", de: "Aktionsdetails", en: "Promotion details", ar: "تفاصيل العرض" } as Record<string, string>)[uiLocale] ?? "Promotion details";
   return <aside data-testid="hero-promotion" dir={dir} className="pasaport-hero-promotion bg-card text-card-foreground shadow-panel ring-1 ring-border/50">
     <div className="pasaport-promotion-strip">
       <Gift className="shrink-0 text-primary" aria-hidden="true" />
       <Popover><PopoverTrigger asChild><Button variant="ghost" className="pasaport-promotion-discount min-w-0 h-11 w-auto px-0 font-normal" aria-label={detailsLabel}><span className="truncate">{discount}</span></Button></PopoverTrigger><PopoverContent dir={dir} className="max-h-72 max-w-[calc(100vw-32px)] overflow-y-auto text-sm" align="end"><h2 className="font-semibold">{title || detailsLabel}</h2>{description && <p className="mt-2">{description}</p>}{conditions && <p className="mt-2 whitespace-pre-line text-muted-foreground">{conditions}</p>}<p className="mt-2 text-xs text-muted-foreground">{new Intl.DateTimeFormat(uiLocale, { dateStyle: "medium" }).format(new Date(data.endsAt))}</p></PopoverContent></Popover>
       {data.code && <span className="pasaport-promotion-code font-semibold" dir="ltr" translate="no" title={data.code}>{data.code}</span>}
        {data.code && data.showCopy && <Button variant="ghost" size="icon" title={copied ? feedback.copied : feedback.copy} aria-label={copied ? feedback.copied : feedback.copy} onClick={async () => { if (await copyText(data.code ?? "")) { setCopied(true); toast.success(feedback.copied); } else toast.error(feedback.copyFailed); }}>{copied ? <Check /> : <Copy />}</Button>}
     </div>
  </aside>;
}