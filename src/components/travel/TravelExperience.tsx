import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import esimHero from "@/assets/travely-esim-hero.jpg";
import loungeHero from "@/assets/travely-lounge-hero.jpg";
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
import { HERO_HEIGHT_CLASS, surfaceClasses, widthClass } from "@/domain/storefront/styles";
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
      />
    </StorefrontProvider>
  );
}

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
  const [esimState, setEsimState] = useState<EsimFinderState>(() =>
    restoreFinderState("travel-esim-finder", ESIM_SERVICE_CONFIG.initialState),
  );
  const [loungeState, setLoungeState] = useState<LoungeFinderState>(() =>
    restoreFinderState("travel-lounge-finder", LOUNGE_SERVICE_CONFIG.initialState),
  );
  const [assistantOpen, setAssistantOpen] = useState(false);
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
        if (service === "esim" && !assistantOpen) {
          return (
            <div
              key={section.id}
              className="service-finder-transition mx-auto mt-3 max-w-finder px-3 sm:px-6"
              data-phase={phase ?? undefined}
            >
              <button
                type="button"
                onClick={() => setAssistantOpen(true)}
                className="w-full rounded-2xl border border-dashed border-border bg-secondary/50 px-4 py-3 text-left text-sm font-semibold text-primary"
              >
                {ASSISTANT_COPY[locale].open}
              </button>
            </div>
          );
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
      <ServiceHero
        service={service}
        phase={phase}
        onAirportSelect={(airportId) => {
          setLoungeState((prev) => ({ ...prev, airportId }));
          smoothlyShowFinder();
        }}
      />
      <div id="service-selector" className="mx-auto max-w-finder px-3 pt-3 sm:px-6 sm:pt-5">
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
      headline: "Dünyayı keşfet, bağlantıda kal",
      description: "Gideceğin ülkeyi seç, sana uygun internet paketlerine hemen ulaş.",
      alt: "Havalimanında telefonundan seyahat bağlantısını hazırlayan yolcu",
    },
    lounge: {
      eyebrow: "Havalimanı Lounge",
      headline: "Yolculuk başlamadan rahatla",
      description: "Havalimanını seç, uçuşundan önce konforlu bir mola bul.",
      alt: "Havalimanı lounge alanında uçuşunu bekleyen yolcu",
    },
  },
  de: {
    esim: {
      eyebrow: "Reise-eSIM",
      headline: "Entdecke die Welt. Bleib verbunden.",
      description: "Wähle dein Reiseland und finde sofort den passenden Datentarif.",
      alt: "Reisende bereitet am Flughafen ihre mobile Verbindung vor",
    },
    lounge: {
      eyebrow: "Airport Lounge",
      headline: "Entspannt reisen, bevor es losgeht",
      description: "Wähle deinen Flughafen und finde eine komfortable Pause vor dem Flug.",
      alt: "Reisende entspannt vor ihrem Flug in einer Flughafenlounge",
    },
  },
  en: {
    esim: {
      eyebrow: "Travel eSIM",
      headline: "Explore the world. Stay connected.",
      description: "Choose your destination and find the right data plan in seconds.",
      alt: "Traveler preparing mobile connectivity at the airport",
    },
    lounge: {
      eyebrow: "Airport Lounge",
      headline: "Relax before the journey begins",
      description: "Choose your airport and find a comfortable pause before your flight.",
      alt: "Traveler relaxing in an airport lounge before a flight",
    },
  },
} as const;

function ServiceHero({
  service,
  phase,
  onAirportSelect,
}: {
  service: ServiceSlug;
  phase: "outgoing" | "incoming" | null;
  onAirportSelect: (airportId: string) => void;
}) {
  const { locale } = useI18n();
  const copy = SERVICE_HERO_COPY[locale][service];
  const image = service === "esim" ? esimHero : loungeHero;

  return (
    <section className="mx-auto max-w-site px-3 pt-3 sm:px-6 sm:pt-5">
      <div className="service-hero relative min-h-[31rem] rounded-hero sm:min-h-[34rem] sm:rounded-[1.75rem]" data-service={service}>
        <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-lavender-soft">
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
        <div className="service-hero-content relative z-10 flex min-h-[31rem] flex-col p-5 sm:min-h-[34rem] sm:p-10 lg:p-14" data-phase={phase ?? undefined}>
          <div className="max-w-xl pt-1 sm:pt-3">
            <p className="text-sm font-bold uppercase text-primary">{copy.eyebrow}</p>
            <h1 className="mt-3 max-w-[19rem] font-display text-[2.55rem] font-bold leading-[1.02] text-balance text-foreground sm:max-w-2xl sm:text-6xl">
              {copy.headline}
            </h1>
            <p className="mt-3 max-w-[20rem] text-[15px] font-medium leading-6 text-foreground/80 sm:max-w-lg sm:text-lg">
              {copy.description}
            </p>
          </div>
          <div className="relative z-20 mt-auto w-full max-w-xl pt-7">
            <QuickSearch service={service} onAirportSelect={onAirportSelect} embedded />
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
