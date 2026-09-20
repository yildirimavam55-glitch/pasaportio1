import {
  ArrowRight,
  CheckCircle2,
  Coffee,
  Mail,
  QrCode,
  Route,
  ShowerHead,
  Smartphone,
  TicketCheck,
  Utensils,
  Wifi,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  ESIM_CONTENT,
  LOUNGE_CONTENT,
  localized,
  type ServiceSlug,
} from "@/content/travel-content";
import { useI18n } from "@/i18n";
import { listEsimStartingPrices } from "@/lib/esim-catalogue.functions";
import { itemText, tx, type StorefrontSection } from "@/domain/storefront/registry";
import { surfaceClasses, widthClass } from "@/domain/storefront/styles";
import { StorefrontIcon } from "@/domain/storefront/icons";
import { useMediaUrl } from "@/components/storefront/StorefrontContext";
import { CountryFlag } from "./CountryFlag";
import { DestinationDiscovery } from "./DestinationDiscovery";
import airportFrankfurtAsset from "@/assets/airport-frankfurt.jpg.asset.json";
import airportIstanbulAsset from "@/assets/airport-istanbul.jpg.asset.json";
import destinationEuropeAsset from "@/assets/destination-europe.jpg.asset.json";
import destinationRouteAsset from "@/assets/destination-sila-yolu.jpg.asset.json";
import destinationTurkiyeAsset from "@/assets/destination-turkiye.jpg.asset.json";
import esimCrossSellAsset from "@/assets/esim-cross-sell.jpg.asset.json";
import loungeAsset from "@/assets/lounge-card.jpg.asset.json";

const COPY = {
  tr: {
    discover: "Keşfet",
    viewPackages: "Paketleri gör",
    startingAt: "Başlangıç",
    flexible: "Seyahatine göre",
    sample: "Teslimat önizlemesi",
    ready: { esim: "eSIM’in hazır", lounge: "Rezervasyonun hazır" },
    primary: { esim: "QR kodunu göster", lounge: "Giriş kodunu göster" },
    guide: "Kurulum rehberi",
    email: "E-postaya gönder",
    amenities: ["Wi-Fi", "Yiyecek", "İçecek", "Duş", "Sessiz alan"],
  },
  de: {
    discover: "Entdecken",
    viewPackages: "Pakete ansehen",
    startingAt: "Ab",
    flexible: "Passend zu deiner Reise",
    sample: "Zustellvorschau",
    ready: { esim: "Deine eSIM ist bereit", lounge: "Buchung bereit" },
    primary: { esim: "QR-Code anzeigen", lounge: "Zutrittscode anzeigen" },
    guide: "Installationsanleitung",
    email: "Per E-Mail senden",
    amenities: ["WLAN", "Essen", "Getränke", "Dusche", "Ruhebereich"],
  },
  en: {
    discover: "Explore",
    viewPackages: "View packages",
    startingAt: "From",
    flexible: "Made for your trip",
    sample: "Delivery preview",
    ready: { esim: "Your eSIM is ready", lounge: "Booking ready" },
    primary: { esim: "Show QR code", lounge: "Show entry code" },
    guide: "Installation guide",
    email: "Send by email",
    amenities: ["Wi-Fi", "Food", "Drinks", "Shower", "Quiet area"],
  },
} as const;

const DEFAULT_CARD_IMAGES: Record<string, string> = {
  tr: destinationTurkiyeAsset.url,
  eu: destinationEuropeAsset.url,
  route: destinationRouteAsset.url,
  ist: airportIstanbulAsset.url,
  fra: airportFrankfurtAsset.url,
  comfort: loungeAsset.url,
};

type SectionProp = { section?: StorefrontSection | null };

function SafeImage({
  src,
  fallback,
  alt,
  className,
  position,
}: {
  src: string;
  fallback: string;
  alt: string;
  className: string;
  position?: string | undefined;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={failed ? fallback : src}
      onError={() => setFailed(true)}
      alt={alt}
      loading="lazy"
      decoding="async"
      width={1200}
      height={800}
      className={className}
      style={position ? { objectPosition: position } : undefined}
    />
  );
}

function CardImage({
  mediaId,
  fallback,
  alt,
  className,
}: {
  mediaId: string | null | undefined;
  fallback: string;
  alt: string;
  className: string;
}) {
  const media = useMediaUrl(mediaId);
  return (
    <SafeImage
      src={media?.url ?? fallback}
      fallback={fallback}
      alt={media?.alt || alt}
      className={className}
      position={media?.position}
    />
  );
}

export function TrustStrip({ section }: SectionProp) {
  const { locale } = useI18n();
  const items = section?.items.filter((item) => item.visible) ?? [];
  const fallback = [
    {
      id: "t1",
      icon: "ShieldCheck",
      label:
        locale === "tr" ? "Güvenli ödeme" : locale === "de" ? "Sichere Zahlung" : "Secure payment",
    },
    {
      id: "t2",
      icon: "QrCode",
      label:
        locale === "tr"
          ? "Hızlı dijital teslimat"
          : locale === "de"
            ? "Schnelle digitale Zustellung"
            : "Fast digital delivery",
    },
    {
      id: "t3",
      icon: "Smartphone",
      label:
        locale === "tr"
          ? "Hesabında erişim"
          : locale === "de"
            ? "Zugriff im Konto"
            : "Account access",
    },
    {
      id: "t4",
      icon: "Headphones",
      label:
        locale === "tr" ? "Seyahat desteği" : locale === "de" ? "Reise-Support" : "Travel support",
    },
  ];
  const rows = items.length
    ? items.map((item) => ({ id: item.id, icon: item.icon, label: itemText(item.title, locale) }))
    : fallback;
  return (
    <section className={`mx-auto ${widthClass(section)} px-4 py-7 sm:px-6`}>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 border-y border-border py-5 md:grid-cols-4">
        {rows.map((row) => (
          <div
            key={row.id}
            data-reveal-card
            className="flex items-center gap-2 text-xs font-semibold sm:text-sm"
          >
            <span className="icon-box-sm rounded-lg bg-primary-soft text-primary">
              <StorefrontIcon name={row.icon} />
            </span>
            <span className="leading-snug">{row.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function VisualPopular({ service, section }: { service: ServiceSlug } & SectionProp) {
  // eSIM destinations come from the live catalogue, never from section items.
  if (service === "esim") return <DestinationDiscovery section={section ?? null} />;
  return <LoungePopular service={service} section={section ?? null} />;
}

function LoungePopular({ service, section }: { service: ServiceSlug } & SectionProp) {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const copy = localized(service === "esim" ? ESIM_CONTENT : LOUNGE_CONTENT, locale);
  const strings = COPY[locale];
  const items = (section?.items ?? []).filter((item) => item.visible);
  const cards = items.length
    ? items.map((item) => ({
        id: item.id,
        icon: item.icon,
        mediaId: item.mediaId,
        coverageIsos: item.entity
          ? item.entity
              .split(",")
              .map((iso) => iso.trim())
              .filter(Boolean)
          : [],
        iso: item.entity.includes(",") ? "" : item.entity,
        title: itemText(item.title, locale),
        meta: itemText(item.description, locale),
        cta: itemText(item.cta, locale, strings.viewPackages),
        showPrice: item.showPrice,
        image:
          DEFAULT_CARD_IMAGES[item.id] ??
          (service === "esim" ? destinationEuropeAsset.url : loungeAsset.url),
      }))
    : [];
  const { data: startingPrices = [] } = useQuery({
    queryKey: ["esim-starting-prices", cards.map((card) => card.id).join("|")],
    queryFn: () =>
      listEsimStartingPrices({
        data: { targets: cards.map((card) => ({ id: card.id, coverageIsos: card.coverageIsos })) },
      }),
    enabled: service === "esim" && cards.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const priceById = new Map(startingPrices.map((price) => [price.targetId, price]));
  const open = (card: (typeof cards)[number]) => {
    if (service !== "esim") return;
    const multi = card.coverageIsos.length > 1;
    void navigate({
      to: "/esim/paketler",
      search: {
        destination: multi ? "" : card.iso || card.coverageIsos[0] || "",
        route: multi ? card.coverageIsos.join(",") : "",
        days: 10,
        travelers: 1,
        estimated: 0,
        required: 0,
        recommended: 0,
        recommendedProductId: "",
        usage: "",
        intensity: "NORMAL",
      },
    });
  };
  if (!cards.length) return null;

  return (
    <section id="popular" className={surfaceClasses(section)}>
      <div className={`mx-auto ${widthClass(section)} px-4 sm:px-6`}>
        <span className="text-xs font-bold uppercase text-primary">
          {tx(section, "eyebrow", locale, "")}
        </span>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              {tx(section, "headline", locale, copy.popularTitle)}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {tx(section, "description", locale, copy.popularDescription)}
            </p>
          </div>
          <span className="hidden text-sm font-semibold text-primary sm:block">
            {strings.flexible}
          </span>
        </div>
        <div className="editorial-card-rail mt-6 grid gap-3 md:grid-cols-3">
          {cards.map((card) => {
            const price = card.showPrice ? priceById.get(card.id) : undefined;
            const multi = card.coverageIsos.length > 1;
            return (
              <article
                key={card.id}
                data-reveal-card
                className="group relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-primary shadow-card"
              >
                <CardImage
                  mediaId={card.mediaId}
                  fallback={card.image}
                  alt={card.title}
                  className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-image-scrim" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-hero-foreground">
                  <div className="flex items-center gap-2">
                    {card.iso && <CountryFlag iso={card.iso} className="text-xl" />}
                    {multi && <Route className="size-5" aria-hidden="true" />}
                    {!card.iso && !multi && <StorefrontIcon name={card.icon} className="size-5" />}
                    <h3 className="font-display text-xl font-bold">{card.title}</h3>
                  </div>
                  {multi && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {card.coverageIsos.map((iso, index) => (
                        <span key={iso} className="contents">
                          <CountryFlag iso={iso} />
                          {index < card.coverageIsos.length - 1 && (
                            <ArrowRight className="size-3" />
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-end justify-between gap-3 text-sm">
                    <div>
                      <span className="block opacity-85">{card.meta}</span>
                      {service === "esim" && price && (
                        <strong className="mt-1 block text-base">
                          {strings.startingAt}{" "}
                          {new Intl.NumberFormat(
                            locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-GB",
                            { style: "currency", currency: price.currency },
                          ).format(price.amount)}
                        </strong>
                      )}
                    </div>
                    {service === "esim" ? (
                      <Button type="button" variant="light" size="sm" onClick={() => open(card)}>
                        {card.cta}
                        <ArrowRight />
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold">
                        {card.cta || strings.discover}
                        <ArrowRight className="size-4" />
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {service === "lounge" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {strings.amenities.map((amenity, index) => (
              <span
                key={amenity}
                className="inline-flex items-center gap-1.5 rounded-full bg-petrol-soft px-3 py-1.5 text-xs font-semibold text-primary"
              >
                {index === 0 ? (
                  <Wifi />
                ) : index === 1 ? (
                  <Utensils />
                ) : index === 2 ? (
                  <Coffee />
                ) : index === 3 ? (
                  <ShowerHead />
                ) : (
                  <CheckCircle2 />
                )}
                {amenity}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function ProductSolutions({ section }: SectionProp) {
  const { locale } = useI18n();
  if (!section) return null;
  const items = section.items.filter((item) => item.visible);
  if (!items.length) return null;
  return (
    <section className={surfaceClasses(section, "bg-accent-soft py-12")}>
      <div className={`mx-auto ${widthClass(section)} px-4 sm:px-6`}>
        <span className="text-xs font-bold uppercase text-primary">
          {tx(section, "eyebrow", locale, "")}
        </span>
        <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
          {tx(section, "headline", locale, "")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {tx(section, "description", locale, "")}
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              data-reveal-card
              className="rounded-card border border-border bg-card p-5 shadow-card"
            >
              <span className="icon-box-feature rounded-xl bg-primary-soft text-primary">
                <StorefrontIcon name={item.icon} />
              </span>
              <h3 className="mt-4 font-bold">{itemText(item.title, locale)}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {itemText(item.description, locale)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks({ service, section }: { service: ServiceSlug } & SectionProp) {
  const { locale } = useI18n();
  const steps = (section?.items ?? []).filter((item) => item.visible);
  if (!steps.length) return null;
  return (
    <section id="how" className={surfaceClasses(section, "bg-petrol-soft py-12")}>
      <div className={`mx-auto ${widthClass(section)} px-4 sm:px-6`}>
        <span className="text-xs font-bold uppercase text-primary">
          {tx(section, "eyebrow", locale, "")}
        </span>
        <h2 className="mt-2 max-w-xl font-display text-2xl font-bold sm:text-3xl">
          {tx(section, "headline", locale, "")}
        </h2>
        <ol className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.id}
              data-reveal-card
              className="relative rounded-card bg-card p-4 shadow-card"
            >
              <span className="absolute right-3 top-3 text-xs font-bold text-muted-foreground">
                0{index + 1}
              </span>
              <span
                className={`icon-box-feature rounded-xl ${index % 2 ? "bg-cta-soft text-cta" : "bg-primary-soft text-primary"}`}
              >
                <StorefrontIcon name={step.icon} />
              </span>
              <h3 className="mt-4 font-bold">{itemText(step.title, locale)}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {itemText(step.description, locale)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function DeliveryConfidence({ service, section }: { service: ServiceSlug } & SectionProp) {
  const { locale } = useI18n();
  const strings = COPY[locale];
  const lounge = service === "lounge";
  const media = useMediaUrl(section?.mediaId);
  return (
    <section className={surfaceClasses(section)}>
      <div
        className={`mx-auto grid ${widthClass(section)} items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr]`}
      >
        <div>
          <span className="text-xs font-bold uppercase text-primary">
            {tx(section, "eyebrow", locale, "")}
          </span>
          <h2 className="mt-2 max-w-xl font-display text-2xl font-bold sm:text-3xl">
            {tx(section, "headline", locale, "")}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {tx(section, "description", locale, "")}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <TrustNote icon={<Smartphone />}>{tx(section, "note1", locale, "")}</TrustNote>
            <TrustNote icon={<Mail />}>{tx(section, "note2", locale, "")}</TrustNote>
          </div>
        </div>
        <div className="rounded-card border border-border bg-secondary/55 p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase text-muted-foreground">
              {strings.sample}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
              <CheckCircle2 className="size-3.5" />
              {lounge ? strings.ready.lounge : strings.ready.esim}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-4 rounded-xl bg-card p-4">
            {media ? (
              <img
                src={media.url}
                alt={media.alt}
                className="size-20 shrink-0 rounded-xl object-cover"
                style={{ objectPosition: media.position }}
              />
            ) : (
              <div className="grid size-20 shrink-0 place-items-center rounded-xl border border-dashed border-primary/40 bg-petrol-soft text-primary">
                {lounge ? <TicketCheck className="size-9" /> : <QrCode className="size-9" />}
              </div>
            )}
            <div className="min-w-0">
              <strong className="block font-display text-lg">
                {lounge ? "FRA · Terminal 1" : "Türkiye · eSIM"}
              </strong>
              <span className="mt-1 block text-sm text-muted-foreground">
                {lounge
                  ? locale === "tr"
                    ? "Tarih · Yolcu · Rezervasyon"
                    : locale === "de"
                      ? "Datum · Reisende · Buchung"
                      : "Date · Travelers · Booking"
                  : locale === "tr"
                    ? "Paket · Kurulum · Hesabım"
                    : locale === "de"
                      ? "Paket · Installation · Konto"
                      : "Plan · Installation · Account"}
              </span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm">
              <QrCode />
              {lounge ? strings.primary.lounge : strings.primary.esim}
            </Button>
            {!lounge && (
              <Button size="sm" variant="outline">
                <Smartphone />
                {strings.guide}
              </Button>
            )}
            <Button size="sm" variant="outline">
              <Mail />
              {strings.email}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustNote({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span className="icon-box-normal rounded-lg bg-primary-soft text-primary">{icon}</span>
      <span className="leading-snug">{children}</span>
    </div>
  );
}

export function VisualComplementary({
  service,
  section,
  onSwitch,
}: { service: ServiceSlug; onSwitch: (service: ServiceSlug) => void } & SectionProp) {
  const { locale } = useI18n();
  const copy = localized(service === "esim" ? ESIM_CONTENT : LOUNGE_CONTENT, locale);
  const next = service === "esim" ? "lounge" : "esim";
  const fallbackImage = service === "esim" ? loungeAsset.url : esimCrossSellAsset.url;
  return (
    <section className={`mx-auto ${widthClass(section)} px-4 py-12 sm:px-6`}>
      <div className="grid overflow-hidden rounded-card bg-primary text-primary-foreground shadow-panel md:grid-cols-2">
        <div className="relative min-h-60">
          <CardImage
            mediaId={section?.mediaId}
            fallback={fallbackImage}
            alt={copy.crossSellTitle}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-image-scrim md:hidden" />
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-9">
          <span className="text-xs font-bold uppercase opacity-70">
            {tx(
              section,
              "eyebrow",
              locale,
              locale === "tr"
                ? "Seyahat önerisi"
                : locale === "de"
                  ? "Reise-Empfehlung"
                  : "Travel recommendation",
            )}
          </span>
          <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
            {tx(section, "headline", locale, copy.crossSellTitle)}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 opacity-80">
            {tx(section, "description", locale, copy.crossSellDescription)}
          </p>
          <Button variant="light" className="mt-6 w-fit" onClick={() => onSwitch(next)}>
            {tx(section, "ctaLabel", locale, next === "lounge" ? "Lounge" : "eSIM")}
            <ArrowRight />
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Simple announcement strip — presentation only, no product logic. */
export function CampaignBanner({ section }: SectionProp) {
  const { locale } = useI18n();
  const navigate = useNavigate();
  if (!section) return null;
  const headline = tx(section, "headline", locale, "");
  if (!headline) return null;
  const cta = tx(section, "ctaLabel", locale, "");
  return (
    <section className={surfaceClasses(section, "bg-primary-soft py-8")}>
      <div
        className={`mx-auto ${widthClass(section)} flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6`}
      >
        <div>
          <span className="text-xs font-bold uppercase text-primary">
            {tx(section, "eyebrow", locale, "")}
          </span>
          <h2 className="font-display text-xl font-bold sm:text-2xl">{headline}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tx(section, "description", locale, "")}
          </p>
        </div>
        {cta && section.primaryHref && (
          <Button variant="cta" onClick={() => navigate({ to: section.primaryHref })}>
            {cta} <ArrowRight />
          </Button>
        )}
      </div>
    </section>
  );
}

/** Image next to text — an editor-composed storytelling block. */
export function ImageTextSection({ section }: SectionProp) {
  const { locale } = useI18n();
  const media = useMediaUrl(section?.mediaId);
  if (!section) return null;
  const headline = tx(section, "headline", locale, "");
  if (!headline) return null;
  const reversed = section.variant === "ters";
  const items = section.items.filter((item) => item.visible);
  return (
    <section className={surfaceClasses(section, "py-12")}>
      <div
        className={`mx-auto ${widthClass(section)} grid items-center gap-6 px-4 sm:px-6 md:grid-cols-2`}
      >
        {media?.url && (
          <SafeImage
            src={media.url}
            fallback={destinationEuropeAsset.url}
            alt={media.alt || headline}
            position={media.position}
            className={`h-60 w-full rounded-card object-cover shadow-card md:h-80 ${reversed ? "md:order-2" : ""}`}
          />
        )}
        <div>
          <span className="text-xs font-bold uppercase text-primary">
            {tx(section, "eyebrow", locale, "")}
          </span>
          <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{headline}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {tx(section, "description", locale, "")}
          </p>
          {items.length > 0 && (
            <ul className="mt-4 space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <span className="icon-box-sm rounded-lg bg-primary-soft text-primary">
                    <StorefrontIcon name={item.icon} />
                  </span>
                  <span>
                    <strong className="font-semibold">{itemText(item.title, locale)}</strong>{" "}
                    {itemText(item.description, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
