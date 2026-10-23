import { portableMediaUrl } from "@/domain/storefront/portable-media";
import { ResponsiveMediaPicture } from "./ResponsiveMediaPicture";
import { getActiveUiLocale } from "@/i18n/overlay";
import { V2EditorialGrid } from "./V2EditorialGrid";
import { isHiddenServiceHref, useOptionalServices } from "@/components/travel/ServiceAvailability";
import { useEffect, useState, type ReactNode } from "react";
import { queryOptions, replaceEqualDeep, useQuery } from "@tanstack/react-query";
import { DesktopPromoCard, HowItWorks, PromoCard, TrustRow } from "@/components/design-v2/V2Shell";
import { V2InfoCarousel } from "@/components/design-v2/V2InfoCarousel";
import { V2TrustReviews } from "@/components/design-v2/V2TrustReviews";
import { lastKnownPublished } from "@/domain/storefront/review-carousel";
import { V2CompactFaq, V2GuidesRail, V2InfoGrid, V2Installation } from "@/components/design-v2/V2DiscoveryContent";
import { Reveal } from "@/components/travel/Reveal";
import { V2Notice } from "./V2Notice";
import { V2SectionFrame } from "@/components/design-v2/V2SectionFrame";
import { StorefrontIcon } from "@/domain/storefront/icons";
import { defaultV2Page, isInWindow, sanitizeV2Page, v2ItemText, v2Text, type V2PageConfig, type V2PageId, type V2Section } from "@/domain/storefront/v2";
import { getPublishedV2Page, type V2Media } from "@/lib/v2-storefront.functions";
import { useI18n, isUiLocale } from "@/i18n";
import familyArrivals from "@/assets/pasaport-family-arrivals.jpg";
import esimHero from "@/assets/pasaport-seaside-hero.jpg";
import loungeHero from "@/assets/lounge-hero-mobile.jpg";
import vignetteHero from "@/assets/v2-vignette-hero.jpg";
import loungeCard from "@/assets/lounge-card.jpg.asset.json";
import esimCrossSell from "@/assets/esim-cross-sell.jpg.asset.json";
import vignetteRoadDesktop from "@/assets/vignette-road-desktop.jpg";
import infoProducts from "@/assets/info-products.jpg";
import infoRoaming from "@/assets/info-roaming.jpg";
import infoDelivery from "@/assets/info-delivery.jpg";
import infoInstall from "@/assets/info-install.jpg";
import infoPayment from "@/assets/info-payment.jpg";
import infoSupport from "@/assets/info-support.jpg";
import trustRefund from "@/assets/trust-refund.jpg";
import trustTraveler from "@/assets/trust-traveler.jpg";
import demoGiulia from "@/assets/trust-demo-giulia.jpg";
import demoHaruto from "@/assets/trust-demo-haruto.jpg";
import demoEmily from "@/assets/trust-demo-emily.jpg";
import trustBenefitGlobe from "@/assets/trust-benefit-globe.webp";
import trustBenefitRefund from "@/assets/trust-benefit-refund.webp";
import trustBenefitInstall from "@/assets/trust-benefit-install.webp";
import trustBenefitPayment from "@/assets/trust-benefit-payment.webp";
import worldwidePhoto from "@/assets/worldwide-window-photo.webp.asset.json";
import restoredHomepage1 from "@/assets/restored-homepage/1-536a6bd7-2418-4668-8149-6b85bfd2b98d.png.asset.json";
import restoredHomepage2 from "@/assets/restored-homepage/2-3fb223cb-8c4b-4a22-ab7b-18082e0487fa.png.asset.json";
import restoredHomepage3 from "@/assets/restored-homepage/3-d00960c2-2105-4f92-abab-553e73485e12.png.asset.json";
import restoredHomepage4 from "@/assets/restored-homepage/4-ab51ead1-6ab5-46d2-8761-9ef319adb84d.png.asset.json";
import restoredHomepage5 from "@/assets/restored-homepage/5-4800b8e8-f92b-4acc-8615-7eec881e7031.png.asset.json";
import restoredHomepage6 from "@/assets/restored-homepage/6-2096d4af-5b89-49ad-b19f-7ca95ec54160.png.asset.json";
import restoredHomepage7 from "@/assets/restored-homepage/7-533377df-ddd6-4803-a0cb-6f5727c933b6.png.asset.json";

export const V2_BUILTIN_URLS: Record<string, string> = {
  "builtin:worldwide-window": worldwidePhoto.url,
  "builtin:trust-family-arrivals": familyArrivals,
  "builtin:esim-hero": esimHero,
  "builtin:lounge-hero": loungeHero,
  "builtin:vignette-hero": vignetteHero,
  "builtin:lounge-card": loungeCard.url,
  "builtin:esim-cross-sell": esimCrossSell.url,
  "builtin:info-products": infoProducts,
  "builtin:info-roaming": infoRoaming,
  "builtin:info-delivery": infoDelivery,
  "builtin:info-install": infoInstall,
  "builtin:info-payment": infoPayment,
  "builtin:info-support": infoSupport,
  "builtin:trust-refund": trustRefund,
  "builtin:trust-traveler": trustTraveler,
  "builtin:trust-demo-giulia": demoGiulia,
  "builtin:trust-demo-haruto": demoHaruto,
  "builtin:trust-demo-emily": demoEmily,
  "builtin:trust-benefit-globe": trustBenefitGlobe,
  "builtin:trust-benefit-refund": trustBenefitRefund,
  "builtin:trust-benefit-install": trustBenefitInstall,
  "builtin:trust-benefit-payment": trustBenefitPayment,
  "536a6bd7-2418-4668-8149-6b85bfd2b98d": restoredHomepage1.url,
  "3fb223cb-8c4b-4a22-ab7b-18082e0487fa": restoredHomepage2.url,
  "d00960c2-2105-4f92-abab-553e73485e12": restoredHomepage3.url,
  "ab51ead1-6ab5-46d2-8761-9ef319adb84d": restoredHomepage4.url,
  "4800b8e8-f92b-4acc-8615-7eec881e7031": restoredHomepage5.url,
  "2096d4af-5b89-49ad-b19f-7ca95ec54160": restoredHomepage6.url,
  "533377df-ddd6-4803-a0cb-6f5727c933b6": restoredHomepage7.url,
};

export const V2_PREVIEW_WINDOW = "v2-cms-preview";
export const V2_PREVIEW_SELECT = "v2-cms-select";
export const V2_PREVIEW_FOCUS = "v2-cms-focus";

type V2PageData = { config: V2PageConfig; media: V2Media; refreshFailed?: boolean };
const signedBase = (url: string) => url.split("?")[0];

/**
 * Media URLs are signed per request, so a refetch returns a new token for the same file. Keep the
 * previous URL while it is the same object and still comfortably valid: the <img> src stays
 * byte-identical and the browser never re-downloads/re-paints an unchanged image.
 */
function keepStableMedia(previous: unknown, next: unknown): unknown {
  const prev = previous as V2PageData | undefined;
  const incoming = next as V2PageData;
  const retained = lastKnownPublished(prev, incoming, incoming.refreshFailed === true && prev?.refreshFailed !== true);
  if (retained !== incoming) return retained;
  if (!prev?.media || !incoming?.media) return incoming;
  const media: V2Media = {};
  for (const [id, asset] of Object.entries(incoming.media)) {
    const old = prev.media[id];
    media[id] = old && signedBase(old.url) === signedBase(asset.url) && (old.expiresAt ?? 0) - Date.now() > 30 * 60_000 ? { ...asset, url: old.url, expiresAt: old.expiresAt ?? 0 } : asset;
  }
  return replaceEqualDeep(prev, { ...incoming, media });
}

export const v2PageQuery = (page: V2PageId) =>
  queryOptions({
    queryKey: ["v2-storefront", page],
    queryFn: () => getPublishedV2Page({ data: { page } }),
    // Published layout changes rarely; the server-rendered copy is reused by hydration.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    structuralSharing: keepStableMedia,
  });

export function mediaUrl(id: string | null | undefined, media: V2Media): string | undefined {
  if (!id) return undefined;
  return portableMediaUrl(V2_BUILTIN_URLS[id] ?? media[id]?.url);
}

/**
 * Published page config (loaded once per page by the route loader). Inside the admin
 * preview frame the editor streams its unsaved draft via same-origin postMessage;
 * customers never receive drafts.
 */
export function useV2Page(page: V2PageId): { config: V2PageConfig; media: V2Media } {
  const published = useQuery(v2PageQuery(page));
  const { uiLocale, setLocale } = useI18n();
  const [preview, setPreview] = useState<{ config: V2PageConfig; media: V2Media } | null>(null);
  useEffect(() => {
    if (window.parent === window || window.name !== V2_PREVIEW_WINDOW) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const msg = event.data;
      if (msg?.type === V2_PREVIEW_FOCUS && msg.page === page && typeof msg.id === "string") {
        const host = document.querySelector(`[data-v2-edit-id="${CSS.escape(msg.id)}"]`);
        (host?.firstElementChild ?? host)?.scrollIntoView({ block: "start", behavior: "smooth" });
        return;
      }
      if (msg?.type !== "v2-cms-preview" || msg.page !== page) return;
      if (isUiLocale(msg.locale) && msg.locale !== uiLocale) setLocale(msg.locale, { persist: false });
      setPreview({ config: sanitizeV2Page(msg.config, page), media: msg.media && typeof msg.media === "object" ? msg.media : {} });
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "v2-cms-ready", page }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [page, uiLocale, setLocale]);
  return preview ?? published.data ?? { config: defaultV2Page(page), media: {} };
}

export type V2Slots = {
  hero: (section: V2Section) => ReactNode;
  destinations?: (section: V2Section) => ReactNode;
  regions?: (section: V2Section) => ReactNode;
  /** Optional page-owned content placed immediately after regional discovery. */
  afterRegions?: ReactNode;
  /** Optional page-owned content placed immediately after the destination carousel. */
  afterDestinations?: ReactNode;
  /** Rendered directly under the configured benefit row (e.g. refund trust card). */
  afterBenefits?: ReactNode;
  /** eSIM desktop places benefits inside its hero while preserving the mobile row. */
  benefitsInDesktopHero?: boolean;
  /** Page-owned FAQ presentation replacing the generic configured FAQ list. */
  faq?: ReactNode;
};

/** Renders the configured, visible sections in order through the approved V2 components. */
export function V2Sections({ config, media, slots, only, onDestinationSearch, searchField }: { config: V2PageConfig; media: V2Media; slots: V2Slots; only?: (section: V2Section) => boolean; onDestinationSearch?: () => void; searchField?: ReactNode }) {
  const { locale } = useI18n();
  const optionalServices = useOptionalServices();
  const [isPreview, setIsPreview] = useState(false);
  useEffect(() => {
    setIsPreview(window.parent !== window && window.name === V2_PREVIEW_WINDOW);
  }, []);
  // Admin preview only: clicking a section tells the editor which section to open.
  useEffect(() => {
    if (!isPreview) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const host = target?.closest<HTMLElement>("[data-v2-edit-id]");
      if (!host) return;
      if (target?.closest("a[href]")) event.preventDefault();
      window.parent.postMessage({ type: V2_PREVIEW_SELECT, page: config.page, id: host.dataset["v2EditId"] }, window.location.origin);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isPreview, config.page]);
  const sections = config.sections.filter((s) => s.visible && (!only || only(s)));
  const editable = (s: V2Section, node: ReactNode) => (isPreview && node ? <div key={s.id} data-v2-edit-id={s.id} style={{ display: "contents" }}>{node}</div> : node);
  return (
    <>
      {sections.map((s, index) => editable(s, (() => {
        const t = (key: string) => v2Text(s, key, locale);
        const items = s.items.filter((item) => item.visible);
        const framed = (node: ReactNode) => <V2SectionFrame key={s.id} section={s}>{config.page === "esim" && s.type !== "SEARCH_HERO" && s.type !== "BENEFIT_ROW" ? <Reveal stagger={s.type === "DESTINATION_CAROUSEL" || s.type === "GUIDE_CAROUSEL"}>{node}</Reveal> : node}</V2SectionFrame>;
        switch (s.type) {
          case "SEARCH_HERO":
            return framed(slots.hero(s));
          case "BENEFIT_ROW":
            if (slots.benefitsInDesktopHero) return null;
            return framed(<div><TrustRow items={items.map((item) => ({ icon: <StorefrontIcon name={item.icon} className="size-6" />, label: v2ItemText(item.title, locale) }))} />{slots.afterBenefits}</div>);
          case "DESTINATION_CAROUSEL":
            return framed(<>{slots.destinations?.(s)}{slots.afterDestinations}</>);
          case "TRUST_REVIEWS":
            return framed(<V2TrustReviews section={s} media={media} preview={isPreview} onDestinationSearch={onDestinationSearch} searchField={searchField} />);
          case "REGION_DISCOVERY":
            return config.page === "esim" ? <Reveal key={s.id} stagger>{slots.regions?.(s)}{slots.afterRegions}</Reveal> : <V2Fragment key={s.id}>{slots.regions?.(s)}{slots.afterRegions}</V2Fragment>;
          case "NOTICE":
            return <V2Notice key={s.id} section={s} title={t("title")} text={t("text")} />;
          case "INFO_GRID":
            return <V2EditorialGrid key={s.id} section={s} locale={getActiveUiLocale()} resolve={id=>mediaUrl(id??null,media)}/>;
          case "HOW_IT_WORKS":
            return framed(<HowItWorks title={t("title")} steps={items.map((item) => ({ t: v2ItemText(item.title, locale), s: v2ItemText(item.text, locale), image: mediaUrl(item.mediaId, media),media:item.tabletMediaId||item.mobileMediaId||item.imageDisplay?<ResponsiveMediaPicture value={item} resolve={id=>mediaUrl(id??null,media)} alt={v2ItemText(item.imageAlt,locale)} className="row-span-2 size-10"/>:undefined }))} />);
          case "INSTALLATION_STEPS":
            return <div key={s.id} id="how" className="scroll-mt-28"><V2Installation title={t("title")} subtitle={t("subtitle")} steps={items.map((item) => v2ItemText(item.title, locale))} images={items.map(item => item.tabletMediaId||item.mobileMediaId||item.imageDisplay?<ResponsiveMediaPicture value={item} resolve={id=>mediaUrl(id??null,media)} alt={v2ItemText(item.imageAlt,locale)} className="size-full"/>:mediaUrl(item.mediaId, media))} ready={t("ready")} adding={t("adding")} cta={t("cta")} href={s.href === "/destek" ? "/esim/kurulum" : s.href} variant={s.variant === "simple" ? "simple" : "animated"} /></div>;
          case "COMPATIBILITY": {
            const pairedPromo = sections[index + 1];
            if (pairedPromo?.type === "PROMO_BANNER" && pairedPromo.href === "/lounge" && isInWindow(pairedPromo) && optionalServices.lounge) {
              const loungeImage = mediaUrl(pairedPromo.mediaId, media);
              const vignettePromo = optionalServices.vignette ? sections.find((candidate) => candidate.type === "PROMO_BANNER" && candidate.href === "/vignette" && isInWindow(candidate)) : undefined;
              return (
                <div key={`${s.id}-${pairedPromo.id}`} className="scroll-mt-24">
                  <div className="lg:hidden">
                    <PromoCard image={loungeImage ?? ""} title={v2Text(pairedPromo, "title", locale)} {...(v2Text(pairedPromo, "subtitle", locale) ? { sub: v2Text(pairedPromo, "subtitle", locale) } : {})} to={pairedPromo.href} compactDesktop />
                  </div>
                  <div className="hidden pb-6 pt-6 lg:block">
                    {vignettePromo && (
                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <DesktopPromoCard image={loungeImage ?? ""} title={v2Text(pairedPromo, "title", locale)} cta={v2Text(pairedPromo, "subtitle", locale)} to="/lounge" imagePosition="center 56%" />
                        <DesktopPromoCard image={vignetteRoadDesktop} title={v2Text(vignettePromo, "title", locale)} cta={v2Text(vignettePromo, "subtitle", locale)} to="/vignette" imagePosition="center 58%" />
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return null; // Single compatibility entry: HomeCompatibilityCard below regional packages.
          }
          case "PROMO_BANNER": {
            const previous = sections[index - 1];
            if (isHiddenServiceHref(s.href, optionalServices)) return null;
            if (s.href === "/lounge" && previous?.type === "COMPATIBILITY") return null;
            const image = mediaUrl(s.mediaId, media);
            if (!isInWindow(s) || !t("title")) return null;
            const pairedDesktopVignette = s.href === "/vignette" && optionalServices.lounge && sections.some((candidate, candidateIndex) => candidate.type === "COMPATIBILITY" && sections[candidateIndex + 1]?.href === "/lounge");
            const promo = <PromoCard imageNode={s.tabletMediaId||s.mobileMediaId||s.imageDisplay?<ResponsiveMediaPicture value={s} resolve={id=>mediaUrl(id??null,media)} alt={t("title")} className="absolute inset-0 size-full"/>:undefined} image={image ?? ""} title={t("title")} {...(t("subtitle") ? { sub: t("subtitle") } : {})} to={s.href === "/esim/kurulum" ? "/esim" : s.href} />;
            return pairedDesktopVignette ? <div key={s.id} className="lg:hidden">{promo}</div> : <V2Fragment key={s.id}>{promo}</V2Fragment>;
          }
          case "INFO_CAROUSEL":
            return framed(<V2InfoCarousel section={s} media={media} />);
          case "GUIDE_CAROUSEL":
            return framed(<V2GuidesRail title={t("title")} lead={t("lead")} allLabel={t("all")} />);
          case "FAQ": {
            if (slots.faq) return framed(slots.faq);
            const questions = items.map((item) => [v2ItemText(item.title, locale), v2ItemText(item.text, locale)] as const);
            return framed(<V2CompactFaq title={t("title")} questions={questions} relaxed={s.variant === "comfortable"} />);
          }
          case "SPACER":
            return <div key={s.id} aria-hidden className={s.height === "tall" ? "h-10" : s.height === "normal" ? "h-6" : "h-3"} />;
          default:
            return null;
        }
      })()))}
    </>
  );
}

function V2Fragment({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
