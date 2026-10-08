import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/i18n";
import { promotionBannerQuery, PROMOTION_CHANGE_KEY } from "@/lib/promotion-banner-query";
import { bannerTagline, formatDiscount } from "@/domain/promotions";
import { canShowGift } from "@/domain/gift-eligibility";
import { copyText, PROMO_COPY } from "./promo-copy";
const field = (text: Record<string,string>, key: string, locale: string) => text[`${key}:${locale}`]?.trim() || text[`${key}:en`]?.trim() || text[`${key}:tr`]?.trim() || "";
export function HeroPromotion() {
 const { uiLocale, locale, dir } = useI18n(); const query = useQuery(promotionBannerQuery); const qc = useQueryClient(); const mobile = useIsMobile();
 const [open,setOpen] = useState(false); const [copied,setCopied] = useState(false); const [now,setNow] = useState(0); const data = query.data;
 useEffect(() => { setNow(Date.now()); const timer = window.setInterval(() => setNow(Date.now()),1000); return () => clearInterval(timer); },[]);
 useEffect(() => { const refresh = () => { void qc.invalidateQueries({queryKey:["promotion-banner"]}); }; const storage = (e:StorageEvent) => { if(e.key === PROMOTION_CHANGE_KEY) refresh(); }; window.addEventListener(PROMOTION_CHANGE_KEY,refresh);window.addEventListener("storage",storage);return () => {window.removeEventListener(PROMOTION_CHANGE_KEY,refresh);window.removeEventListener("storage",storage);}; },[qc]);
 const eligible = canShowGift(data,!query.isPending && !query.isError && now > 0,now);
 useEffect(() => { if (!eligible) setOpen(false);setCopied(false); },[eligible,data?.code]);
 if (!eligible || !data) return null;
 const c = uiLocale === "ar" ? { copy:"نسخ الرمز",copied:"تم النسخ",copyFailed:"تعذر النسخ" } : PROMO_COPY[locale];
 const labels = ({tr:{open:"Hediyeni aç",close:"Kuponu kapat",details:"Kampanya detayları"},de:{open:"Geschenk öffnen",close:"Gutschein schließen",details:"Aktionsdetails"},en:{open:"Open your gift",close:"Close coupon",details:"Promotion details"},ar:{open:"افتح هديتك",close:"أغلق القسيمة",details:"تفاصيل العرض"}} as Record<string,{open:string;close:string;details:string}>)[uiLocale] ?? {open:"Open your gift",close:"Close coupon",details:"Promotion details"};
 const title = field(data.text,"title",uiLocale) || bannerTagline(data.text,uiLocale) || labels.details;
 const trigger = <Button variant="ghost" onClick={() => setOpen(true)} aria-label={labels.open} className="gift-trigger" data-open={open || undefined}><span className="gift-art" aria-hidden="true"><span className="gift-base"/><span className="gift-lid"><span className="gift-bow"/></span></span><span className="gift-label">{labels.open}</span></Button>;
 const details = <div className="space-y-3 text-sm"><p className="font-semibold">{formatDiscount(data.discountType,data.discountValue,uiLocale,data.currency)}</p>{field(data.text,"description",uiLocale) && <p>{field(data.text,"description",uiLocale)}</p>}<div className="flex items-center justify-between gap-2 rounded border border-border bg-muted p-2"><span dir="ltr" translate="no" className="min-w-0 break-all font-semibold">{data.code}</span><Button size="icon" variant="ghost" aria-label={copied?c.copied:c.copy} onClick={async()=>{if(await copyText(data.code ?? "")){setCopied(true);toast.success(c.copied);}else toast.error(c.copyFailed);}}>{copied?<Check/>:<Copy/>}</Button></div>{field(data.text,"conditions",uiLocale) && <p className="whitespace-pre-line text-muted-foreground">{field(data.text,"conditions",uiLocale)}</p>}<p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat(uiLocale,{dateStyle:"medium"}).format(new Date(data.endsAt))}</p></div>;
 return <aside data-testid="hero-promotion" dir={dir}>{mobile?<Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild>{trigger}</SheetTrigger><SheetContent side="bottom" dir={dir} className="max-h-[80dvh] overflow-y-auto"><SheetTitle className="mb-4">{title}</SheetTitle>{details}</SheetContent></Sheet>:<Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild>{trigger}</PopoverTrigger><PopoverContent side="top" align="end" dir={dir} className="gift-ticket-panel max-h-[70dvh] w-72 overflow-y-auto"><div className="mb-2 flex items-center justify-between gap-2"><h2 className="font-semibold">{title}</h2><Button size="icon" variant="ghost" aria-label={labels.close} onClick={()=>setOpen(false)}><X className="size-4"/></Button></div>{details}</PopoverContent></Popover>}</aside>;
}
