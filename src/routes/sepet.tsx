import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, LockKeyhole, Minus, Plus, ShoppingCart, Trash2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/travel/PublicShell";
import { useCart } from "@/domain/cart/store";
import { useI18n } from "@/i18n";
import type { Locale } from "@/domain/enums";

const COPY = {
  tr: {
    title: "Sipariş özeti", lead: "Seçtiğin gerçek katalog ürünlerini kontrol et.",
    empty: "Sepetin şu anda boş.", browse: "eSIM paketlerine bak", lounge: "Lounge seçeneklerine bak",
    remove: "Kaldır", decrease: "Adedi azalt", increase: "Adedi artır", total: "Toplam", quantity: "Adet", checkout: "Ödeme entegrasyonu bekleniyor",
    testBadge: "TEST", testNote: "Bu ürün test kataloğundandır. Gerçek sağlayıcı ürünü değildir.",
    paymentNote: "Henüz gerçek ödeme alınmıyor. Ödeme yöntemi bağlandığında burada güvenli checkout açılacak.", secure: "Güvenli ödeme", instant: "Anında dijital teslimat", noFees: "Gizli ücret yok", unit: "Birim fiyat",
  },
  de: {
    title: "Bestellübersicht", lead: "Prüfe deine Auswahl aus dem echten Katalog.",
    empty: "Dein Warenkorb ist leer.", browse: "eSIM-Pakete ansehen", lounge: "Lounges ansehen",
    remove: "Entfernen", decrease: "Anzahl verringern", increase: "Anzahl erhöhen", total: "Gesamt", quantity: "Anzahl", checkout: "Zahlungsintegration ausstehend",
    testBadge: "TEST", testNote: "Testkatalog-Produkt. Kein echtes Anbieterprodukt.",
    paymentNote: "Es wird noch keine echte Zahlung eingezogen. Der sichere Checkout erscheint nach Anbindung des Zahlungsanbieters.", secure: "Sichere Zahlung", instant: "Sofortige digitale Lieferung", noFees: "Keine versteckten Gebühren", unit: "Stückpreis",
  },
  en: {
    title: "Order summary", lead: "Review your selected live catalogue products.",
    empty: "Your cart is empty.", browse: "Browse eSIM packages", lounge: "Browse lounges",
    remove: "Remove", decrease: "Decrease quantity", increase: "Increase quantity", total: "Total", quantity: "Quantity", checkout: "Payment integration pending",
    testBadge: "TEST", testNote: "Test catalogue product. Not real provider inventory.",
    paymentNote: "No real payment is taken yet. Secure checkout will open here after a payment provider is connected.", secure: "Secure payment", instant: "Instant digital delivery", noFees: "No hidden fees", unit: "Unit price",
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
  const { lines, removeLine, updateQuantity } = useCart();

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
                    <span className="mt-1 block text-xs text-muted-foreground">{copy.unit}: {money(line.price ?? 0)}</span>
                    <div className="mt-3 flex items-center gap-1" aria-label={copy.quantity}>
                      <Button type="button" variant="outline" size="icon" className="size-10" disabled={line.quantity <= 1} onClick={() => updateQuantity(line.productId, line.quantity - 1)} aria-label={`${copy.decrease}: ${line.name}`}><Minus className="size-3.5" /></Button>
                      <span className="min-w-7 text-center text-sm font-bold">{line.quantity}</span>
                      <Button type="button" variant="outline" size="icon" className="size-10" disabled={line.quantity >= 9} onClick={() => updateQuantity(line.productId, line.quantity + 1)} aria-label={`${copy.increase}: ${line.name}`}><Plus className="size-3.5" /></Button>
                    </div>
                    {line.isTest && <span className="mt-1 block text-xs text-muted-foreground">{copy.testNote}</span>}
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeLine(line.productId)} aria-label={`${copy.remove}: ${line.name}`}>
                    <Trash2 className="size-5" />
                  </Button>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between rounded-card border border-border bg-card p-4 shadow-card">
              <span className="text-sm font-semibold uppercase text-muted-foreground">{copy.total}</span>
              <strong className="text-xl">{money(total)}</strong>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 border-y border-border py-3 text-center text-[11px] font-semibold text-muted-foreground sm:text-xs">
              <span className="flex flex-col items-center gap-1"><LockKeyhole className="size-4 text-primary" />{copy.secure}</span>
              <span className="flex flex-col items-center gap-1"><Zap className="size-4 text-primary" />{copy.instant}</span>
              <span className="flex flex-col items-center gap-1"><Check className="size-4 text-primary" />{copy.noFees}</span>
            </div>
            <Button variant="cta" size="lg" className="mt-4 w-full scroll-mb-24" disabled aria-describedby="payment-note">
              <ShoppingCart /> {copy.checkout}
            </Button>
            <p id="payment-note" className="mt-3 rounded-xl border border-warning/35 bg-sand-soft/60 px-3 py-2 text-center text-xs font-semibold text-muted-foreground">{copy.paymentNote}</p>
          </>
        )}
      </section>
    </PublicShell>
  );
}
