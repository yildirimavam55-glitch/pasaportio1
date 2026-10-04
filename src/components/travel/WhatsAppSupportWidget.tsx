import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { WhatsAppLogo } from "./WhatsAppLogo";
import { waLink } from "@/lib/whatsapp";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";
import { settingsText } from "@/domain/platform/settings";
import { noopAnalyticsSink } from "@/domain/analytics";
import { useServiceAvailability } from "./ServiceAvailability";
import type { Locale } from "@/domain/enums";

const COPY = localize({
  tr: {
    label: "WhatsApp destek",
    close: "Destek kartını kapat",
    title: "travely Destek",
    subtitle: "WhatsApp Destek",
    hello: "Merhaba 👋",
    message: "eSIM paketleri, kurulum, cihaz uyumluluğu veya siparişin hakkında yardımcı olabiliriz. WhatsApp üzerinden destek ekibimize ulaşabilirsin.",
    cta: "WhatsApp'ta destek al",
    prefill: "Merhaba, travely hakkında destek almak istiyorum.",
  },
  de: {
    label: "WhatsApp-Support",
    close: "Support-Karte schließen",
    title: "travely Support",
    subtitle: "WhatsApp-Support",
    hello: "Hallo 👋",
    message: "Wir helfen dir gern bei eSIM-Paketen, Installation, Gerätekompatibilität oder deiner Bestellung. Du erreichst unser Support-Team über WhatsApp.",
    cta: "Support über WhatsApp",
    prefill: "Hallo, ich brauche Unterstützung zu travely.",
  },
  en: {
    label: "WhatsApp support",
    close: "Close support card",
    title: "travely Support",
    subtitle: "WhatsApp support",
    hello: "Hi 👋",
    message: "We can help with eSIM packages, installation, device compatibility or your order. You can reach our support team on WhatsApp.",
    cta: "Chat on WhatsApp",
    prefill: "Hi, I'd like support with travely.",
  },
});

function pickCopy(locale: Locale) {
  return (COPY as Record<string, typeof COPY.en>)[locale] ?? COPY.en;
}

/**
 * The single floating WhatsApp support control. First tap opens an in-page
 * preview card; WhatsApp only opens from the card's explicit CTA.
 * `placement` lets the V2 dock (in-flow) and V1 shell (fixed corner) reuse it.
 */
export function WhatsAppSupportWidget({ surface, placement = "inline" }: { surface: string; placement?: "inline" | "fixed" }) {
  const { locale } = useI18n();
  const { settings } = useServiceAvailability();
  const cfg = settings.whatsappWidget;
  const base = pickCopy(locale);
  const text = (value: typeof cfg.title, fallback: string) => settingsText(value, locale as Locale, "") || fallback;
  const copy = {
    title: text(cfg.title, base.title),
    message: text(cfg.message, base.message),
    cta: text(cfg.cta, base.cta),
    prefill: text(cfg.prefill, base.prefill),
  };
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardId = useId();
  const titleId = useId();

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus({ preventScroll: true });
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) close(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!cfg.enabled) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void noopAnalyticsSink.track({ name: "whatsapp_widget_opened", surface });
  };

  const rootClass =
    placement === "fixed"
      ? "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 sm:bottom-6 sm:right-6"
      : "pointer-events-auto relative shrink-0";

  return (
    <div ref={rootRef} className={rootClass}>
      {open && (
        <div
          ref={cardRef}
          id={cardId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="absolute bottom-[calc(100%+0.625rem)] right-0 w-[min(22rem,calc(100vw-2rem))] max-h-[calc(100dvh-12rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain rounded-3xl border border-border bg-card text-card-foreground shadow-2xl outline-none"
        >
          <div className="flex items-center gap-3 rounded-t-3xl bg-primary px-4 py-3 text-primary-foreground">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-foreground/15">
              <WhatsAppLogo className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p id={titleId} className="truncate text-sm font-bold">{copy.title}</p>
              <p className="truncate text-xs text-primary-foreground/75">{base.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => close()}
              aria-label={base.close}
              className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-primary-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="grid gap-3 p-4">
            <div className="rounded-2xl rounded-tl-sm bg-accent/60 p-3 text-sm leading-relaxed text-foreground">
              <p className="font-semibold">{base.hello}</p>
              <p className="mt-1 text-muted-foreground">{copy.message}</p>
            </div>
            <a
              href={waLink(copy.prefill)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                void noopAnalyticsSink.track({ name: "whatsapp_cta_clicked", surface });
                setOpen(false);
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <WhatsAppLogo className="size-4" />
              <span className="truncate">{copy.cta}</span>
              <ArrowRight className="size-4 shrink-0" />
            </a>
          </div>
        </div>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={base.label}
        aria-expanded={open}
        aria-controls={open ? cardId : undefined}
        className={`grid size-[3.25rem] place-items-center rounded-full shadow-lg hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${surface === "v2-dock" ? "lg:max-[1399px]:size-[2.625rem]" : ""}`}
        style={{ backgroundColor: "#25D366", color: "#fff" }}
      >
        {open ? <X className="size-6" /> : <WhatsAppLogo className="size-6" />}
      </button>
    </div>
  );
}
