import type { CSSProperties, ReactNode } from "react";
import { Headphones, ShieldCheck, Smartphone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { waLink } from "@/lib/whatsapp";
import { StorefrontIcon } from "@/domain/storefront/icons";
import { useI18n } from "@/i18n";
import { HeroDeviceCompatibility } from "@/components/travel/DeviceCompatibility";
import { HeroPromotion } from "./HeroPromotion";
import { v2ItemText, v2Text, type V2Section } from "@/domain/storefront/v2";
import type { ImageDisplay } from "@/domain/storefront/image-display";
import terraceDesktop from "@/assets/pasaport-summit-desktop.webp";
import terraceMobile from "@/assets/pasaport-summit-mobile.webp";

const COPY = {
  tr: { eyebrow: "SINIRSIZ SEYAHAT ÖZGÜRLÜĞÜ", title: "Her yerde bağlantıda kal.", subtitle: "Seyahatin için kolay ve güvenilir eSIM.", search: "Nereye seyahat ediyorsun?", delivery: "Anında teslimat", coverage: "Global bağlantı", support: "WhatsApp destek" },
  de: { eyebrow: "GRENZENLOSE REISEFREIHEIT", title: "Überall verbunden bleiben.", subtitle: "Einfache, zuverlässige eSIM für deine Reise.", search: "Wohin reist du?", delivery: "Sofortige Lieferung", coverage: "Global verbunden", support: "WhatsApp-Support" },
  en: { eyebrow: "TRAVEL WITHOUT LIMITS", title: "Stay connected everywhere.", subtitle: "An easy, reliable eSIM for your trip.", search: "Where are you travelling?", delivery: "Instant delivery", coverage: "Global connectivity", support: "WhatsApp support" },
  ar: { eyebrow: "حرية السفر بلا حدود", title: "ابقَ متصلاً أينما كنت.", subtitle: "eSIM سهلة وموثوقة لرحلتك.", search: "إلى أين تسافر؟", delivery: "تسليم فوري", coverage: "اتصال عالمي", support: "دعم واتساب" },
};
const SUMMIT_COPY = {
  tr: { title: "Seyahatte internetin hazır.", subtitle: "190+ ülkede eSIM ile bağlantıda kal.", delivery: "Hızlı teslimat", refund: "14 gün iade", setup: "Kolay kurulum", support: "WhatsApp destek" },
  de: { title: "Dein Internet für unterwegs.", subtitle: "Mit eSIM in über 190 Ländern verbunden.", delivery: "Schnelle Lieferung", refund: "14 Tage Rückgabe", setup: "Einfache Einrichtung", support: "WhatsApp-Support" },
  en: { title: "Your travel internet is ready.", subtitle: "Stay connected with eSIM in 190+ countries.", delivery: "Fast delivery", refund: "14-day refund", setup: "Easy setup", support: "WhatsApp support" },
  ar: { title: "إنترنت رحلتك جاهز.", subtitle: "ابقَ متصلاً عبر eSIM في أكثر من 190 دولة.", delivery: "تسليم سريع", refund: "استرداد خلال 14 يوماً", setup: "إعداد سهل", support: "دعم واتساب" },
};
const oldTitles = ["Yurt dışında bağlantıda kal.", "Im Ausland verbunden bleiben.", "Stay connected abroad.", ...Object.values(COPY).map((copy) => copy.title)];

export function PasaportEsimHero({ section, image, mobileImage, benefits, children }: { section: V2Section; image: string; mobileImage?: string | undefined; benefits?: V2Section; children: ReactNode }) {
  const { locale, uiLocale } = useI18n();
  const c = SUMMIT_COPY[uiLocale as keyof typeof SUMMIT_COPY] ?? SUMMIT_COPY[locale];
  const storedTitle = v2Text(section, "title", locale);
  const useApprovedCopy = !storedTitle || oldTitles.includes(storedTitle) || oldTitles.includes(section.text?.["title"]?.[locale] ?? "");
  // Replace the previous shipped hero fixture only; future CMS-selected media remains authoritative.
  const legacyMedia = section.mediaId === "2096d4af-5b89-49ad-b19f-7ca95ec54160" || section.mediaId === "builtin:esim-hero";
   const heroImage = legacyMedia ? terraceDesktop : image;
   const heroMobile = !section.mobileMediaId || section.mobileMediaId === "2096d4af-5b89-49ad-b19f-7ca95ec54160" ? (legacyMedia ? terraceMobile : heroImage) : mobileImage;
  const display = (value: ImageDisplay | undefined, fallbackX: number) => ({ x: value?.x ?? fallbackX, y: value?.y ?? 50, zoom: value?.zoom ?? 100, fit: value?.fit ?? "cover" });
  const desktop = display(section.imageDisplay, 50);
   const mobile = display(section.mobileImageDisplay, 50);
  const style = { "--hero-desktop-position": `${desktop.x}% ${desktop.y}%`, "--hero-desktop-scale": desktop.zoom / 100, "--hero-desktop-fit": desktop.fit, "--hero-mobile-position": `${mobile.x}% ${mobile.y}%`, "--hero-mobile-scale": mobile.zoom / 100, "--hero-mobile-fit": mobile.fit } as CSSProperties;
   return <><section data-testid="pasaport-esim-hero" className="pasaport-esim-hero pasaport-summit-hero relative -mx-4 sm:-mx-6" style={style}>
     <picture className="pasaport-hero-photo"><source media="(min-width: 1024px)" srcSet={heroImage} /><img src={heroMobile || heroImage} alt="" width={1600} height={900} fetchPriority="high" loading="eager" decoding="async" className="v2-hero-image size-full" /></picture>
    <div className="pasaport-hero-shade" aria-hidden />
    <div className={`pasaport-hero-content relative z-10 min-w-0 ${section.align === "center" ? "text-center" : "text-start"}`}>
      <div className="pasaport-hero-heading">
      <h1 className="mt-2 max-w-xl font-display text-[34px] font-bold leading-[1.03] text-foreground lg:text-[64px]">{useApprovedCopy ? c.title : storedTitle}</h1>
      <p className="mt-2 text-sm text-muted-foreground lg:mt-3 lg:text-xl">{useApprovedCopy ? c.subtitle : v2Text(section, "subtitle", locale)}</p>
      </div>
      <div className="pasaport-search-card mt-5 rounded-2xl bg-card/95 p-4 shadow-panel lg:mt-6 lg:p-6">
        {children}
      </div>
    </div>
     <div className="pasaport-summit-coupon"><HeroPromotion /></div>
  </section><div className="pasaport-summit-compatibility"><HeroDeviceCompatibility compact /></div><PasaportMobileBenefits section={benefits} /></>;
}

export function PasaportMobileBenefits({ section }: { section?: V2Section }) {
  const { locale, uiLocale } = useI18n();
  const c = SUMMIT_COPY[uiLocale as keyof typeof SUMMIT_COPY] ?? SUMMIT_COPY[locale];
  const items = [{ key: "delivery", icon: Zap, label: c.delivery, href: "/legal/terms" }, { key: "refund", icon: ShieldCheck, label: c.refund, href: "/legal/refund" }, { key: "setup", icon: Smartphone, label: c.setup, href: "/esim/kurulum" }, { key: "support", icon: Headphones, label: c.support, href: waLink() }];
   return <ul className="pasaport-mobile-benefits pasaport-summit-benefits grid grid-cols-4 divide-x divide-border">
    {items.map(({ key, icon: Icon, label, href }) => { const configured = section?.items.find((item) => item.visible && (item.id === key || item.internalKey === key)); return <li key={key} className="min-w-0 text-center text-[10px] font-medium"><Button asChild variant="ghost" className="h-auto min-h-11 w-full flex-col gap-1 whitespace-normal px-1 text-[10px] font-medium"><a href={href} {...(key === "support" ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{configured ? <StorefrontIcon name={configured.icon} className="size-6 text-primary" /> : <Icon className="size-6 text-primary" />}<span>{configured ? v2ItemText(configured.title, locale) || label : label}</span></a></Button></li>; })}
  </ul>;
}