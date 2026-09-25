import { designV2ToPublic } from "./public-routes";
/**
 * V2 storefront builder — presentation-only configuration for the V2 service homepages.
 * Commerce (search logic, catalogue, prices, cart, availability) stays in code; this
 * config only decides which content sections show, in which order, with which copy/media.
 */
import type { Locale } from "@/domain/enums";
import { ICON_NAMES } from "@/domain/storefront/icons";
import { POPULAR_COUNTRIES } from "@/domain/geo/countries";
import { getAirport, POPULAR_AIRPORT_IDS } from "@/domain/geo/airports";
import { DISCOVERY_COPY, ESIM_COPY, LOUNGE_COPY, VIGNETTE_COPY } from "@/domain/storefront/v2-copy";

export const V2_PAGES = ["esim", "lounge", "vignette"] as const;
export type V2PageId = (typeof V2_PAGES)[number];
export const V2_LOCALES = ["tr", "de", "en"] as const;
export type LT = Record<Locale, string>;

export const V2_SECTION_TYPES = [
  "SEARCH_HERO",
  "BENEFIT_ROW",
  "DESTINATION_CAROUSEL",
  "REGION_DISCOVERY",
  "NOTICE",
  "INFO_GRID",
  "HOW_IT_WORKS",
  "INSTALLATION_STEPS",
  "COMPATIBILITY",
  "PROMO_BANNER",
  "GUIDE_CAROUSEL",
  "FAQ",
  "SPACER",
] as const;
export type V2SectionType = (typeof V2_SECTION_TYPES)[number];

/** Search hero carries the core search: editable copy/media, never hidden, removed or moved. */
export const V2_PROTECTED: readonly V2SectionType[] = ["SEARCH_HERO"];
/** Sections tied to live catalogue data or a single page capability — not duplicable. */
export const V2_SINGLETON: readonly V2SectionType[] = ["SEARCH_HERO", "DESTINATION_CAROUSEL", "REGION_DISCOVERY", "COMPATIBILITY", "GUIDE_CAROUSEL"];
export const V2_ADDABLE: readonly V2SectionType[] = ["BENEFIT_ROW", "PROMO_BANNER", "NOTICE", "INFO_GRID", "HOW_IT_WORKS", "INSTALLATION_STEPS", "FAQ", "SPACER"];

/** Internal destinations a CMS link may point to. Nothing else is accepted. */
export const V2_SAFE_LINKS = [
  "/esim",
  "/lounge",
  "/vignette",
  "/destek",
  "/sepet",
  "/account",
] as const;
export type V2SafeLink = (typeof V2_SAFE_LINKS)[number];

/** Images bundled with the app, referenced as `builtin:<key>`. */
export const V2_BUILTIN_MEDIA = ["esim-hero", "lounge-hero", "vignette-hero", "lounge-card", "esim-cross-sell"] as const;

export const V2_HEIGHTS = ["compact", "normal", "tall"] as const;
export const V2_OVERLAYS = ["light", "normal", "strong"] as const;
export const V2_ALIGNS = ["left", "center"] as const;

export type V2Item = {
  id: string;
  visible: boolean;
  icon: string;
  /** Country ISO / airport IATA for destination carousels. */
  entity: string;
  title: LT;
  text: LT;
};

export type V2Section = {
  id: string;
  type: V2SectionType;
  visible: boolean;
  /** Lounge: also shown under airport results. */
  showOnResults: boolean;
  variant: string;
  align: (typeof V2_ALIGNS)[number];
  height: (typeof V2_HEIGHTS)[number];
  overlay: (typeof V2_OVERLAYS)[number];
  mediaId: string | null;
  mobileMediaId: string | null;
  href: V2SafeLink;
  startsAt: string;
  endsAt: string;
  text: Record<string, LT>;
  items: V2Item[];
};

export type V2PageConfig = { version: 1; page: V2PageId; sections: V2Section[] };

export const V2_SECTION_LABELS: Record<V2SectionType, string> = {
  SEARCH_HERO: "Arama hero",
  BENEFIT_ROW: "Avantaj satırı",
  DESTINATION_CAROUSEL: "Popüler destinasyonlar",
  REGION_DISCOVERY: "Bölgesel paketler",
  NOTICE: "Bilgi kutusu",
  INFO_GRID: "Bilgi kartları",
  HOW_IT_WORKS: "Nasıl çalışır",
  INSTALLATION_STEPS: "Kurulum adımları",
  COMPATIBILITY: "Cihaz uyumluluğu",
  PROMO_BANNER: "Promosyon bannerı",
  GUIDE_CAROUSEL: "Rehberler",
  FAQ: "SSS",
  SPACER: "Boşluk",
};

/** Text fields each section type exposes in the editor (key → admin label). */
export const V2_TEXT_FIELDS: Record<V2SectionType, Array<[string, string]>> = {
  SEARCH_HERO: [["eyebrow", "Üst başlık"], ["title", "Başlık"], ["subtitle", "Alt başlık"], ["placeholder", "Arama metni"], ["sticky", "Sabit arama metni"]],
  BENEFIT_ROW: [],
  DESTINATION_CAROUSEL: [["title", "Başlık"]],
  REGION_DISCOVERY: [["eyebrow", "Üst başlık"], ["title", "Başlık"], ["lead", "Açıklama"], ["worldwide", "Dünya bannerı"], ["cta", "Buton metni"]],
  NOTICE: [["title", "Başlık"], ["text", "Metin"]],
  INFO_GRID: [["title", "Başlık"]],
  HOW_IT_WORKS: [["title", "Başlık"]],
  INSTALLATION_STEPS: [["title", "Başlık"], ["subtitle", "Alt başlık"], ["ready", "Hazır etiketi"], ["adding", "Ekleniyor etiketi"], ["cta", "Buton metni"]],
  COMPATIBILITY: [["title", "Başlık"]],
  PROMO_BANNER: [["title", "Başlık"], ["subtitle", "Alt başlık"]],
  GUIDE_CAROUSEL: [["title", "Başlık"], ["lead", "Açıklama"], ["all", "Tümü bağlantısı"]],
  FAQ: [["title", "Başlık"]],
  SPACER: [],
};

/** How items of a section are edited: title-only, title+text, question/answer, destination. */
export const V2_ITEM_MODE: Partial<Record<V2SectionType, "benefit" | "card" | "faq" | "destination" | "step">> = {
  BENEFIT_ROW: "benefit",
  INFO_GRID: "card",
  HOW_IT_WORKS: "card",
  INSTALLATION_STEPS: "step",
  FAQ: "faq",
  DESTINATION_CAROUSEL: "destination",
};

const lt = (tr: string, de: string, en: string): LT => ({ tr, de, en });
const from3 = <K extends string>(copy: Record<Locale, Record<K, unknown>>, key: K): LT =>
  lt(String(copy.tr[key] ?? ""), String(copy.de[key] ?? ""), String(copy.en[key] ?? ""));
const same = (value: string): LT => lt(value, value, value);

function section(id: string, type: V2SectionType, patch: Partial<V2Section> = {}): V2Section {
  return {
    id,
    type,
    visible: true,
    showOnResults: false,
    variant: "default",
    align: "left",
    height: "normal",
    overlay: "normal",
    mediaId: null,
    mobileMediaId: null,
    href: "/esim",
    startsAt: "",
    endsAt: "",
    text: {},
    items: [],
    ...patch,
  };
}

const item = (id: string, patch: Partial<V2Item> = {}): V2Item => ({ id, visible: true, icon: "", entity: "", title: same(""), text: same(""), ...patch });

type Pair = readonly [string, string];
function listItems(prefix: string, copy: Record<Locale, readonly unknown[]>, map: (value: any) => { title: string; text: string }): V2Item[] {
  return copy.tr.map((_, index) => {
    const at = (locale: Locale) => map(copy[locale][index] ?? copy.tr[index]);
    return item(`${prefix}-${index + 1}`, {
      title: lt(at("tr").title, at("de").title, at("en").title),
      text: lt(at("tr").text, at("de").text, at("en").text),
    });
  });
}

const guides = () =>
  section("guides", "GUIDE_CAROUSEL", {
    showOnResults: true,
    text: { title: from3(DISCOVERY_COPY, "guides"), lead: from3(DISCOVERY_COPY, "guideLead"), all: from3(DISCOVERY_COPY, "allGuides") },
  });

function esimDefault(): V2Page {
  const c = ESIM_COPY;
  const faqIndexes = [0, 1, 2, 3, 5];
  const faqCopy = { tr: faqIndexes.map((i) => DISCOVERY_COPY.tr.questions[i]!), de: faqIndexes.map((i) => DISCOVERY_COPY.de.questions[i]!), en: faqIndexes.map((i) => DISCOVERY_COPY.en.questions[i]!) };
  return [
    section("hero", "SEARCH_HERO", { mediaId: "builtin:esim-hero", text: { eyebrow: same("eSIM"), title: from3(c, "h"), subtitle: from3(c, "q"), placeholder: from3(c, "ph"), sticky: from3(c, "stickyPh") } }),
    section("benefits", "BENEFIT_ROW", {
      items: [
        item("delivery", { icon: "Zap", title: from3(c, "benefitDelivery") }),
        item("coverage", { icon: "Globe", title: from3(c, "benefitCoverage") }),
        item("setup", { icon: "Smartphone", title: from3(c, "setup") }),
        item("support", { icon: "Headphones", title: from3(c, "support") }),
      ],
    }),
    section("popular", "DESTINATION_CAROUSEL", {
      variant: "country",
      text: { title: from3(c, "popular") },
      items: POPULAR_COUNTRIES.slice(0, 10).map((country) => item(`c-${country.iso}`, { entity: country.iso })),
    }),
    section("regions", "REGION_DISCOVERY", { text: { eyebrow: from3(c, "regionalEyebrow"), title: from3(c, "regionalTitle"), lead: from3(c, "regionalHomeLead"), worldwide: from3(c, "worldwideBanner"), cta: from3(c, "discoverPlans") } }),
    section("compatibility", "COMPATIBILITY", { text: { title: from3(DISCOVERY_COPY, "compatibility") } }),
    section("promo-lounge", "PROMO_BANNER", { mediaId: "builtin:lounge-card", href: "/lounge", text: { title: from3(c, "promo"), subtitle: from3(c, "promoSub") } }),
    section("installation", "INSTALLATION_STEPS", {
      variant: "animated",
      href: "/destek",
      text: { title: from3(DISCOVERY_COPY, "install"), subtitle: from3(DISCOVERY_COPY, "installSub"), ready: from3(DISCOVERY_COPY, "animReady"), adding: from3(DISCOVERY_COPY, "animAdding"), cta: from3(DISCOVERY_COPY, "installCta") },
      items: listItems("step", { tr: DISCOVERY_COPY.tr.animSteps, de: DISCOVERY_COPY.de.animSteps, en: DISCOVERY_COPY.en.animSteps }, (v) => ({ title: String(v), text: "" })),
    }),
    section("promo-vignette", "PROMO_BANNER", { mediaId: "builtin:vignette-hero", href: "/vignette", text: { title: from3(c, "vignettePromo"), subtitle: from3(c, "vignettePromoSub") } }),
    guides(),
    section("faq", "FAQ", { variant: "comfortable", text: { title: from3(DISCOVERY_COPY, "faq") }, items: listItems("faq", faqCopy, (v: Pair) => ({ title: v[0], text: v[1] })) }),
  ];
}

function loungeDefault(): V2Page {
  const c = LOUNGE_COPY;
  const airports = POPULAR_AIRPORT_IDS.flatMap((id) => { const a = getAirport(id); return a ? [a.iata] : []; }).slice(0, 8);
  return [
    section("hero", "SEARCH_HERO", { mediaId: "builtin:lounge-hero", text: { eyebrow: same("Lounge"), title: from3(c, "h"), subtitle: from3(c, "q"), placeholder: from3(c, "ph"), sticky: from3(c, "ph") } }),
    section("benefits", "BENEFIT_ROW", {
      items: [
        item("access", { icon: "Sofa", title: from3(c, "access") }),
        item("online", { icon: "CalendarCheck", title: from3(c, "online") }),
        item("availability", { icon: "LockKeyhole", title: from3(c, "pay") }),
        item("support", { icon: "Headphones", title: from3(c, "support") }),
      ],
    }),
    section("popular", "DESTINATION_CAROUSEL", { variant: "airport", text: { title: from3(c, "popular") }, items: airports.map((iata) => item(`a-${iata}`, { entity: iata })) }),
    section("info", "INFO_GRID", { showOnResults: true, text: { title: from3(c, "info") }, items: listItems("info", { tr: c.tr.infoItems, de: c.de.infoItems, en: c.en.infoItems }, (v) => ({ title: v.title, text: v.text })) }),
    section("promo-esim", "PROMO_BANNER", { showOnResults: true, mediaId: "builtin:esim-cross-sell", href: "/esim", text: { title: from3(c, "promo"), subtitle: from3(c, "promoSub") } }),
    section("how", "HOW_IT_WORKS", { text: { title: from3(c, "how") }, items: listItems("how", { tr: c.tr.steps, de: c.de.steps, en: c.en.steps }, (v) => ({ title: v.t, text: v.s })) }),
    section("promo-vignette", "PROMO_BANNER", { mediaId: "builtin:vignette-hero", href: "/vignette", text: { title: from3(c, "vignette"), subtitle: from3(c, "vignetteSub") } }),
    guides(),
    section("faq", "FAQ", { showOnResults: true, text: { title: from3(c, "faq") }, items: listItems("faq", { tr: c.tr.questions, de: c.de.questions, en: c.en.questions }, (v: Pair) => ({ title: v[0], text: v[1] })) }),
  ];
}

function vignetteDefault(): V2Page {
  const c = VIGNETTE_COPY;
  return [
    section("hero", "SEARCH_HERO", { mediaId: "builtin:vignette-hero", text: { eyebrow: same("Vignette"), title: from3(c, "h"), subtitle: same(""), placeholder: from3(c, "q"), sticky: from3(c, "q") } }),
    section("benefits", "BENEFIT_ROW", {
      items: [
        item("digital", { icon: "Smartphone", title: from3(c, "digital") }),
        item("official", { icon: "FileCheck2", title: from3(c, "official") }),
        item("secure", { icon: "ShieldCheck", title: from3(c, "secure") }),
        item("europe", { icon: "Map", title: from3(c, "europe") }),
      ],
    }),
    section("notice", "NOTICE", { text: { title: from3(c, "soon"), text: from3(c, "soonSub") } }),
    section("info", "INFO_GRID", { text: { title: from3(c, "info") }, items: listItems("info", { tr: c.tr.infoItems, de: c.de.infoItems, en: c.en.infoItems }, (v) => ({ title: v.title, text: v.text })) }),
    section("how", "HOW_IT_WORKS", { text: { title: from3(c, "how") }, items: listItems("how", { tr: c.tr.steps, de: c.de.steps, en: c.en.steps }, (v) => ({ title: v.t, text: v.s })) }),
    section("promo-esim", "PROMO_BANNER", { mediaId: "builtin:esim-cross-sell", href: "/esim", text: { title: from3(c, "esim"), subtitle: same("") } }),
    section("promo-lounge", "PROMO_BANNER", { mediaId: "builtin:lounge-card", href: "/lounge", text: { title: from3(c, "lounge"), subtitle: same("") } }),
    guides(),
    section("faq", "FAQ", { text: { title: from3(c, "faq") }, items: listItems("faq", { tr: c.tr.questions, de: c.de.questions, en: c.en.questions }, (v: Pair) => ({ title: v[0], text: v[1] })) }),
  ];
}

type V2Page = V2Section[];

export function defaultV2Page(page: V2PageId): V2PageConfig {
  const sections = page === "lounge" ? loungeDefault() : page === "vignette" ? vignetteDefault() : esimDefault();
  return { version: 1, page, sections };
}

export function createV2Section(type: V2SectionType): V2Section {
  const id = `${type.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
  const base = section(id, type);
  if (type === "SPACER") base.height = "compact";
  if (type === "INSTALLATION_STEPS") { base.variant = "simple"; base.href = "/destek"; }
  return base;
}

/* ------------------------------ sanitizing ------------------------------ */

const ID = /^[a-zA-Z0-9_-]{1,64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTITY = /^[A-Z0-9]{2,4}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Plain text only: markup is removed so CMS content can never inject HTML or script. */
export const cleanText = (value: unknown, max = 600) =>
  String(value ?? "").replace(/<[^>]*>/g, "").replace(/[<>]/g, "").slice(0, max);

const cleanLT = (value: any, max = 600): LT => ({ tr: cleanText(value?.tr, max), de: cleanText(value?.de, max), en: cleanText(value?.en, max) });
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(String(value)) ? (String(value) as T) : fallback;

export function cleanMediaId(value: unknown): string | null {
  const raw = String(value ?? "");
  if (UUID.test(raw)) return raw;
  if (raw.startsWith("builtin:") && (V2_BUILTIN_MEDIA as readonly string[]).includes(raw.slice(8))) return raw;
  return null;
}

function cleanItem(raw: any, index: number): V2Item {
  return {
    id: ID.test(String(raw?.id)) ? String(raw.id) : `item-${index + 1}`,
    visible: raw?.visible !== false,
    icon: ICON_NAMES.includes(String(raw?.icon)) ? String(raw.icon) : "",
    entity: ENTITY.test(String(raw?.entity ?? "").toUpperCase()) ? String(raw.entity).toUpperCase() : "",
    title: cleanLT(raw?.title, 200),
    text: cleanLT(raw?.text, 900),
  };
}

function cleanSection(raw: any): V2Section | null {
  if (!raw || !(V2_SECTION_TYPES as readonly string[]).includes(raw.type) || !ID.test(String(raw.id))) return null;
  const type = raw.type as V2SectionType;
  const text: Record<string, LT> = {};
  for (const [key] of V2_TEXT_FIELDS[type]) text[key] = cleanLT(raw.text?.[key], 300);
  return {
    id: String(raw.id),
    type,
    visible: V2_PROTECTED.includes(type) ? true : raw.visible !== false,
    showOnResults: Boolean(raw.showOnResults),
    variant: cleanText(raw.variant, 24).replace(/[^a-z-]/g, "") || "default",
    align: pick(raw.align, V2_ALIGNS, "left"),
    height: pick(raw.height, V2_HEIGHTS, "normal"),
    overlay: pick(raw.overlay, V2_OVERLAYS, "normal"),
    mediaId: cleanMediaId(raw.mediaId),
    mobileMediaId: cleanMediaId(raw.mobileMediaId),
    href: pick(typeof raw.href === "string" && raw.href.startsWith("/design-v2") ? designV2ToPublic(raw.href) : raw.href, V2_SAFE_LINKS, "/esim"),
    startsAt: DATE.test(String(raw.startsAt)) ? String(raw.startsAt) : "",
    endsAt: DATE.test(String(raw.endsAt)) ? String(raw.endsAt) : "",
    text,
    items: Array.isArray(raw.items) ? raw.items.slice(0, 30).map(cleanItem) : [],
  };
}

/** Server + client validation. Invalid input falls back to the built-in approved layout. */
export function sanitizeV2Page(raw: any, page: V2PageId): V2PageConfig {
  const fallback = defaultV2Page(page);
  if (!raw || !Array.isArray(raw.sections)) return fallback;
  const seen = new Set<string>();
  const sections: V2Section[] = [];
  for (const entry of raw.sections.slice(0, 30)) {
    const clean = cleanSection(entry);
    if (!clean || seen.has(clean.id)) continue;
    if (V2_SINGLETON.includes(clean.type) && sections.some((s) => s.type === clean.type)) continue;
    seen.add(clean.id);
    sections.push(clean);
  }
  // The search hero is core: always present and always first.
  const heroIndex = sections.findIndex((s) => s.type === "SEARCH_HERO");
  const hero = heroIndex >= 0 ? sections.splice(heroIndex, 1)[0]! : fallback.sections[0]!;
  return { version: 1, page, sections: [hero, ...sections] };
}

/* ------------------------------ rendering helpers ------------------------------ */

export function v2Text(section: V2Section | undefined, key: string, locale: Locale): string {
  const value = section?.text?.[key];
  return (value?.[locale] || value?.tr || "").trim();
}

export function v2ItemText(value: LT | undefined, locale: Locale): string {
  return (value?.[locale] || value?.tr || "").trim();
}

/** Promo date window, evaluated on the viewer's calendar day. */
export function isInWindow(section: V2Section, today = new Date().toISOString().slice(0, 10)): boolean {
  if (section.startsAt && today < section.startsAt) return false;
  if (section.endsAt && today > section.endsAt) return false;
  return true;
}

export function missingV2Translations(config: V2PageConfig, locale: "de" | "en"): number {
  let missing = 0;
  const check = (value: LT | undefined) => { if (value?.tr?.trim() && !value[locale]?.trim()) missing += 1; };
  for (const s of config.sections) {
    Object.values(s.text).forEach(check);
    for (const it of s.items) { check(it.title); check(it.text); }
  }
  return missing;
}

export function collectV2MediaIds(config: V2PageConfig): string[] {
  const ids = new Set<string>();
  for (const s of config.sections) for (const id of [s.mediaId, s.mobileMediaId]) if (id && UUID.test(id)) ids.add(id);
  return [...ids];
}
