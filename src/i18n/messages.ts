import type { Locale } from "@/domain/enums";

/** Phase 0 i18n foundation. Customer-facing CMS copy becomes translatable via the DB. */
export const messages = {
  tr: {
    brand: "Travel Platform",
    "nav.home": "Ana Sayfa",
    "nav.esim": "eSIM",
    "nav.lounge": "Lounge",
    "nav.account": "Hesabım",
    "nav.trips": "Seyahatler",
    "nav.admin": "Yönetim",
    "home.title": "Seyahat Servisleri Platformu",
    "home.subtitle": "eSIM ve havalimanı lounge hizmetleri tek çatı altında.",
    "common.phase": "Faz 0 — mimari temel",
    "common.comingSoon": "Katalog sonraki fazda yayınlanacak.",
    "auth.signIn": "Giriş yap",
    "auth.signOut": "Çıkış yap",
  },
  de: {
    brand: "Travel Platform",
    "nav.home": "Startseite",
    "nav.esim": "eSIM",
    "nav.lounge": "Lounge",
    "nav.account": "Mein Konto",
    "nav.trips": "Reisen",
    "nav.admin": "Verwaltung",
    "home.title": "Plattform für Reiseservices",
    "home.subtitle": "eSIM und Flughafen-Lounges an einem Ort.",
    "common.phase": "Phase 0 — Architektur-Fundament",
    "common.comingSoon": "Der Katalog folgt in der nächsten Phase.",
    "auth.signIn": "Anmelden",
    "auth.signOut": "Abmelden",
  },
  en: {
    brand: "Travel Platform",
    "nav.home": "Home",
    "nav.esim": "eSIM",
    "nav.lounge": "Lounge",
    "nav.account": "My account",
    "nav.trips": "Trips",
    "nav.admin": "Admin",
    "home.title": "Travel Services Platform",
    "home.subtitle": "eSIM and airport lounge services in one place.",
    "common.phase": "Phase 0 — architecture foundation",
    "common.comingSoon": "The catalogue goes live in a later phase.",
    "auth.signIn": "Sign in",
    "auth.signOut": "Sign out",
  },
} satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof (typeof messages)["tr"];
