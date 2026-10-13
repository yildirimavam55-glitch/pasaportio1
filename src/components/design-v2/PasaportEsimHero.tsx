import { localize } from "@/i18n/overlay";
// ============= Full file contents =============

import type { CSSProperties, ReactNode } from "react";
import { useI18n } from "@/i18n";
import { HeroPromotion } from "./HeroPromotion";
import { v2Text, type V2Section } from "@/domain/storefront/v2";
import { StorefrontIcon } from "@/domain/storefront/icons";
import { trustBandItems } from "./hero-trust-band";
import { useWhatsAppHref } from "@/components/travel/WhatsAppSupportWidget";
import coast from "@/assets/pasaport-antenna-coast.png.asset.json";
import { AntennaSignal } from "./AntennaSignal";

const COPY = localize({
 tr: { title: "Seyahatte internetin hazır.", subtitle: "190+ ülkede eSIM ile bağlantıda kal.", delivery: "Hızlı teslimat", setup: "Kolay kurulum", payment: "Ödeme bilgileri", support: "WhatsApp destek", deliveryInfo: "eSIM teslim bilgileri", setupInfo: "Adım adım kurulum", paymentInfo: "Ödeme seçeneklerini incele", supportInfo: "Kurulum için yardım" },
  de: { title: "Dein Internet für unterwegs.", subtitle: "Mit eSIM in über 190 Ländern verbunden.", delivery: "Schnelle Lieferung", setup: "Einfach einrichten", payment: "Infos zur Zahlung", support: "WhatsApp Support", deliveryInfo: "Informationen zur eSIM-Lieferung", setupInfo: "Installation Schritt für Schritt", paymentInfo: "Zahlungsoptionen ansehen", supportInfo: "Hilfe bei der Einrichtung" },
 en: { title: "Your travel internet is ready.", subtitle: "Stay connected with eSIM in 190+ countries.", delivery: "Fast delivery", setup: "Easy installation", payment: "Payment information", support: "WhatsApp support", deliveryInfo: "eSIM delivery information", setupInfo: "Step-by-step installation", paymentInfo: "Review payment options", supportInfo: "Help with installation" },
 ar: { title: "إنترنت رحلتك جاهز.", subtitle: "ابقَ متصلاً عبر eSIM في أكثر من 190 دولة.", delivery: "تسليم سريع", setup: "إعداد سهل", payment: "معلومات الدفع", support: "دعم واتساب", deliveryInfo: "معلومات تسليم eSIM", setupInfo: "التثبيت خطوة بخطوة", paymentInfo: "اطّلع على خيارات الدفع", supportInfo: "المساعدة في التثبيت" },
});
const oldTitles = ["Yurt dışında bağlantıda kal.", "Im Ausland verbunden bleiben.", "Stay connected abroad.", "Her yerde bağlantıda kal.", "Überall verbunden bleiben.", "Stay connected everywhere.", "ابقَ متصلاً أينما كنت.", "ابقَ على اتصال في الخارج."];
export function PasaportEsimHero({ section, image, benefits, children }: { section: V2Section; image: string; mobileImage?: string | undefined; benefits?: V2Section | undefined; children: ReactNode }) {
 const { locale, uiLocale } = useI18n();
 const c = COPY[uiLocale as keyof typeof COPY] ?? COPY[locale];
 const storedTitle = v2Text(section, "title", locale);
 const approved = !storedTitle || oldTitles.includes(storedTitle);
 const fixture = section.mediaId === "2096d4af-5b89-49ad-b19f-7ca95ec54160" || section.mediaId === "builtin:esim-hero" || !image;
 const heroImage = coast.url;
 const heroMobile = coast.url;
 const desktop = fixture ? undefined : section.imageDisplay;
 const mobile = fixture ? undefined : section.mobileImageDisplay;
  const style = { "--hero-desktop-position": `${desktop?.x ?? 50}% calc(50px - 11.2113vw)`, "--hero-desktop-scale": (desktop?.zoom ?? 100) / 100, "--hero-desktop-fit": desktop?.fit ?? "cover", "--hero-mobile-position": `${mobile?.x ?? 88}% ${mobile?.y ?? 62}%`, "--hero-mobile-scale": (mobile?.zoom ?? 100) / 100, "--hero-mobile-fit": mobile?.fit ?? "cover" } as CSSProperties;
 return <><section data-testid="pasaport-esim-hero" className="pasaport-final-hero" style={style}>
  <picture className="final-hero-photo"><source media="(min-width:1024px)" srcSet={heroImage}/><img src={heroMobile} alt="" width={1672} height={941} fetchPriority="high" loading="eager" decoding="async" /><AntennaSignal /></picture>
  <div className="final-hero-shade" aria-hidden="true" />
  <div className="final-hero-heading"><h1>{approved ? c.title : storedTitle}</h1><p>{approved ? c.subtitle : v2Text(section, "subtitle", locale)}</p></div>
  <div className="final-hero-search">{children}</div>
  <div className="final-hero-gift"><HeroPromotion /></div>
 </section><PasaportMobileBenefits section={benefits} /></>;
}
/** The four-column trust row: content, icons, order and visibility come from the Admin-edited BENEFIT_ROW section. Items are informational only — never clickable. */
export function PasaportMobileBenefits({ section }: { section?: V2Section | undefined }) {
 const { locale } = useI18n();
 const items = trustBandItems(section, locale, useWhatsAppHref());
 return <ul className="final-trust-band">{items.map(({ id, icon, label, description }) => <li key={id}><div className="final-trust-item"><span aria-hidden="true" className="final-trust-icon"><StorefrontIcon name={icon} /></span><span><strong>{label}</strong><small>{description}</small></span></div></li>)}</ul>;
}
