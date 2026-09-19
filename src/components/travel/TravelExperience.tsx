import { ArrowRight, Globe2, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import sharedHeroDesktop from "@/assets/shared-travel-hero-desktop.jpg";
import sharedHeroMobile from "@/assets/shared-travel-hero-mobile.jpg";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import {
  ESIM_CONTENT,
  LOUNGE_CONTENT,
  SHARED_HERO_CONTENT,
  localized,
  type ServiceSlug,
} from "@/content/travel-content";
import { ESIM_SERVICE_CONFIG, LOUNGE_SERVICE_CONFIG } from "@/domain/experience/config";
import type { EsimFinderState, LoungeFinderState } from "@/domain/experience/types";
import {
  defaultStorefront,
  itemText,
  tx,
  type StorefrontConfig,
  type StorefrontSection,
} from "@/domain/storefront/registry";
import { HERO_HEIGHT_CLASS, surfaceClasses, widthClass } from "@/domain/storefront/styles";
import { getPublishedStorefront } from "@/lib/storefront.functions";
import { StorefrontProvider } from "@/components/storefront/StorefrontContext";
import { FinderShell, EsimFinder, LoungeFinder } from "./Finder";
import { DeviceCompatibilitySection } from "./DeviceCompatibility";
import { PublicShell } from "./PublicShell";
import { ServicePausedState, useServiceAvailability } from "./ServiceAvailability";
import { Reveal } from "./Reveal";
import { useServiceSwitchTransition } from "./ServiceSwitchTransition";
import { EsimServiceIcon, LoungeServiceIcon } from "./ServiceIcons";
import {
  CampaignBanner,
  DeliveryConfidence,
  HowItWorks,
  ImageTextSection,
  ProductSolutions,
  TrustStrip,
  VisualComplementary,
  VisualPopular,
} from "./PublicVisualSections";

/**
 * The public homepage is rendered from the PUBLISHED storefront configuration.
 * If the configuration is missing or invalid the built-in layout is used, so an
 * editing mistake can never break the customer site.
 */
export function TravelExperience({
  service,
  onServiceChange,
}: {
  service: ServiceSlug;
  onServiceChange: (service: ServiceSlug) => void;
}) {
  const published = useQuery({
    queryKey: ["storefront", service],
    queryFn: () => getPublishedStorefront({ data: { service } }),
    staleTime: 60 * 1000,
  });
  const sharedPublished = useQuery({
    queryKey: ["storefront", "global"],
    queryFn: () => getPublishedStorefront({ data: { service: "global" } }),
    staleTime: 60 * 1000,
  });
  const availability = useServiceAvailability();
  const config = published.data?.config ?? defaultStorefront(service);
  const sharedConfig = sharedPublished.data?.config ?? defaultStorefront("global");
  const sharedHero = sharedConfig.sections.find((section) => section.type === "HERO");

  /** A paused service keeps its navigation but stops new discovery. */
  if (!availability.isPending && !availability[service].storefront) {
    return (
      <PublicShell activeService={service} onServiceChange={onServiceChange}>
        <ServicePausedState service={service} />
      </PublicShell>
    );
  }

  return (
    <StorefrontProvider config={config} media={published.data?.media ?? {}}>
      <Experience
        service={service}
        onServiceChange={onServiceChange}
        config={config}
        sharedHero={sharedHero}
        sharedMedia={sharedPublished.data?.media ?? {}}
      />
    </StorefrontProvider>
  );
}

function Experience({
  service,
  onServiceChange,
  config,
  sharedHero,
  sharedMedia,
}: {
  service: ServiceSlug;
  onServiceChange: (service: ServiceSlug) => void;
  config: StorefrontConfig;
  sharedHero: StorefrontSection | undefined;
  sharedMedia: Record<string, { url: string; alt: string; focalX: number; focalY: number }>;
}) {
  const { locale } = useI18n();
  const copy = localized(service === "esim" ? ESIM_CONTENT : LOUNGE_CONTENT, locale);
  const [esimState, setEsimState] = useState<EsimFinderState>(ESIM_SERVICE_CONFIG.initialState);
  const [loungeState, setLoungeState] = useState<LoungeFinderState>(
    LOUNGE_SERVICE_CONFIG.initialState,
  );
  const { switchService, isSwitching, target, phase } = useServiceSwitchTransition();
  const selectedService = target ?? service;
  const pendingScrollRef = useRef<{
    anchorTop: number;
    preserveAnchor: boolean;
    scrollToFinder: boolean;
  } | null>(null);
  const scrollAnimationRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (scrollAnimationRef.current !== null) {
        window.cancelAnimationFrame(scrollAnimationRef.current);
      }
    },
    [],
  );

  const finderIsNearViewport = () => {
    const selector = document.getElementById("service-selector");
    const finder = document.getElementById("finder");
    if (!selector || !finder) return false;
    const top = selector.getBoundingClientRect().top;
    const bottom = finder.getBoundingClientRect().bottom;
    return bottom >= -window.innerHeight * 0.15 && top <= window.innerHeight * 1.15;
  };

  const smoothlyShowFinder = () => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const selector = document.getElementById("service-selector");
    if (!selector) return;
    const headerOffset = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
    const destination = window.scrollY + selector.getBoundingClientRect().top - headerOffset - 8;
    if (reduced) {
      window.scrollTo({ top: destination, behavior: "auto" });
      return;
    }
    if (scrollAnimationRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimationRef.current);
    }
    const start = window.scrollY;
    const distance = destination - start;
    const startedAt = performance.now();
    const duration = 800;
    const step = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      window.scrollTo({ top: start + distance * eased, behavior: "auto" });
      if (progress < 1) {
        scrollAnimationRef.current = window.requestAnimationFrame(step);
      } else {
        scrollAnimationRef.current = null;
      }
    };
    scrollAnimationRef.current = window.requestAnimationFrame(step);
  };

  const requestServiceChange = (next: ServiceSlug, options: { scrollToFinder?: boolean } = {}) => {
    const finder = document.getElementById("finder");
    const nearFinder = finderIsNearViewport();
    if (next === service) {
      if (options.scrollToFinder && !nearFinder) smoothlyShowFinder();
      return;
    }
    if (isSwitching) return;
    pendingScrollRef.current = {
      anchorTop: document.getElementById("service-selector")?.getBoundingClientRect().top ?? 0,
      preserveAnchor: nearFinder && Boolean(finder),
      scrollToFinder: Boolean(options.scrollToFinder && !nearFinder),
    };
    switchService(next, () => {
      onServiceChange(next);
      const pending = pendingScrollRef.current;
      pendingScrollRef.current = null;
      const settleScroll = () => {
        if (pending?.preserveAnchor) {
          const selector = document.getElementById("service-selector");
          if (!selector) return;
          const delta = selector.getBoundingClientRect().top - pending.anchorTop;
          if (Math.abs(delta) > 0.5) window.scrollBy({ top: delta, behavior: "auto" });
        } else if (pending?.scrollToFinder) {
          smoothlyShowFinder();
        }
      };
      window.requestAnimationFrame(() => window.requestAnimationFrame(settleScroll));
      window.setTimeout(settleScroll, pending?.scrollToFinder ? 450 : 80);
      if (pending?.preserveAnchor) window.setTimeout(settleScroll, 740);
    });
  };
  const scrollToFinder = () => smoothlyShowFinder();

  const selectorSection = config.sections.find((s) => s.type === "SERVICE_SELECTOR");
  const render = (section: StorefrontSection, index: number): ReactNode => {
    if (!section.visible) return null;
    if (section.type === "HERO" || section.type === "SERVICE_SELECTOR") return null; // rendered explicitly
    switch (section.type) {
      case "FINDER":
        return (
          <div
            key={section.id}
            className="service-finder-transition"
            data-phase={phase ?? undefined}
          >
            <FinderShell
              title={
                service === "esim"
                  ? tx(section, "headline", locale, copy.finderTitle)
                  : tx(section, "headline", locale, copy.finderTitle)
              }
              description={tx(section, "description", locale, copy.finderDescription)}
            >
              {service === "esim" ? (
                <EsimFinder state={esimState} onChange={setEsimState} />
              ) : (
                <LoungeFinder state={loungeState} onChange={setLoungeState} />
              )}
            </FinderShell>
          </div>
        );
      case "COMPATIBILITY":
        return service === "esim" ? <DeviceCompatibilitySection key={section.id} /> : null;
      case "TRUST":
        return (
          <Reveal key={section.id} className="reveal-stagger">
            <TrustStrip section={section} />
          </Reveal>
        );
      case "POPULAR_DESTINATIONS":
        return (
          <Reveal key={section.id} className="reveal-stagger">
            <VisualPopular service={service} section={section} />
          </Reveal>
        );
      case "PRODUCT_SOLUTIONS":
        return (
          <Reveal key={section.id} className="reveal-stagger">
            <ProductSolutions section={section} />
          </Reveal>
        );
      case "CAMPAIGN_BANNER":
        return (
          <Reveal key={section.id} className="reveal-stagger">
            <CampaignBanner section={section} />
          </Reveal>
        );
      case "IMAGE_TEXT":
        return (
          <Reveal key={section.id}>
            <ImageTextSection section={section} />
          </Reveal>
        );
      case "CROSS_SELL":
        return (
          <Reveal key={section.id}>
            <VisualComplementary
              service={service}
              section={section}
              onSwitch={requestServiceChange}
            />
          </Reveal>
        );
      case "HOW_IT_WORKS":
        return (
          <Reveal key={section.id}>
            <HowItWorks service={service} section={section} />
          </Reveal>
        );
      case "DELIVERY":
        return (
          <Reveal key={section.id}>
            <DeliveryConfidence service={service} section={section} />
          </Reveal>
        );
      case "FAQ":
        return (
          <Reveal key={section.id}>
            <Education section={section} />
          </Reveal>
        );
      case "FINAL_CTA":
        return (
          <Reveal key={section.id}>
            <FinalCta section={section} onFind={scrollToFinder} />
          </Reveal>
        );
      default:
        return null;
    }
  };

  return (
    <PublicShell activeService={service} onServiceChange={requestServiceChange}>
      {sharedHero && <Hero section={sharedHero} media={sharedMedia} onFind={scrollToFinder} />}
      <div id="service-selector" className="mx-auto mt-4 max-w-finder px-3 sm:mt-5 sm:px-6">
        <div
          className="service-selector relative grid grid-cols-2 rounded-2xl border border-border bg-card p-1.5 shadow-soft"
          data-service={selectedService}
        >
          <span className="service-selector-pill" aria-hidden="true" />
          <ServiceButton
            active={selectedService === "esim"}
            onClick={() => requestServiceChange("esim")}
            icon={<EsimServiceIcon />}
          >
            {selectorSection ? tx(selectorSection, "esimLabel", locale, "eSIM") : "eSIM"}
          </ServiceButton>
          <ServiceButton
            active={selectedService === "lounge"}
            onClick={() => requestServiceChange("lounge")}
            icon={<LoungeServiceIcon />}
          >
            {selectorSection ? tx(selectorSection, "loungeLabel", locale, "Lounge") : "Lounge"}
          </ServiceButton>
        </div>
      </div>
      {config.sections.map(render)}
    </PublicShell>
  );
}

function ServiceButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`service-selector-button relative z-10 flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${active ? "text-primary-foreground" : "text-primary hover:text-foreground"}`}
    >
      <span className={`service-selector-icon ${active ? "is-active" : ""}`}>{icon}</span>
      {children}
    </button>
  );
}

function Hero({
  section,
  media,
  onFind,
}: {
  section: StorefrontSection;
  media: Record<string, { url: string; alt: string; focalX: number; focalY: number }>;
  onFind: () => void;
}) {
  const { locale } = useI18n();
  const copy = localized(SHARED_HERO_CONTENT, locale);
  const desktop = section.mediaId ? media[section.mediaId] : undefined;
  const mobileId = section.mobileMediaId ?? section.mediaId;
  const mobile = mobileId ? media[mobileId] : undefined;
  const [failed, setFailed] = useState(false);
  const desktopSrc = failed ? sharedHeroDesktop : (desktop?.url ?? sharedHeroDesktop);
  const mobileSrc = failed ? sharedHeroMobile : (mobile?.url ?? sharedHeroMobile);
  const heightClass = HERO_HEIGHT_CLASS[section.height] ?? HERO_HEIGHT_CLASS["normal"];
  const centered = section.align === "center";
  const trustIcons = [Globe2, Zap, ShieldCheck];

  return (
    <section className={`mx-auto ${widthClass(section)} px-3 pt-3 sm:px-6 sm:pt-5`}>
      <div
        className={`relative ${heightClass} overflow-hidden rounded-hero bg-primary sm:rounded-[1.75rem]`}
      >
        <picture>
          <source media="(max-width: 639px)" srcSet={mobileSrc} />
          <img
            src={desktopSrc}
            onError={() => setFailed(true)}
            alt={desktop?.alt || "Havalimanında telefonuyla seyahatini planlayan yolcu"}
            width={1600}
            height={1008}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
            style={{
              objectPosition: desktop
                ? `${desktop.focalX}% ${desktop.focalY}%`
                : `${section.focalX}% ${section.focalY}%`,
            }}
          />
        </picture>
        <div
          className="absolute inset-0 bg-hero-overlay"
          style={{ opacity: section.overlay / 45 }}
        />
        <div
          className={`relative flex ${heightClass} flex-col justify-between gap-5 p-5 text-hero-foreground sm:p-10 lg:p-14 ${centered ? "mx-auto items-center text-center" : ""}`}
        >
          <div className="max-w-xl">
            <p className="mb-2 text-xs font-bold uppercase text-hero-foreground/85 sm:mb-3 sm:text-sm">
              {tx(section, "eyebrow", locale, copy.eyebrow)}
            </p>
            <h1 className="font-display text-[1.75rem] font-bold leading-[1.08] text-balance sm:text-5xl">
              {tx(section, "headline", locale, copy.headline)}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-hero-foreground/85 sm:mt-4 sm:text-lg">
              {tx(section, "description", locale, copy.description)}
            </p>
            <div
              className={`mt-4 flex flex-wrap gap-2 sm:mt-6 ${centered ? "justify-center" : ""}`}
            >
              <Button
                onClick={onFind}
                variant="cta"
                size="lg"
                className="h-12 px-5 text-sm sm:h-14 sm:px-7 sm:text-base"
              >
                {tx(section, "ctaLabel", locale, copy.cta)}
                <ArrowRight className="size-4 sm:size-5" />
              </Button>
            </div>
          </div>
          <div className={`flex w-full gap-2 ${centered ? "justify-center" : ""}`}>
            {copy.trust.map((label, index) => {
              const TrustIcon = trustIcons[index] ?? ShieldCheck;
              return (
                <div
                  key={label}
                  className="flex flex-1 items-center gap-1.5 rounded-xl bg-card/90 px-2 py-2.5 text-card-foreground shadow-soft backdrop-blur sm:max-w-[10rem] sm:px-3 sm:py-2"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-primary sm:size-7">
                    <TrustIcon className="size-3 sm:size-3.5" />
                  </span>
                  <span className="min-w-0 text-[0.65rem] font-semibold leading-tight sm:text-xs">
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Education({ section }: { section: StorefrontSection }) {
  const { locale } = useI18n();
  const questions = section.items.filter((item) => item.visible);
  if (!questions.length) return null;
  return (
    <section id="faq" className={`mx-auto ${widthClass(section)} scroll-mt-24 px-4 py-10 sm:px-6`}>
      <div className="mb-6">
        <span className="text-xs font-bold uppercase text-primary">
          {tx(section, "eyebrow", locale, "")}
        </span>
        <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
          {tx(section, "headline", locale, "")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {tx(section, "description", locale, "")}
        </p>
      </div>
      <div className="rounded-card border border-border bg-card p-4 shadow-card">
        {questions.map((question, index) => (
          <details key={question.id} className="group border-b border-border last:border-b-0">
            <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold sm:text-base">
              {itemText(question.title, locale)}
              <span className="transition group-open:rotate-180">⌄</span>
            </summary>
            <p className="pb-4 text-sm leading-6 text-muted-foreground">
              {itemText(question.description, locale)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta({ section, onFind }: { section: StorefrontSection; onFind: () => void }) {
  const { locale } = useI18n();
  return (
    <section className={`mx-auto ${widthClass(section)} px-4 pb-14 pt-4 text-center sm:px-6`}>
      <div
        className={`rounded-card px-5 py-8 ${surfaceClasses(section, "bg-accent-soft py-10").split(" ")[0]}`}
      >
        <h2 className="font-display text-2xl font-bold sm:text-3xl">
          {tx(section, "headline", locale, "")}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          {tx(section, "description", locale, "")}
        </p>
        <Button variant="cta" size="lg" className="mt-5" onClick={onFind}>
          {tx(section, "ctaLabel", locale, "")}
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}
