import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { V2Shell, V2_NOINDEX, money, pick } from "@/components/design-v2/V2Shell";
import { V2Card, V2PageTitle, V2State } from "@/components/design-v2/V2States";
import { useCart } from "@/domain/cart/store";
import { useI18n } from "@/i18n";
import { CART_COPY, lineFacts, lineTitle } from "@/components/design-v2/cart-copy";
import { localize } from "@/i18n/overlay";
import { CouponSummary, useCartCoupon } from "@/components/design-v2/CartCoupon";

const COPY = localize({
  tr: { title: "Ödeme", back: "Sepete dön", summary: "Sipariş özeti", account: "Hesap", signedAs: "Giriş yapıldı", signIn: "Siparişi hesabına bağlamak için giriş yap", signInCta: "Giriş yap", payment: "Ödeme", notLive: "Ödeme henüz aktif değil", notLiveText: "Şu anda gerçek ödeme alınmıyor. Ödeme yöntemi bağlandığında siparişini buradan tamamlayabilirsin.", cta: "Ödeme entegrasyonu bekleniyor", empty: "Sepetin boş", browse: "eSIM paketlerine bak" },
  de: { title: "Kasse", back: "Zurück zum Warenkorb", summary: "Bestellübersicht", account: "Konto", signedAs: "Angemeldet", signIn: "Melde dich an, um die Bestellung deinem Konto zuzuordnen", signInCta: "Anmelden", payment: "Zahlung", notLive: "Zahlung noch nicht aktiv", notLiveText: "Derzeit wird keine echte Zahlung eingezogen. Sobald ein Zahlungsanbieter angebunden ist, schließt du hier ab.", cta: "Zahlungsintegration ausstehend", empty: "Dein Warenkorb ist leer", browse: "eSIM-Pakete ansehen" },
  en: { title: "Checkout", back: "Back to cart", summary: "Order summary", account: "Account", signedAs: "Signed in", signIn: "Sign in to link this order to your account", signInCta: "Sign in", payment: "Payment", notLive: "Payment is not active yet", notLiveText: "No real payment is taken right now. Once a payment provider is connected you can complete your order here.", cta: "Payment integration pending", empty: "Your cart is empty", browse: "Browse eSIM packages" },
});

export const Route = createFileRoute("/odeme")({
  ssr: false,
  head: () => ({ meta: [{ title: "Ödeme | Pasaport.io" }, { name: "description", content: "Pasaport.io eSIM siparişinizi ve doğrulanmış toplamınızı inceleyin." }, { property: "og:title", content: "Ödeme | Pasaport.io" }, { property: "og:description", content: "eSIM sipariş özeti ve kupon doğrulaması." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, ...V2_NOINDEX] }),
  component: V2Checkout,
});

function V2Checkout() {
  const { locale } = useI18n();
  const c = pick(locale, COPY);
  const cc = pick(locale, CART_COPY);
  const { lines } = useCart();
  const coupon = useCartCoupon(lines);
  const applied = coupon.result?.ok && !coupon.pending ? coupon.result : null;
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  const currency = lines[0]?.currency ?? "EUR";
  const total = lines.reduce((sum, line) => sum + (line.price ?? 0) * line.quantity, 0);

  return (
    <V2Shell level="transaction" nav="cart">
      <div className="pt-2">
        <Link to="/sepet" className="mb-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary"><ChevronLeft className="size-4" />{c.back}</Link>
        <V2PageTitle title={c.title} />
        {lines.length === 0 ? (
          <V2State tone="empty" title={c.empty} action={<Link to="/esim" search={{ country: "" }} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">{c.browse}</Link>} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.85fr)] lg:items-start lg:gap-8">
            <div className="grid gap-3">
            <V2Card>
              <p className="text-xs font-bold uppercase text-muted-foreground">{c.account}</p>
              {email === undefined ? null : email ? (
                <p className="mt-2 flex items-center gap-2 text-sm"><UserRound className="size-4 text-primary" /><span className="text-muted-foreground">{c.signedAs}:</span> <span className="truncate font-semibold">{email}</span></p>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{c.signIn}</p>
                  <Link to="/auth" search={{ redirect: "/odeme" }} className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-border px-4 text-sm font-semibold">{c.signInCta}</Link>
                </div>
              )}
            </V2Card>

            <div>
              <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">{c.payment}</p>
              <V2State tone="warning" title={c.notLive} text={c.notLiveText} />
            </div>
            <button type="button" disabled className="min-h-12 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground opacity-50">{c.cta}</button>
            </div>
            <V2Card className="lg:sticky lg:top-24">
              <p className="text-xs font-bold uppercase text-muted-foreground">{c.summary}</p>
              <ul className="mt-2 divide-y divide-border">
                {lines.map((line) => (
                  <li key={line.id} className="flex items-start justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{line.quantity} × {lineTitle(line, locale)}</p>
                      <p className="text-xs text-muted-foreground">{lineFacts(line, cc)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold">{money((line.price ?? 0) * line.quantity, line.currency)}</span>
                  </li>
                ))}
              </ul>
              {applied && <CouponSummary result={applied} currency={currency} />}
              <div className="mt-1 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-semibold text-muted-foreground">{cc.total}</span>
                <strong className="font-display text-xl">{money(applied ? applied.total : total, currency)}</strong>
              </div>
            </V2Card>
          </div>
        )}
      </div>
    </V2Shell>
  );
}
