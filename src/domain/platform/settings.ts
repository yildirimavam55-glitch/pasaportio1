import type { Locale } from "@/domain/enums";

/**
 * Safe business settings. Only presentation and operational preferences live
 * here — never provider, payment, API or database credentials.
 */

export type SettingsText = Record<Locale, string>;
export type MaintenanceService = "esim" | "lounge";

export type PlatformSettings = {
  brandName: string;
  supportEmail: string;
  supportUrl: string;
  defaultLocale: Locale;
  reportingCurrency: string;
  senderName: string;
  timezone: string;
  maintenance: Record<
    MaintenanceService,
    {
      storefrontTitle: SettingsText;
      storefrontBody: SettingsText;
      showAlternative: boolean;
      checkoutMessage: SettingsText;
    }
  >;
  /** Floating WhatsApp support preview. Empty texts fall back to built-in localized copy; the number stays in src/lib/whatsapp.ts. */
  whatsappWidget: {
    enabled: boolean;
    title: SettingsText;
    message: SettingsText;
    cta: SettingsText;
    prefill: SettingsText;
  };
  /** 14-day refund guarantee — presentation only. Refund records and account eligibility never depend on these switches. */
  refundTrust: {
    enabled: boolean;
    homepage: boolean;
    productPage: boolean;
    /** Real refund/cancellation policy URL. Empty = legal page pending → no link is shown. */
    policyUrl: string;
  };
};

const EMPTY_TEXT = (): SettingsText => ({ tr: "", de: "", en: "" });

const t = (tr: string, de: string, en: string): SettingsText => ({ tr, de, en });

export const DEFAULT_SETTINGS: PlatformSettings = {
  brandName: "travely",
  supportEmail: "",
  supportUrl: "",
  defaultLocale: "tr",
  reportingCurrency: "EUR",
  senderName: "travely",
  timezone: "Europe/Istanbul",
  maintenance: {
    esim: {
      storefrontTitle: t(
        "Yeni eSIM seçeneklerimizi hazırlıyoruz",
        "Wir bereiten neue eSIM-Optionen vor",
        "We are preparing new eSIM options",
      ),
      storefrontBody: t(
        "Daha fazla ülke ve paket seçeneği ekliyoruz. Kısa süre içinde tekrar burada olacağız.",
        "Wir fügen weitere Länder und Pakete hinzu. Wir sind in Kürze wieder da.",
        "We are adding more countries and packages. We will be back shortly.",
      ),
      showAlternative: true,
      checkoutMessage: t(
        "Yeni siparişler kısa süreliğine durduruldu.",
        "Neue Bestellungen sind vorübergehend pausiert.",
        "New orders are paused for a short while.",
      ),
    },
    lounge: {
      storefrontTitle: t(
        "Yeni Lounge seçeneklerimizi hazırlıyoruz",
        "Wir bereiten neue Lounge-Optionen vor",
        "We are preparing new lounge options",
      ),
      storefrontBody: t(
        "Daha fazla havalimanı ve Lounge seçeneği ekliyoruz. Kısa süre içinde tekrar burada olacağız.",
        "Wir fügen weitere Flughäfen und Lounges hinzu. Wir sind in Kürze wieder da.",
        "We are adding more airports and lounges. We will be back shortly.",
      ),
      showAlternative: true,
      checkoutMessage: t(
        "Yeni siparişler kısa süreliğine durduruldu.",
        "Neue Bestellungen sind vorübergehend pausiert.",
        "New orders are paused for a short while.",
      ),
    },
  },
  whatsappWidget: { enabled: true, title: EMPTY_TEXT(), message: EMPTY_TEXT(), cta: EMPTY_TEXT(), prefill: EMPTY_TEXT() },
  refundTrust: { enabled: true, homepage: true, productPage: true, policyUrl: "" },
};

const clean = (value: unknown, max: number, fallback = ""): string => {
  const text = typeof value === "string" ? value.replace(/<[^>]*>/g, "").trim() : "";
  return (text || fallback).slice(0, max);
};

const cleanText = (value: any, fallback: SettingsText): SettingsText => ({
  tr: clean(value?.tr, 400, fallback.tr),
  de: clean(value?.de, 400, fallback.de),
  en: clean(value?.en, 400, fallback.en),
});

/** Never throws: an invalid stored value always degrades to the default. */
export function sanitizeSettings(raw: any): PlatformSettings {
  const source = raw && typeof raw === "object" ? raw : {};
  const locale = ["tr", "de", "en"].includes(source.defaultLocale) ? (source.defaultLocale as Locale) : DEFAULT_SETTINGS.defaultLocale;
  const maintenance = {} as PlatformSettings["maintenance"];
  for (const service of ["esim", "lounge"] as MaintenanceService[]) {
    const fallback = DEFAULT_SETTINGS.maintenance[service];
    const value = source?.maintenance?.[service] ?? {};
    maintenance[service] = {
      storefrontTitle: cleanText(value.storefrontTitle, fallback.storefrontTitle),
      storefrontBody: cleanText(value.storefrontBody, fallback.storefrontBody),
      showAlternative: value.showAlternative === undefined ? fallback.showAlternative : Boolean(value.showAlternative),
      checkoutMessage: cleanText(value.checkoutMessage, fallback.checkoutMessage),
    };
  }
  const wa = source?.whatsappWidget ?? {};
  const whatsappWidget: PlatformSettings["whatsappWidget"] = {
    enabled: wa.enabled === undefined ? true : Boolean(wa.enabled),
    title: cleanText(wa.title, EMPTY_TEXT()),
    message: cleanText(wa.message, EMPTY_TEXT()),
    cta: cleanText(wa.cta, EMPTY_TEXT()),
    prefill: cleanText(wa.prefill, EMPTY_TEXT()),
  };
  const rt = source?.refundTrust ?? {};
  const policyUrl = clean(rt.policyUrl, 300);
  const refundTrust: PlatformSettings["refundTrust"] = {
    enabled: rt.enabled === undefined ? true : Boolean(rt.enabled),
    homepage: rt.homepage === undefined ? true : Boolean(rt.homepage),
    productPage: rt.productPage === undefined ? true : Boolean(rt.productPage),
    policyUrl: /^(https:\/\/|\/[^/])/.test(policyUrl) ? policyUrl : "",
  };
  const supportUrl = clean(source.supportUrl, 300);
  return {
    brandName: clean(source.brandName, 80, DEFAULT_SETTINGS.brandName),
    supportEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(source.supportEmail ?? "")) ? String(source.supportEmail) : "",
    supportUrl: /^(https:\/\/|\/)/.test(supportUrl) ? supportUrl : "",
    defaultLocale: locale,
    reportingCurrency: /^[A-Z]{3}$/.test(String(source.reportingCurrency ?? "")) ? String(source.reportingCurrency) : DEFAULT_SETTINGS.reportingCurrency,
    senderName: clean(source.senderName, 80, DEFAULT_SETTINGS.senderName),
    timezone: clean(source.timezone, 60, DEFAULT_SETTINGS.timezone),
    maintenance,
    whatsappWidget,
    refundTrust,
  };
}

export function settingsText(value: SettingsText | undefined, locale: Locale, fallback = ""): string {
  if (!value) return fallback;
  return value[locale]?.trim() || value.tr?.trim() || fallback;
}
