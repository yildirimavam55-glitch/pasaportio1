import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import esimHero from "@/assets/travely-esim-hero-compact.jpg";
import loungeHero from "@/assets/travely-lounge-hero-compact.jpg";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import {
  ESIM_CONTENT,
  LOUNGE_CONTENT,
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
import { surfaceClasses, widthClass } from "@/domain/storefront/styles";
import { getPublishedStorefront } from "@/lib/storefront.functions";
import { StorefrontProvider } from "@/components/storefront/StorefrontContext";
import { FinderShell, EsimFinder, LoungeFinder } from "./Finder";
import { QuickSearch } from "./QuickSearch";

const ASSISTANT_COPY = {
  tr: { open: "Hangi pakete ihtiyacın olduğunu bilmiyor musun? Paket yardımcısını kullan →" },
  de: { open: "Du weißt nicht, welches Paket passt? Paket-Assistent öffnen →" },
  en: { open: "Not sure which package you need? Use the package assistant →" },
} as const;
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
  assistantRoute = false,
}: {
  service: ServiceSlug;
  onServiceChange: (service: ServiceSlug, options?: { finderTarget?: boolean }) => void;
  assistantRoute?: boolean;
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
      <PublicShell
        activeService={service}
        onServiceChange={(next, options) =>
          onServiceChange(next, options?.scrollToFinder ? { finderTarget: true } : undefined)
        }
      >
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
        assistantRoute={assistantRoute}
      />
    </StorefrontProvider>
  );
}

function Experience({
  service,
  onServiceChange,
  config,
  assistantRoute,
}: {
  service: ServiceSlug;
  onServiceChange: (service: ServiceSlug, options?: { finderTarget?: boolean }) => void;
  config: StorefrontConfig;
  assistantRoute: boolean;
}) {
  const { locale } = useI18n();
  const copy = localized(service === "esim" ? ESIM_CONTENT : LOUNGE_CONTENT, locale);
  const [esimState, setEsimState] = useState<EsimFinderState>(() =>
    restoreFinderState("travel-esim-finder", ESIM_SERVICE_CONFIG.initialState),
  );
  const [loungeState, setLoungeState] = useState<LoungeFinderState>(() =>
    restoreFinderState("travel-lounge-finder", LOUNGE_SERVICE_CONFIG.initialState),
  );
  const [assistantOpen, setAssistantOpen] = useState(
    () => assistantRoute && window.location.hash === "#finder",
  );
  const [searchMode, setSearchMode] = useState(false);
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

  useEffect(() => {
    window.sessionStorage.setItem("travel-esim-finder", JSON.stringify(esimState));
  }, [esimState]);

  useEffect(() => {
    window.sessionStorage.setItem("travel-lounge-finder", JSON.stringify(loungeState));
  }, [loungeState]);

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
      if (options.scrollToFinder) onServiceChange(next, { finderTarget: true });
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
      onServiceChange(next, options.scrollToFinder ? { finderTarget: true } : undefined);
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
  const render = (section: StorefrontSection): ReactNode => {
    if (!section.visible) return null;
    if (section.type === "HERO" || section.type === "SERVICE_SELECTOR") return null; // rendered explicitly
    switch (section.type) {
      case "FINDER":
        if (service === "esim" && (!assistantRoute || !assistantOpen)) {
          return null;
        }
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
        return service === "esim" && assistantRoute && assistantOpen ? (
          <DeviceCompatibilitySection key={section.id} />
        ) : null;
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
        return null;
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
      <ServiceHero
        service={service}
        phase={phase}
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
        onAirportSelect={(airportId) => {
          setLoungeState((prev) => ({ ...prev, airportId }));
          smoothlyShowFinder();
        }}
      />
      <div className="experience-secondary" data-search-mode={searchMode || undefined}>
        <div
          id="service-selector"
          className="search-focus-selector mx-auto max-w-finder px-3 pt-3 sm:px-6 sm:pt-5"
        >
          <div
            className="service-selector relative grid grid-cols-2 rounded-xl border border-border/80 bg-secondary/70 p-1 shadow-soft"
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
        {service === "esim" && assistantRoute && !assistantOpen && (
          <div className="mx-auto mt-6 max-w-finder px-3 text-center sm:px-6">
            <button
              type="button"
              onClick={() => {
                setAssistantOpen(true);
                scrollToFinder();
              }}
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              {ASSISTANT_COPY[locale].open}
            </button>
          </div>
        )}
      </div>
    </PublicShell>
  );
}

function restoreFinderState<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.sessionStorage.getItem(key);
    return saved ? ({ ...fallback, ...JSON.parse(saved) } as T) : fallback;
  } catch {
    return fallback;
  }
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
      className={`service-selector-button relative z-10 flex min-h-11 items-center justify-center gap-2 rounded-lg text-[15px] font-bold ${active ? "text-primary-foreground" : "text-muted-foreground hover:text-primary"}`}
    >
      <span className={`service-selector-icon ${active ? "is-active" : ""}`}>{icon}</span>
      {children}
    </button>
  );
}

const SERVICE_HERO_COPY = {
  tr: {
    esim: {
      eyebrow: "Seyahat eSIM’i",
      headline: "Seyahatte bağlantın hazır.",
      description: "Ülkeni seç, standart veya sınırsız eSIM paketlerini saniyeler içinde gör.",
      alt: "Havalimanında telefonunda aktif eSIM bağlantısını gösteren yolcu",
    },
    lounge: {
      eyebrow: "Havalimanı Lounge",
      headline: "Yolculuğuna konfor kat.",
      description: "Havalimanını seç, uygun lounge seçeneklerini hızlıca keşfet.",
      alt: "Uçak manzaralı premium havalimanı lounge alanında dinlenen yolcu",
    },
  },
  de: {
    esim: {
      eyebrow: "Reise-eSIM",
      headline: "Deine Verbindung ist startklar.",
      description: "Wähle dein Land und entdecke Standard- oder Unlimited-eSIMs in Sekunden.",
      alt: "Reisende zeigt am Flughafen ihre aktive eSIM-Verbindung",
    },
    lounge: {
      eyebrow: "Airport Lounge",
      headline: "Mehr Komfort für deine Reise.",
      description: "Wähle deinen Flughafen und entdecke schnell passende Lounges.",
      alt: "Reisende entspannt in einer Premium-Flughafenlounge mit Blick aufs Rollfeld",
    },
  },
  en: {
    esim: {
      eyebrow: "Travel eSIM",
      headline: "Stay connected as you travel.",
      description: "Choose your country and see standard or unlimited eSIM plans in seconds.",
      alt: "Traveler showing an active eSIM connection at the airport",
    },
    lounge: {
      eyebrow: "Airport Lounge",
      headline: "Add comfort to your journey.",
      description: "Choose your airport and quickly discover available lounge options.",
      alt: "Traveler relaxing in a premium airport lounge overlooking the apron",
    },
  },
} as const;

function ServiceHero({
  service,
  phase,
  onAirportSelect,
  searchMode,
  onSearchModeChange,
}: {
  service: ServiceSlug;
  phase: "outgoing" | "incoming" | null;
  onAirportSelect: (airportId: string) => void;
  searchMode: boolean;
  onSearchModeChange: (active: boolean) => void;
}) {
  const { locale } = useI18n();
  const copy = SERVICE_HERO_COPY[locale][service];
  const image = service === "esim" ? esimHero : loungeHero;

  return (
    <section className="service-hero-shell mx-auto max-w-site px-3 pt-3 sm:px-6 sm:pt-5">
      <div
        className="service-hero relative h-[18.5rem] rounded-hero sm:h-[26rem] sm:rounded-[1.75rem]"
        data-service={service}
        data-search-mode={searchMode || undefined}
      >
        <div className="service-hero-visual absolute inset-0 overflow-hidden rounded-[inherit] bg-lavender-soft">
          <img
            key={service}
            src={image}
            alt={copy.alt}
            width={1200}
            height={1504}
            fetchPriority="high"
            decoding="async"
            className="service-hero-image absolute inset-0 size-full object-cover"
          />
          <div className="service-hero-scrim absolute inset-0" />
        </div>
        <div
          className="service-hero-content relative z-10 flex h-full flex-col p-4 sm:p-8 lg:p-10"
          data-phase={phase ?? undefined}
        >
          <div className="service-hero-copy max-w-xl">
            <p className="text-xs font-bold uppercase text-primary-foreground/85 sm:text-sm">
              {copy.eyebrow}
            </p>
            <h1 className="mt-2 max-w-[17rem] font-display text-[1.85rem] font-bold leading-[1.08] text-balance text-primary-foreground sm:max-w-xl sm:text-[2.65rem]">
              {copy.headline}
            </h1>
            <p className="mt-2 max-w-[18rem] text-sm font-medium leading-5 text-primary-foreground/85 sm:max-w-lg sm:text-base sm:leading-6">
              {copy.description}
            </p>
          </div>
          <div className="service-hero-search relative z-20 mt-auto w-full max-w-xl pt-3 sm:pt-4">
            <QuickSearch
              service={service}
              onAirportSelect={onAirportSelect}
              onSearchModeChange={onSearchModeChange}
              embedded
            />
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
