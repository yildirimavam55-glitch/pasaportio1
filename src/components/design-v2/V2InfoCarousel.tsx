import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Globe2, Headphones, LockKeyhole, QrCode, RotateCcw, Wallet, Zap } from "lucide-react";
import { Reveal } from "@/components/travel/Reveal";
import { WhatsAppLogo } from "@/components/travel/WhatsAppLogo";
import { mediaUrl } from "@/components/design-v2/V2Sections";
import type { V2Media } from "@/lib/v2-storefront.functions";
import { v2ItemText, v2Text, type V2Item, type V2Section } from "@/domain/storefront/v2";
import { useI18n } from "@/i18n";
import type { Locale } from "@/domain/enums";
import { waLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const CARD_ICONS: Record<string, typeof Globe2> = {
  products: Globe2,
  refund: RotateCcw,
  roaming: Wallet,
  delivery: Zap,
  setup: QrCode,
  payment: LockKeyhole,
  support: Headphones,
};

const GAP = { compact: "gap-3", normal: "gap-4", wide: "gap-6" } as const;
const PREVIEW = {
  compact: "w-[86%] sm:w-[46%] lg:w-[31%]",
  normal: "w-[82%] sm:w-[44%] lg:w-[30%]",
  wide: "w-[76%] sm:w-[42%] lg:w-[29%]",
} as const;

/** Premium informational eSIM carousel between Popular Countries and Regional Packages. */
export function V2InfoCarousel({ section, media }: { section: V2Section; media: V2Media }) {
  const { locale } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const cards = section.items.filter((item) => item.visible);
  const title = v2Text(section, "title", locale);
  const subtitle = v2Text(section, "subtitle", locale);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const first = track.querySelector<HTMLElement>("[data-info-card]");
    if (!first) return;
    const step = first.offsetWidth + 16;
    setActive(Math.min(cards.length - 1, Math.max(0, Math.round(track.scrollLeft / step))));
  }, [cards.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(onScroll);
    };
    track.addEventListener("scroll", handler, { passive: true });
    return () => {
      track.removeEventListener("scroll", handler);
      cancelAnimationFrame(raf);
    };
  }, [onScroll]);

  const go = useCallback(
    (dir: 1 | -1) => {
      const track = trackRef.current;
      const first = track?.querySelector<HTMLElement>("[data-info-card]");
      if (!track || !first) return;
      const step = first.offsetWidth + 16;
      track.scrollBy({ left: dir * step, behavior: "smooth" });
    },
    [],
  );

  if (!cards.length) return null;

  return (
    <section aria-label={title} className="mt-10 sm:mt-14">
      <Reveal className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
        </div>
        {section.showArrows && cards.length > 1 && (
          <div className="hidden shrink-0 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Önceki kart"
              className="grid size-10 place-items-center rounded-full bg-card text-foreground ring-1 ring-border transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Sonraki kart"
              className="grid size-10 place-items-center rounded-full bg-card text-foreground ring-1 ring-border transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ArrowRight className="size-4 rtl:rotate-180" />
            </button>
          </div>
        )}
      </Reveal>
      <Reveal delay={80}>
        <div
          ref={trackRef}
          role="list"
          tabIndex={0}
          aria-label={title}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") go(1);
            if (event.key === "ArrowLeft") go(-1);
          }}
          className={cn(
            "-mx-4 mt-6 flex snap-x snap-mandatory overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden",
            GAP[section.cardGap],
          )}
        >
          {cards.map((card, index) => (
            <InfoCard key={card.id} card={card} index={index} section={section} media={media} locale={locale} />
          ))}
        </div>
      </Reveal>
      {section.showDots && cards.length > 1 && (
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
          {cards.map((card, index) => (
            <span key={card.id} className={cn("h-1.5 rounded-full transition-all", index === active ? "w-5 bg-primary" : "w-1.5 bg-border")} />
          ))}
        </div>
      )}
    </section>
  );
}

function InfoCard({ card, index, section, media, locale }: { card: V2Item; index: number; section: V2Section; media: V2Media; locale: Locale }) {
  const image = mediaUrl(card.mediaId, media);
  const Icon = CARD_ICONS[card.cardType] ?? Globe2;
  const labels = card.labels.map((label) => v2ItemText(label, locale)).filter(Boolean);
  const cta = v2ItemText(card.cta, locale);
  const alt = v2ItemText(card.imageAlt, locale) || v2ItemText(card.title, locale);
  const supportLink = card.cardType === "support" && !card.href ? waLink() : null;

  return (
    <article
      data-info-card
      role="listitem"
      className={cn("flex shrink-0 snap-start flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-border", PREVIEW[section.mobilePreview])}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {image && (
          <img
            src={image}
            alt={alt}
            loading={index > 1 ? "lazy" : "eager"}
            className="size-full object-cover"
            style={{ objectPosition: `${card.focalX}% ${card.focalY}%` }}
          />
        )}
        <span className="absolute left-3 top-3 grid size-9 place-items-center rounded-full bg-card/90 font-display text-xs font-bold text-foreground shadow-sm ring-1 ring-border backdrop-blur">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="absolute bottom-3 left-3 grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Icon className="size-4" aria-hidden />
        </span>
        {card.cardType === "refund" && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm ring-1 ring-border backdrop-blur">
            <Check className="size-3.5 text-primary" aria-hidden />
            {v2ItemText(card.cta, locale) || labels[0] || ""}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-display text-base font-bold text-foreground sm:text-lg">{v2ItemText(card.title, locale)}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v2ItemText(card.text, locale)}</p>
        {labels.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <li key={label} className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                {label}
              </li>
            ))}
          </ul>
        )}
        {(card.href || supportLink) && (
          <div className="mt-auto pt-3">
            {supportLink ? (
              <a
                href={supportLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <WhatsAppLogo className="size-4" aria-hidden />
                {cta || "WhatsApp"}
                <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden />
              </a>
            ) : (
              <Link
                to={card.href as string}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {cta || v2ItemText(card.title, locale)}
                <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden />
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
