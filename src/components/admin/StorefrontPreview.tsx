import { ArrowRight, Check } from "lucide-react";
import type { Locale } from "@/domain/enums";
import { itemText, tx, type StorefrontConfig, type StorefrontSection } from "@/domain/storefront/registry";
import { BACKGROUND_CLASS, SPACING_CLASS } from "@/domain/storefront/styles";
import { StorefrontIcon } from "@/domain/storefront/icons";
import type { MediaAsset } from "@/lib/admin-media.functions";

/**
 * Draft preview of the customer homepage. It renders the same content and
 * surface presets as the public site so the owner can verify before publishing.
 */
export function StorefrontPreview({ config, locale, media, selectedId, onSelect, width }: {
  config: StorefrontConfig;
  locale: Locale;
  media: MediaAsset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  width: number;
}) {
  const url = (id: string | null | undefined) => media.find((asset) => asset.id === id)?.url ?? null;
  return (
    <div className="mx-auto overflow-hidden rounded-xl border border-border bg-background shadow-card transition-[width]" style={{ width }}>
      {config.sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSelect(section.id)}
          className={`block w-full cursor-pointer text-left outline-none ${selectedId === section.id ? "ring-2 ring-inset ring-primary" : ""} ${section.visible ? "" : "hidden"}`}
        >
          <PreviewSection section={section} locale={locale} url={url} />
        </button>
      ))}
    </div>
  );
}

function PreviewSection({ section, locale, url }: { section: StorefrontSection; locale: Locale; url: (id: string | null | undefined) => string | null }) {
  const surface = `${BACKGROUND_CLASS[section.background] ?? "bg-card"} ${SPACING_CLASS[section.spacing] ?? "py-12"}`;
  const items = section.items.filter((item) => item.visible);
  const centered = section.align === "center" ? "text-center items-center" : "";

  switch (section.type) {
    case "HERO": {
      const image = url(section.mediaId);
      const height = section.height === "compact" ? 150 : section.height === "tall" ? 260 : 200;
      return (
        <div className="p-3">
          <div className="relative overflow-hidden rounded-xl bg-primary" style={{ height }}>
            {image && <img src={image} alt="" className="absolute inset-0 size-full object-cover" style={{ objectPosition: `${section.focalX}% ${section.focalY}%` }} />}
            <div className="absolute inset-0 bg-primary/70" style={{ opacity: section.overlay / 100 + 0.2 }} />
            <div className={`relative flex size-full flex-col justify-center gap-1.5 p-4 text-primary-foreground ${centered}`}>
              <span className="text-[10px] font-semibold opacity-80">{tx(section, "eyebrow", locale, "")}</span>
              <strong className="font-display text-lg leading-tight">{tx(section, "headline", locale, "Başlık")}</strong>
              <p className="line-clamp-2 text-[11px] opacity-85">{tx(section, "description", locale, "")}</p>
              <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-md bg-cta px-2.5 py-1.5 text-[11px] font-bold text-cta-foreground">{tx(section, "ctaLabel", locale, "Buton")}<ArrowRight className="size-3" /></span>
              {section.showOffer && (
                <span className="mt-2 w-fit rounded-lg bg-card p-2 text-[10px] text-card-foreground">
                  <strong className="block">{tx(section, "offerValue", locale, "")}</strong>
                  {tx(section, "offerMeta", locale, "")}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }
    case "SERVICE_SELECTOR":
      return (
        <div className="px-3 py-2">
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1 text-[11px] font-bold">
            <span className="rounded-lg bg-primary px-2 py-2 text-center text-primary-foreground">{tx(section, "esimLabel", locale, "eSIM")}</span>
            <span className="rounded-lg px-2 py-2 text-center text-muted-foreground">{tx(section, "loungeLabel", locale, "Lounge")}</span>
          </div>
        </div>
      );
    case "FINDER":
      return (
        <div className={`${surface} px-3`}>
          <div className="rounded-xl border border-border bg-card p-3">
            <strong className="block text-sm">{tx(section, "headline", locale, "")}</strong>
            <p className="mt-1 text-[11px] text-muted-foreground">{tx(section, "description", locale, "")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">{[0, 1, 2, 3].map((index) => <span key={index} className="h-8 rounded-md bg-secondary" />)}</div>
            <span className="mt-3 block h-9 rounded-md bg-cta/90" />
          </div>
        </div>
      );
    case "COMPATIBILITY":
      return (
        <div className={`${surface} px-3`}>
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary-soft/50 p-3">
            <strong className="block text-sm">{tx(section, "headline", locale, "Cihaz uyumluluğu")}</strong>
            <p className="mt-1 text-[11px] text-muted-foreground">{tx(section, "description", locale, "Cihazının eSIM desteğini kontrol et.")}</p>
            <span className="mt-2 inline-block rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-bold text-primary-foreground">{tx(section, "ctaLabel", locale, "Cihazımı kontrol et")}</span>
          </div>
        </div>
      );
    case "TRUST":
      return (
        <div className={`${surface} px-3`}>
          <div className="grid grid-cols-2 gap-2 border-y border-border py-3">
            {items.map((item) => (
              <span key={item.id} className="flex items-center gap-1.5 text-[11px] font-semibold">
                <span className="grid size-6 place-items-center rounded-md bg-primary-soft text-primary"><StorefrontIcon name={item.icon} className="size-3.5" /></span>
                {itemText(item.title, locale)}
              </span>
            ))}
          </div>
        </div>
      );
    case "POPULAR_DESTINATIONS":
    case "PRODUCT_SOLUTIONS":
      return (
        <div className={`${surface} px-3`}>
          <span className="text-[10px] font-bold uppercase text-primary">{tx(section, "eyebrow", locale, "")}</span>
          <strong className="mt-1 block font-display text-base">{tx(section, "headline", locale, "")}</strong>
          <p className="mt-1 text-[11px] text-muted-foreground">{tx(section, "description", locale, "")}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {items.map((item) => {
              const image = url(item.mediaId);
              return section.type === "POPULAR_DESTINATIONS" ? (
                <span key={item.id} className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-primary">
                  {image && <img src={image} alt="" className="absolute inset-0 size-full object-cover" />}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[11px] font-bold text-white">
                    {itemText(item.title, locale)}
                    <span className="block text-[10px] font-normal opacity-85">{itemText(item.description, locale)}{item.showPrice ? " · fiyat katalogdan" : ""}</span>
                  </span>
                </span>
              ) : (
                <span key={item.id} className="block rounded-lg border border-border bg-card p-2.5">
                  <span className="grid size-7 place-items-center rounded-md bg-primary-soft text-primary"><StorefrontIcon name={item.icon} className="size-3.5" /></span>
                  <strong className="mt-2 block text-[11px]">{itemText(item.title, locale)}</strong>
                  <span className="block text-[10px] text-muted-foreground">{itemText(item.description, locale)}</span>
                </span>
              );
            })}
          </div>
        </div>
      );
    case "CROSS_SELL": {
      const image = url(section.mediaId);
      return (
        <div className="px-3 py-4">
          <div className="grid overflow-hidden rounded-xl bg-primary text-primary-foreground sm:grid-cols-2">
            <span className="relative block min-h-24 bg-primary/60">{image && <img src={image} alt="" className="absolute inset-0 size-full object-cover" />}</span>
            <span className="block p-3">
              <span className="text-[10px] font-bold uppercase opacity-75">{tx(section, "eyebrow", locale, "")}</span>
              <strong className="mt-1 block font-display text-base">{tx(section, "headline", locale, "")}</strong>
              <span className="mt-1 block text-[11px] opacity-85">{tx(section, "description", locale, "")}</span>
              <span className="mt-2 inline-block rounded-md bg-card px-2.5 py-1.5 text-[11px] font-bold text-card-foreground">{tx(section, "ctaLabel", locale, "")}</span>
            </span>
          </div>
        </div>
      );
    }
    case "HOW_IT_WORKS":
      return (
        <div className={`${surface} px-3`}>
          <span className="text-[10px] font-bold uppercase text-primary">{tx(section, "eyebrow", locale, "")}</span>
          <strong className="mt-1 block font-display text-base">{tx(section, "headline", locale, "")}</strong>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {items.map((item, index) => (
              <span key={item.id} className="block rounded-lg bg-card p-2.5">
                <span className="grid size-7 place-items-center rounded-md bg-primary-soft text-primary"><StorefrontIcon name={item.icon} className="size-3.5" /></span>
                <strong className="mt-2 block text-[11px]">0{index + 1} · {itemText(item.title, locale)}</strong>
                <span className="block text-[10px] text-muted-foreground">{itemText(item.description, locale)}</span>
              </span>
            ))}
          </div>
        </div>
      );
    case "DELIVERY":
      return (
        <div className={`${surface} px-3`}>
          <span className="text-[10px] font-bold uppercase text-primary">{tx(section, "eyebrow", locale, "")}</span>
          <strong className="mt-1 block font-display text-base">{tx(section, "headline", locale, "")}</strong>
          <p className="mt-1 text-[11px] text-muted-foreground">{tx(section, "description", locale, "")}</p>
          <div className="mt-2 grid gap-1.5 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" />{tx(section, "note1", locale, "")}</span>
            <span className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" />{tx(section, "note2", locale, "")}</span>
          </div>
        </div>
      );
    case "FAQ":
      return (
        <div className={`${surface} px-3`}>
          <strong className="block font-display text-base">{tx(section, "headline", locale, "")}</strong>
          <div className="mt-2 grid gap-1.5">
            {items.map((item) => (
              <span key={item.id} className="block rounded-md border border-border bg-card px-2.5 py-2 text-[11px] font-semibold">{itemText(item.title, locale)}</span>
            ))}
          </div>
        </div>
      );
    case "FINAL_CTA":
      return (
        <div className="px-3 py-4">
          <div className={`rounded-xl p-4 text-center ${BACKGROUND_CLASS[section.background] ?? "bg-accent-soft"}`}>
            <strong className="block font-display text-base">{tx(section, "headline", locale, "")}</strong>
            <p className="mt-1 text-[11px] text-muted-foreground">{tx(section, "description", locale, "")}</p>
            <span className="mt-2 inline-block rounded-md bg-cta px-3 py-1.5 text-[11px] font-bold text-cta-foreground">{tx(section, "ctaLabel", locale, "")}</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}
