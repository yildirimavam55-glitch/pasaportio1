import { ArrowRight, ShieldCheck, Smartphone, Zap } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import {
  ESIM_CONTENT,
  LOUNGE_CONTENT,
  localized,
  type ServiceSlug,
} from "@/content/travel-content";
import {
  ESIM_SERVICE_CONFIG,
  LOUNGE_SERVICE_CONFIG,
  SERVICE_REGISTRY,
} from "@/domain/experience/config";
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
import { StorefrontProvider, useMediaUrl } from "@/components/storefront/StorefrontContext";
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
  const availability = useServiceAvailability();
  const config = published.data?.config ?? defaultStorefront(service);

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
      <Experience service={service} onServiceChange={onServiceChange} config={config} />
    </StorefrontProvider>
  );
}

const ESIM_TRUST: Record<string, { tr: string; de: string; en: string }> = {
  instant: { tr: "Anında QR", de: "Sofortiger QR", en: "Instant QR" },
  digital: { tr: "Fiziksel SIM gerekmez", de: "Keine physische SIM", en: "No physical SIM" },
  easy: { tr: "Kolay kurulum", de: "Einfache Einrichtung", en: "Easy setup" },
};
const LOUNGE_TRUST: Record<string, { tr: string; de: string; en: string }> = {
  global: {
    tr: "Dünya genelinde binlerce lounge",
    de: "Tausende Lounges weltweit",
    en: "Thousands of lounges worldwide",
  },
  easy: { tr: "Kolay rezervasyon", de: "Einfache Buchung", en: "Easy booking" },
  secure: { tr: "Güvenli ödeme", de: "Sichere Zahlung", en: "Secure payment" },
};

function Experience({
  service,
  onServiceChange,
  config,
}: {
  service: ServiceSlug;
  onServiceChange: (service: ServiceSlug) => void;
  config: StorefrontConfig;
}) {
  const { locale } = useI18n();
  const copy = localized(service === "esim" ? ESIM_CONTENT : LOUNGE_CONTENT, locale);
  const [esimState, setEsimState] = useState<EsimFinderState>(ESIM_SERVICE_CONFIG.initialState);
  const [loungeState, setLoungeState] = useState<LoungeFinderState>(
    LOUNGE_SERVICE_CONFIG.initialState,
  );
  const { switchService, isSwitching, target, phase } = useServiceSwitchTransition();
  const selectedService = target ?? service;

  const requestServiceChange = (next: ServiceSlug) => {
    if (next === service || isSwitching) return;
    switchService(next, () => onServiceChange(next));
  };
  const scrollToFinder = () =>
    document.getElementById("finder")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const heroSection = config.sections.find((s) => s.type === "HERO");
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
          <Reveal key={section.id}>
            <TrustStrip section={section} />
          </Reveal>
        );
      case "POPULAR_DESTINATIONS":
        return (
          <Reveal key={section.id}>
            <VisualPopular service={service} section={section} />
          </Reveal>
        );
      case "PRODUCT_SOLUTIONS":
        return (
          <Reveal key={section.id}>
            <ProductSolutions section={section} />
          </Reveal>
        );
      case "CAMPAIGN_BANNER":
        return (
          <Reveal key={section.id}>
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
      {heroSection && (
        <Hero
          service={service}
          section={heroSection}
          onFind={scrollToFinder}
          transitionPhase={phase}
        />
      )}
      <div className="mx-auto mt-4 max-w-finder px-3 sm:mt-5 sm:px-6">
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
      className={`relative z-10 flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors duration-200 ${active ? "text-primary-foreground" : "text-primary hover:text-foreground"}`}
    >
      <span className={`service-selector-icon ${active ? "is-active" : ""}`}>{icon}</span>
      {children}
    </button>
  );
}

function Hero({
  service,
  section,
  onFind,
  transitionPhase,
}: {
  service: ServiceSlug;
  section: StorefrontSection;
  onFind: () => void;
  transitionPhase: "outgoing" | "incoming" | null;
}) {
  const { locale } = useI18n();
  const copy = localized(service === "esim" ? ESIM_CONTENT : LOUNGE_CONTENT, locale);
  const media = SERVICE_REGISTRY[service].media;
  const desktop = useMediaUrl(section.mediaId);
  const mobile = useMediaUrl(section.mobileMediaId ?? section.mediaId);
  const [failed, setFailed] = useState(false);
  const desktopSrc = failed ? media.fallbackSrc : (desktop?.url ?? media.desktopSrc);
  const mobileSrc = failed ? media.fallbackSrc : (mobile?.url ?? media.mobileSrc);
  const heightClass = HERO_HEIGHT_CLASS[section.height] ?? HERO_HEIGHT_CLASS["normal"];
  const centered = section.align === "center";
  const trust = service === "esim" ? ESIM_TRUST : LOUNGE_TRUST;

  return (
    <section
      className={`service-hero-transition mx-auto ${widthClass(section)} px-3 pt-3 sm:px-6 sm:pt-5`}
      data-phase={transitionPhase ?? undefined}
    >
      <div
        className={`relative ${heightClass} overflow-hidden rounded-hero bg-primary sm:rounded-[1.75rem]`}
      >
        <picture>
          <source media="(max-width: 639px)" srcSet={mobileSrc} />
          <img
            src={desktopSrc}
            onError={() => setFailed(true)}
            alt={desktop?.alt || media.alt[locale] || media.alt.tr}
            width={1600}
            height={1008}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
            style={{ objectPosition: desktop?.position ?? `${section.focalX}% ${section.focalY}%` }}
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
            {Object.entries(trust).map(([key, label]) => (
              <div
                key={key}
                className="flex flex-1 items-center gap-1.5 rounded-xl bg-card/90 px-2 py-2.5 text-card-foreground shadow-soft backdrop-blur sm:max-w-[10rem] sm:px-3 sm:py-2"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-primary sm:size-7">
                  {key === "instant" || key === "global" ? (
                    <Zap className="size-3 sm:size-3.5" />
                  ) : key === "digital" || key === "easy" ? (
                    <Smartphone className="size-3 sm:size-3.5" />
                  ) : (
                    <ShieldCheck className="size-3 sm:size-3.5" />
                  )}
                </span>
                <span className="min-w-0 text-[0.65rem] font-semibold leading-tight sm:text-xs">
                  {label[locale]}
                </span>
              </div>
            ))}
          </div>
          {section.showOffer && (
            <div className="w-fit max-w-xs rounded-2xl bg-card/95 p-3 text-card-foreground shadow-card backdrop-blur sm:p-4">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {tx(section, "offerTitle", locale, copy.offerTitle)}
              </span>
              <strong className="mt-1 block text-base sm:text-lg">
                {tx(section, "offerValue", locale, copy.offerValue)}
              </strong>
              <span className="mt-1 block text-xs text-muted-foreground">
                {tx(section, "offerMeta", locale, copy.offerMeta)}
              </span>
            </div>
          )}
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
