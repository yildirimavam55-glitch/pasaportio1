import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plane, Signal, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { getServiceAvailability } from "@/lib/platform-settings.functions";
import { DEFAULT_SETTINGS, settingsText } from "@/domain/platform/settings";
import type { ServiceSlug } from "@/content/travel-content";

/**
 * Public service availability, derived from the existing feature flags.
 * A paused service NEVER produces a 404, a blank page or a technical error —
 * it produces a branded, configurable service state.
 */
export function useServiceAvailability() {
  const query = useQuery({
    queryKey: ["service-availability"],
    queryFn: () => getServiceAvailability(),
    staleTime: 60 * 1000,
  });
  const data = query.data ?? {
    esim: { storefront: true, checkout: true },
    lounge: { storefront: true, checkout: true },
    settings: DEFAULT_SETTINGS,
  };
  return { ...data, isPending: query.isPending };
}

const OTHER_LABEL: Record<ServiceSlug, { tr: string; de: string; en: string }> = {
  esim: { tr: "Lounge seçeneklerine bak", de: "Lounge-Optionen ansehen", en: "See lounge options" },
  lounge: { tr: "eSIM seçeneklerine bak", de: "eSIM-Optionen ansehen", en: "See eSIM options" },
};

/** Branded maintenance state for a paused service. */
export function ServicePausedState({ service }: { service: ServiceSlug }) {
  const { locale } = useI18n();
  const { settings } = useServiceAvailability();
  const copy = settings.maintenance[service];
  const other: ServiceSlug = service === "esim" ? "lounge" : "esim";
  const Icon = service === "esim" ? Signal : Plane;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
      <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-card sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Icon className="size-6" aria-hidden="true" />
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
