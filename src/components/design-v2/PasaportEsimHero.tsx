import type { CSSProperties, ReactNode } from "react";
import { Globe2, Headphones, Zap } from "lucide-react";
import { useI18n } from "@/i18n";
import { HeroDeviceCompatibility } from "@/components/travel/DeviceCompatibility";
import { HeroPromotion } from "./HeroPromotion";
import { v2Text, type V2Section } from "@/domain/storefront/v2";
import type { ImageDisplay } from "@/domain/storefront/image-display";
import terraceDesktop from "@/assets/pasaport-terrace-desktop.webp";
import terraceMobile from "@/assets/pasaport-terrace-mobile.webp";

const COPY = {
  tr: { eyebrow: "SINIRSIZ SEYAHAT ÖZGÜRLÜĞÜ", title: "Her yerde bağlantıda kal.", subtitle: "Seyahatin için kolay ve güvenilir eSIM.", search: "Nereye seyahat ediyorsun?", delivery: "Anında teslimat", coverage: "Global bağlantı", support: "WhatsApp destek" },
  de: { eyebrow: "GRENZENLOSE REISEFREIHEIT", title: "Überall verbunden bleiben.", subtitle: "Einfache, zuverlässige eSIM für deine Reise.", search: "Wohin reist du?", delivery: "Sofortige Lieferung", coverage: "Global verbunden", support: "WhatsApp-Support" },
  en: { eyebrow: "TRAVEL WITHOUT LIMITS", title: "Stay connected everywhere.", subtitle: "An easy, reliable eSIM for your trip.", search: "Where are you travelling?", delivery: "Instant delivery", coverage: "Global connectivity", support: "WhatsApp support" },
  ar: { eyebrow: "حرية السفر بلا حدود", title: "ابقَ متصلاً أينما كنت.", subtitle: "eSIM سهلة وموثوقة لرحلتك.", search: "إلى أين تسافر؟", delivery: "تسليم فوري", coverage: "اتصال عالمي", support: "دعم واتساب" },
};
const oldTitles = ["Yurt dışında bağlantıda kal.", "Im Ausland verbunden bleiben.", "Stay connected abroad."];

export function PasaportEsimHero({ section, image, mobileImage, children }: { section: V2Section; image: string; mobileImage?: string | undefined; children: ReactNode }) {
  const { locale, uiLocale } = useI18n();
  const c = COPY[uiLocale as keyof typeof COPY] ?? COPY[locale];
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
   return <section data-testid="pasaport-esim-hero" className="pasaport-esim-hero relative -mx-4 sm:-mx-6" style={style}>
     <picture className="pasaport-hero-photo"><source media="(min-width: 1024px)" srcSet={heroImage} /><img src={heroMobile || heroImage} alt="" width={1600} height={900} fetchPriority="high" loading="eager" decoding="async" className="v2-hero-image size-full" /></picture>
    <div className="pasaport-hero-shade" aria-hidden />
    <div className={`pasaport-hero-content relative z-10 min-w-0 ${section.align === "center" ? "text-center" : "text-start"}`}>
      <div className="pasaport-hero-heading">
      <h1 className="mt-2 max-w-xl font-display text-[34px] font-bold leading-[1.03] text-foreground lg:text-[64px]">{useApprovedCopy ? c.title : storedTitle}</h1>
      <p className="mt-2 text-sm text-muted-foreground lg:mt-3 lg:text-xl">{useApprovedCopy ? c.subtitle : v2Text(section, "subtitle", locale)}</p>
      </div>
      <div className="pasaport-search-card mt-5 rounded-2xl bg-card/95 p-4 shadow-panel lg:mt-6 lg:p-6">
        <p className="mb-2 text-sm font-bold">{c.search}</p>
        {children}
      </div>
    </div>
     <div className="pasaport-hero-tools"><HeroPromotion /><HeroDeviceCompatibility /></div>
  </section>;
}

export function PasaportMobileBenefits() {
  const { locale, uiLocale } = useI18n();
  const c = COPY[uiLocale as keyof typeof COPY] ?? COPY[locale];
   return <ul className="pasaport-mobile-benefits grid grid-cols-3 divide-x divide-border">
    {[{ icon: Zap, label: c.delivery }, { icon: Globe2, label: c.coverage }, { icon: Headphones, label: c.support }].map(({ icon: Icon, label }) => <li key={label} className="flex min-w-0 flex-col items-center gap-1 px-1 text-center text-[10px] font-medium"><Icon className="size-6 text-primary" /><span>{label}</span></li>)}
  </ul>;
}