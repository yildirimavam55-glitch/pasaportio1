import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { QrCode, ShoppingCart, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/travel/PublicShell";
import { useCart } from "@/domain/cart/store";
import { assertCheckoutAllowed } from "@/lib/platform-settings.functions";
import { settingsText } from "@/domain/platform/settings";
import { useI18n } from "@/i18n";
import type { Locale } from "@/domain/enums";

const COPY = {
  tr: {
    title: "Sepetin", lead: "Seçtiğin ürünler. Bu aşamada ödeme alınmaz.",
    empty: "Sepetin şu anda boş.", browse: "eSIM paketlerine bak", lounge: "Lounge seçeneklerine bak",
    remove: "Kaldır", total: "Toplam", quantity: "adet", checkout: "Test ödemesine geç",
    testBadge: "TEST", testNote: "Bu ürün test kataloğundandır. Gerçek sağlayıcı ürünü değildir.",
    demoTitle: "Rezervasyon hazır — DEMO", demoText: "Bu yalnızca arayüz testidir. Aşağıdaki kod geçerli bir sağlayıcı kuponu veya eSIM QR kodu değildir.",
    demoQr: "Örnek QR görünümü",
  },
  de: {
    title: "Dein Warenkorb", lead: "Deine Auswahl. In dieser Phase erfolgt keine Zahlung.",
    empty: "Dein Warenkorb ist leer.", browse: "eSIM-Pakete ansehen", lounge: "Lounges ansehen",
    remove: "Entfernen", total: "Gesamt", quantity: "Stk.", checkout: "Zum Test-Checkout",
    testBadge: "TEST", testNote: "Testkatalog-Produkt. Kein echtes Anbieterprodukt.",
    demoTitle: "Buchung bereit — DEMO", demoText: "Nur ein Oberflächentest. Der Code unten ist kein gültiger Anbieter-Voucher und kein eSIM-QR-Code.",
    demoQr: "QR-Beispielansicht",
  },
  en: {
    title: "Your cart", lead: "Your selection. No payment is taken at this stage.",
    empty: "Your cart is empty.", browse: "Browse eSIM packages", lounge: "Browse lounges",
    remove: "Remove", total: "Total", quantity: "pcs", checkout: "Go to test checkout",
    testBadge: "TEST", testNote: "Test catalogue product. Not real provider inventory.",
    demoTitle: "Booking ready — DEMO", demoText: "Interface test only. The code below is not a valid provider voucher or eSIM QR code.",
    demoQr: "Sample QR preview",
  },
} satisfies Record<Locale, Record<string, string>>;

export const Route = createFileRoute("/sepet")({
  head: () => ({
    meta: [
      { title: "Sepetin | travely" },
      { name: "description", content: "Seçtiğin eSIM paketlerini ve Lounge seçeneklerini gözden geçir." },
      { property: "og:title", content: "Sepetin | travely" },
      { property: "og:description", content: "eSIM ve Lounge seçimlerini tek ekranda gözden geçir." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const { lines, removeLine } = useCart();
  const [demo, setDemo] = useState(false);
  const [checking, setChecking] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  /** Purchase permission is verified on the server, never only in the browser. */
  const startCheckout = async () => {
    setChecking(true);
    setBlocked(null);
    try {
      const services = [...new Set(lines.map((line) => (line.serviceType === "LOUNGE" ? "lounge" : "esim") as "esim" | "lounge"))];
      for (const service of services) {
        const result = await assertCheckoutAllowed({ data: { service } });
        if (!result.allowed) {
          setBlocked(settingsText(result.message, locale, "Yeni siparişler kısa süreliğine durduruldu."));
          return;
        }
      }
      setDemo(true);
    } catch {
      setBlocked("Şu anda devam edilemiyor. Lütfen kısa süre sonra tekrar deneyin.");
    } finally {
      setChecking(false);
    }
  };

  const currency = lines[0]?.currency ?? "EUR";
  const money = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  const total = lines.reduce((sum, line) => sum + (line.price ?? 0) * line.quantity, 0);

  return (
    <PublicShell activeService="esim">
      <section className="mx-auto max-w-site px-4 py-6 sm:px-6">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.lead}</p>

        {lines.length === 0 ? (
          <div className="mt-5 rounded-card border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm font-semibold">{copy.empty}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link to="/esim"><Button variant="secondary">{copy.browse}</Button></Link>
              <Link to="/lounge"><Button variant="outline">{copy.lounge}</Button></Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="mt-5 grid gap-3">
              {lines.map((line) => (
                <li key={line.id} className="flex items-start justify-between gap-3 rounded-card border border-border bg-card p-4 shadow-card">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="font-display text-base">{line.name}</strong>
                      {line.isTest && (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-primary">{copy.testBadge}</span>
                      )}
                    </div>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {[line.meta, line.airport, line.terminal, line.date, line.situation].filter(Boolean).join(" · ")}
                    </span>
                    <span className="mt-1 block text-sm font-semibold">
                      {line.quantity} {copy.quantity} · {money((line.price ?? 0) * line.quantity)}
                    </span>
                    {line.isTest && <span className="mt-1 block text-xs text-muted-foreground">{copy.testNote}</span>}
                  </div>
                  <button type="button" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeLine(line.productId)} aria-label={copy.remove}>
                    <Trash2 className="size-5" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between rounded-card border border-border bg-card p-4 shadow-card">
              <span className="text-sm font-semibold uppercase text-muted-foreground">{copy.total}</span>
              <strong className="text-xl">{money(total)}</strong>
            </div>

            <Button variant="cta" size="lg" className="mt-4 w-full scroll-mb-24" disabled={checking} onClick={() => void startCheckout()}>
              <ShoppingCart /> {copy.checkout}
            </Button>
            {blocked && <p className="mt-3 rounded-xl border border-warning/40 bg-sand-soft/60 px-3 py-2 text-sm font-semibold">{blocked}</p>}

            {demo && (
              <div className="mt-4 rounded-card border border-dashed border-primary bg-primary-soft p-5 text-center">
                <p className="flex items-center justify-center gap-2 font-display text-lg font-bold">
                  <TriangleAlert className="size-5 text-primary" aria-hidden="true" /> {copy.demoTitle}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{copy.demoText}</p>
                <div className="mx-auto mt-4 grid w-40 place-items-center gap-2 rounded-xl border-2 border-dashed border-primary bg-card p-5">
                  <QrCode className="size-12 text-primary" aria-hidden="true" />
                  <span className="text-xs font-bold uppercase text-primary">{copy.demoQr}</span>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </PublicShell>
  );
}
