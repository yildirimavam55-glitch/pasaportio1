import { useEffect, useState, type ReactNode } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { HowItWorks, PromoCard, TrustRow } from "@/components/design-v2/V2Shell";
import { V2Compatibility, V2CompactFaq, V2EsimFaq, V2GuidesRail, V2InfoGrid, V2Installation } from "@/components/design-v2/V2DiscoveryContent";
import { StorefrontIcon } from "@/domain/storefront/icons";
import { defaultV2Page, isInWindow, sanitizeV2Page, v2ItemText, v2Text, type V2PageConfig, type V2PageId, type V2Section } from "@/domain/storefront/v2";
import { getPublishedV2Page, type V2Media } from "@/lib/v2-storefront.functions";
import { useI18n } from "@/i18n";
import esimHero from "@/assets/esim-hero-mobile.jpg";
import loungeHero from "@/assets/lounge-hero-mobile.jpg";
import vignetteHero from "@/assets/v2-vignette-hero.jpg";
import loungeCard from "@/assets/lounge-card.jpg.asset.json";
import esimCrossSell from "@/assets/esim-cross-sell.jpg.asset.json";

export const V2_BUILTIN_URLS: Record<string, string> = {
  "builtin:esim-hero": esimHero,
  "builtin:lounge-hero": loungeHero,
  "builtin:vignette-hero": vignetteHero,
  "builtin:lounge-card": loungeCard.url,
  "builtin:esim-cross-sell": esimCrossSell.url,
};

export const V2_PREVIEW_WINDOW = "v2-cms-preview";

export const v2PageQuery = (page: V2PageId) =>
  queryOptions({ queryKey: ["v2-storefront", page], queryFn: () => getPublishedV2Page({ data: { page } }), staleTime: 60_000 });

export function mediaUrl(id: string | null | undefined, media: V2Media): string | undefined {
  if (!id) return undefined;
  return V2_BUILTIN_URLS[id] ?? media[id]?.url;
}

/**
 * Published page config (loaded once per page by the route loader). Inside the admin
 * preview frame the editor streams its unsaved draft via same-origin postMessage;
 * customers never receive drafts.
 */
export function useV2Page(page: V2PageId): { config: V2PageConfig; media: V2Media } {
  const published = useQuery(v2PageQuery(page));
  const { locale, setLocale } = useI18n();
  const [preview, setPreview] = useState<{ config: V2PageConfig; media: V2Media } | null>(null);
  useEffect(() => {
    if (window.parent === window || window.name !== V2_PREVIEW_WINDOW) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const msg = event.data;
      if (msg?.type !== "v2-cms-preview" || msg.page !== page) return;
      if (["tr", "de", "en"].includes(msg.locale) && msg.locale !== locale) setLocale(msg.locale);
      setPreview({ config: sanitizeV2Page(msg.config, page), media: msg.media && typeof msg.media === "object" ? msg.media : {} });
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "v2-cms-ready", page }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [page, locale, setLocale]);
  return preview ?? published.data ?? { config: defaultV2Page(page), media: {} };
}

export type V2Slots = {
  hero: (section: V2Section) => ReactNode;
  destinations?: (section: V2Section) => ReactNode;
  regions?: (section: V2Section) => ReactNode;
};

/** Renders the configured, visible sections in order through the approved V2 components. */
export function V2Sections({ config, media, slots, only }: { config: V2PageConfig; media: V2Media; slots: V2Slots; only?: (section: V2Section) => boolean }) {
  const { locale } = useI18n();
  return (
    <>
      {config.sections.filter((s) => s.visible && (!only || only(s))).map((s) => {
        const t = (key: string) => v2Text(s, key, locale);
        const items = s.items.filter((item) => item.visible);
        switch (s.type) {
          case "SEARCH_HERO":
            return <V2Fragment key={s.id}>{slots.hero(s)}</V2Fragment>;
          case "BENEFIT_ROW":
            return <TrustRow key={s.id} items={items.map((item) => ({ icon: <StorefrontIcon name={item.icon} className="size-6" />, label: v2ItemText(item.title, locale) }))} />;
          case "DESTINATION_CAROUSEL":
            return <V2Fragment key={s.id}>{slots.destinations?.(s)}</V2Fragment>;
          case "REGION_DISCOVERY":
            return <V2Fragment key={s.id}>{slots.regions?.(s)}</V2Fragment>;
          case "NOTICE":
            return <div key={s.id} className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-border"><p className="font-display text-base font-bold text-foreground">{t("title")}</p>{t("text") && <p className="mt-1 text-sm text-muted-foreground">{t("text")}</p>}</div>;
          case "INFO_GRID":
            return <V2InfoGrid key={s.id} title={t("title")} items={items.map((item) => ({ title: v2ItemText(item.title, locale), text: v2ItemText(item.text, locale) }))} />;
          case "HOW_IT_WORKS":
            return <HowItWorks key={s.id} title={t("title")} steps={items.map((item) => ({ t: v2ItemText(item.title, locale), s: v2ItemText(item.text, locale) }))} />;
          case "INSTALLATION_STEPS":
            return <V2Installation key={s.id} title={t("title")} subtitle={t("subtitle")} steps={items.map((item) => v2ItemText(item.title, locale))} ready={t("ready")} adding={t("adding")} cta={t("cta")} href={s.href} variant={s.variant === "simple" ? "simple" : "animated"} />;
          case "COMPATIBILITY":
            return <V2Compatibility key={s.id} title={t("title")} />;
          case "PROMO_BANNER": {
            const image = mediaUrl(s.mediaId, media);
            if (!isInWindow(s) || !t("title")) return null;
            return <PromoCard key={s.id} image={image ?? ""} title={t("title")} {...(t("subtitle") ? { sub: t("subtitle") } : {})} to={s.href} />;
          }
          case "GUIDE_CAROUSEL":
            return <V2GuidesRail key={s.id} title={t("title")} lead={t("lead")} allLabel={t("all")} />;
          case "FAQ": {
            const questions = items.map((item) => [v2ItemText(item.title, locale), v2ItemText(item.text, locale)] as const);
            return s.variant === "comfortable" ? <V2EsimFaq key={s.id} title={t("title")} questions={questions} /> : <V2CompactFaq key={s.id} title={t("title")} questions={questions} />;
          }
          case "SPACER":
            return <div key={s.id} aria-hidden className={s.height === "tall" ? "h-10" : s.height === "normal" ? "h-6" : "h-3"} />;
          default:
            return null;
        }
      })}
    </>
  );
}

function V2Fragment({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
