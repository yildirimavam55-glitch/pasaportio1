import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Copy, Gift, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/i18n";
import { promotionBannerQuery, PROMOTION_CHANGE_KEY } from "@/lib/promotion-banner-query";
import { formatDiscount } from "@/domain/promotions";
import { canShowGift } from "@/domain/gift-eligibility";
import { useCart } from "@/domain/cart/store";
import { copyText, PROMO_COPY } from "./promo-copy";
import { COMMERCE_COPY } from "./commerce-copy";
import { VOUCHER_COPY } from "./voucher-copy";
import { useCommercePanels } from "./commerce-panels";
import { useCartCoupon } from "./CartCoupon";
import { money } from "./V2Shell";
const field = (text: Record<string,string>, key: string, locale: string) => text[`${key}:${locale}`]?.trim() || text[`${key}:en`]?.trim() || text[`${key}:tr`]?.trim() || "";
export function HeroPromotion() {
  const { uiLocale, locale, dir } = useI18n();
  const query = useQuery(promotionBannerQuery); const qc = useQueryClient(); const mobile = useIsMobile();
  const { panel, setPanel } = useCommercePanels();
  const open = panel === "coupon";
  const [copied, setCopied] = useState(false); const [submitted, setSubmitted] = useState(false);
  const [now, setNow] = useState(0); const data = query.data;
  const { lines } = useCart(); const coupon = useCartCoupon(lines);
   const c = PROMO_COPY[locale]; const labels = COMMERCE_COPY[locale]; const voucher = VOUCHER_COPY[locale];
  useEffect(() => { setNow(Date.now()); const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { const refresh = () => { void qc.invalidateQueries({queryKey:["promotion-banner"]}); }; const storage = (e:StorageEvent) => { if(e.key === PROMOTION_CHANGE_KEY) refresh(); }; window.addEventListener(PROMOTION_CHANGE_KEY,refresh);window.addEventListener("storage",storage);return () => {window.removeEventListener(PROMOTION_CHANGE_KEY,refresh);window.removeEventListener("storage",storage);}; },[qc]);
  const eligible = canShowGift(data,!query.isPending && !query.isError && now > 0,now);
  useEffect(() => { if (!eligible && open) setPanel(null); setCopied(false); setSubmitted(false); },[eligible,data?.code]);
  useEffect(() => { if (!open) { setCopied(false); setSubmitted(false); } },[open]);
  if (!eligible || !data) return null;
  const ticket = ({tr:{title:"Sana özel bir indirim",action:"Kuponunu keşfet"},de:{title:"Ein Rabatt für dich",action:"Gutschein entdecken"},en:{title:"A discount for you",action:"Discover your coupon"},ar:{title:"خصم خاص لك",action:"اكتشف قسيمتك"}} as Record<string,{title:string;action:string}>)[uiLocale] ?? {title:"A discount for you",action:"Discover your coupon"};
  const failure = submitted && coupon.code === data.code && !coupon.pending ? coupon.error ? c.errors.NETWORK : coupon.result && !coupon.result.ok ? c.errors[coupon.result.reason].replace("{min}", money(coupon.result.minOrder ?? 0, data.currency, uiLocale)) : null : null;
  const applied = submitted && coupon.code === data.code && !coupon.pending && coupon.result?.ok;
  const expiry = data.endsAt && Number.isFinite(Date.parse(data.endsAt)) ? new Intl.DateTimeFormat(uiLocale, { dateStyle: "medium" }).format(new Date(data.endsAt)) : null;
  return <aside data-testid="hero-promotion" dir={dir}>
    <Sheet open={open} onOpenChange={(value) => setPanel(value ? "coupon" : null)}>
      <SheetTrigger asChild><Button variant="ghost" aria-label={`${ticket.title} — ${ticket.action}`} className="hero-coupon-ticket"><Gift className="coupon-ticket-icon" aria-hidden="true"/><span className="coupon-ticket-copy"><strong>{ticket.title}</strong><span>{ticket.action}<ArrowRight className="coupon-ticket-arrow" aria-hidden="true"/></span></span></Button></SheetTrigger>
      <SheetContent side="bottom" dir={dir} showCloseButton={false} aria-describedby={undefined} className={`coupon-open-panel ${mobile ? "coupon-open-mobile" : "coupon-open-desktop"}`}>
        <div className="coupon-panel-header"><div className="flex min-w-0 items-center gap-2"><Gift className="size-4 shrink-0" aria-hidden="true"/><SheetTitle className="coupon-panel-title">{field(data.text,"title",uiLocale) || labels.heading}</SheetTitle></div><SheetClose asChild><Button variant="ghost" size="icon" aria-label={c.close} className="coupon-panel-close"><X className="size-5"/></Button></SheetClose></div>
        <div className="coupon-voucher">
          <div className="coupon-voucher-benefit">
            <p className="coupon-benefit"><bdi>{formatDiscount(data.discountType,data.discountValue,uiLocale,data.currency)}</bdi> <span>{c.discount}</span></p>
            <p className="coupon-support">{field(data.text,"description",uiLocale) || voucher.journey}</p>
          </div>
          <div className="coupon-code-ticket"><span dir="ltr" translate="no" className="min-w-0 break-all text-lg font-bold">{data.code}</span>{data.showCopy && <Button size="icon" variant="ghost" aria-label={copied?c.copied:c.copy} onClick={async()=>{if(await copyText(data.code ?? "")){setCopied(true);toast.success(c.copied);}else toast.error(c.copyFailed);}}>{copied?<Check className="size-4"/>:<Copy className="size-4"/>}</Button>}</div>
        </div>
        <Button className="coupon-apply w-full whitespace-normal" disabled={coupon.pending} onClick={() => { coupon.apply(data.code ?? ""); setSubmitted(true); }}>{coupon.pending ? c.applying : applied ? labels.applied : voucher.apply}</Button>
        {!lines.length && <p role="status" className="text-sm">{submitted ? labels.saved : labels.empty}</p>}
        {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
        {applied && <p role="status" className="text-sm">{labels.applied}</p>}
        {(field(data.text,"conditions",uiLocale) || expiry) && <div className="coupon-conditions">{field(data.text,"conditions",uiLocale) && <p className="whitespace-pre-line">{field(data.text,"conditions",uiLocale)}</p>}{expiry && <p>{labels.expiry}: {expiry}</p>}</div>}
      </SheetContent>
    </Sheet>
  </aside>;
}
