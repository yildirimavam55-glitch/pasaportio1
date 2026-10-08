import { queryOptions, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { getServiceAvailability } from "@/lib/platform-settings.functions";
import { DEFAULT_SETTINGS, settingsText } from "@/domain/platform/settings";
import type { ServiceSlug } from "@/content/travel-content";
import { EsimServiceIcon, LoungeServiceIcon } from "./ServiceIcons";
import { localize } from "@/i18n/overlay";

/**
 * Public service availability, derived from the existing feature flags.
 * A paused service NEVER produces a 404, a blank page or a technical error —
 * it produces a branded, configurable service state.
 */
export const serviceAvailabilityQuery = () =>
  queryOptions({ queryKey: ["service-availability"], queryFn: () => getServiceAvailability(), staleTime: 60 * 1000 });

export function useServiceAvailability() {
  const query = useQuery(serviceAvailabilityQuery());
  const data = query.data ?? {
    esim: { storefront: true, checkout: true },
    lounge: { storefront: true, checkout: true },
    vignette: { storefront: true, checkout: true },
    settings: DEFAULT_SETTINGS,
  };
  return { ...data, isPending: query.isPending };
}

export type OptionalService = "lounge" | "vignette";

/**
 * Single shared visibility rule for optional services. While the setting is
 * still loading the service is treated as hidden, so disabled content never flashes.
 */
export function useOptionalServices() {
  const query = useQuery(serviceAvailabilityQuery());
  const d = query.data;
  return {
    ready: Boolean(d),
    lounge: Boolean(d?.lounge.storefront),
    vignette: Boolean(d?.vignette.storefront),
  };
}

/** True for a public href that belongs to a currently hidden optional service. */
export function isHiddenServiceHref(href: string | undefined, services: { lounge: boolean; vignette: boolean }) {
  if (!href) return false;
  if (href === "/lounge" || href.startsWith("/lounge/")) return !services.lounge;
  if (href === "/vignette" || href.startsWith("/vignette/")) return !services.vignette;
  return false;
}

const UNAVAILABLE = {
  tr: { title: "Bu hizmet şu anda kullanılamıyor", body: "Daha önce satın aldığın hizmetler hesabında erişilebilir kalır.", cta: "eSIM ana sayfasına git" },
  de: { title: "Dieser Service ist derzeit nicht verfügbar", body: "Bereits gekaufte Leistungen bleiben in deinem Konto verfügbar.", cta: "Zur eSIM-Startseite" },
  en: { title: "This service is currently unavailable", body: "Services you already purchased stay available in your account.", cta: "Go to the eSIM homepage" },
  ar: { title: "هذه الخدمة غير متاحة حاليًا", body: "تبقى الخدمات التي اشتريتها متاحة في حسابك.", cta: "الانتقال إلى صفحة eSIM الرئيسية" },
} as const;

/** Localized unavailable state for a disabled optional service URL. */
export function ServiceUnavailableState() {
  const { locale } = useI18n();
  const c = (UNAVAILABLE as Record<string, (typeof UNAVAILABLE)["en"]>)[locale] ?? UNAVAILABLE.en;
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-14 sm:py-20" data-service-unavailable>
      <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-card sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Wrench className="size-6 stroke-[1.8]" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold sm:text-3xl">{c.title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">{c.body}</p>
        <Button asChild className="mt-6"><Link to="/">{c.cta}</Link></Button>
      </div>
    </section>
  );
}

const OTHER_LABEL: Record<ServiceSlug, { tr: string; de: string; en: string }> = {
  esim: localize({ tr: "Lounge seçeneklerine bak", de: "Lounge-Optionen ansehen", en: "See lounge options" }),
  lounge: localize({ tr: "eSIM seçeneklerine bak", de: "eSIM-Optionen ansehen", en: "See eSIM options" }),
};

/** Branded maintenance state for a paused service. */
export function ServicePausedState({ service }: { service: ServiceSlug }) {
  const { locale } = useI18n();
  const { settings } = useServiceAvailability();
  const copy = settings.maintenance[service];
  const other: ServiceSlug = service === "esim" ? "lounge" : "esim";
  const Icon = service === "esim" ? EsimServiceIcon : LoungeServiceIcon;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
      <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-card sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Icon className="size-6 stroke-[1.8]" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold sm:text-3xl">
          {settingsText(copy.storefrontTitle, locale, "Kısa bir aradayız")}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          {settingsText(copy.storefrontBody, locale, "")}
        </p>
        {copy.showAlternative && (
          <Button asChild className="mt-6">
            <Link to="/" search={{ service: other }}>
              {OTHER_LABEL[service][locale]}
            </Link>
          </Button>
        )}
        <p className="mt-5 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Wrench className="size-3.5" aria-hidden="true" />
          {locale === "de"
            ? "Bereits gekaufte Leistungen bleiben in deinem Konto verfügbar."
            : locale === "en"
              ? "Services you already purchased stay available in your account."
              : "Daha önce satın aldığın hizmetler hesabında erişilebilir kalır."}
        </p>
      </div>
    </section>
  );
}

/** Inline notice shown in place of purchase actions while checkout is paused. */
export function CheckoutPausedNote({ service, className = "" }: { service: ServiceSlug; className?: string }) {
  const { locale } = useI18n();
  const { settings } = useServiceAvailability();
  return (
    <p className={`rounded-xl border border-warning/40 bg-sand-soft/60 px-3 py-2 text-xs font-semibold ${className}`}>
      {settingsText(settings.maintenance[service].checkoutMessage, locale, "Yeni siparişler kısa süreliğine durduruldu.")}
    </p>
  );
}
