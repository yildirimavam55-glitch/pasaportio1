import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/i18n";
import { promotionBannerQuery, PROMOTION_CHANGE_KEY } from "@/lib/promotion-banner-query";
import { bannerTagline, formatDiscount, PROMO_HEADLINE } from "@/domain/promotions";
import { copyText, PROMO_COPY } from "./promo-copy";

const localizedField = (text: Record<string, string>, key: string, locale: string) => text[`${key}:${locale}`]?.trim() || text[`${key}:en`]?.trim() || text[`${key}:tr`]?.trim() || "";

export function HeroPromotion() {
  const { uiLocale, locale, dir } = useI18n();
  const query = useQuery(promotionBannerQuery);
  const qc = useQueryClient();
  const isMobile = useIsMobile();
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
   const viewLabel = ({ tr: "Kuponu gör", de: "Gutschein ansehen", en: "View coupon", ar: "عرض القسيمة" } as Record<string, string>)[uiLocale] ?? "View coupon";
   const trigger = <Button variant="outline" className="pasaport-coupon-trigger min-h-11 bg-card text-card-foreground"><Gift className="size-5 text-primary" /><span>{viewLabel}</span></Button>;
   const details = <div className="space-y-3 text-sm"><p className="font-semibold">{discount}</p>{description && <p>{description}</p>}{data.code && <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-muted p-3"><span className="min-w-0 break-all font-semibold" dir="ltr" translate="no">{data.code}</span>{data.showCopy && <Button variant="ghost" size="icon" aria-label={copied ? feedback.copied : feedback.copy} onClick={async () => { if (await copyText(data.code ?? "")) { setCopied(true); toast.success(feedback.copied); } else toast.error(feedback.copyFailed); }}>{copied ? <Check /> : <Copy />}</Button>}</div>}{conditions && <p className="whitespace-pre-line text-muted-foreground">{conditions}</p>}<p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat(uiLocale, { dateStyle: "medium" }).format(new Date(data.endsAt))}</p></div>;
   return <aside data-testid="hero-promotion" dir={dir}>{isMobile ? <Sheet><SheetTrigger asChild>{trigger}</SheetTrigger><SheetContent side="bottom" dir={dir} className="max-h-[80dvh] rounded-t-2xl"><SheetTitle className="mb-4">{title || detailsLabel}</SheetTitle>{details}</SheetContent></Sheet> : <Popover><PopoverTrigger asChild>{trigger}</PopoverTrigger><PopoverContent dir={dir} align="start" className="max-h-[70dvh] w-80 overflow-y-auto"><h2 className="mb-3 font-semibold">{title || detailsLabel}</h2>{details}</PopoverContent></Popover>}</aside>;
}