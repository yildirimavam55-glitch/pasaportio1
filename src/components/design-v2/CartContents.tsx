import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { money, pick } from "@/components/design-v2/V2Shell";
import { V2PageTitle, V2State } from "@/components/design-v2/V2States";
import { useCart } from "@/domain/cart/store";
import { CART_COPY, lineFacts, lineTitle } from "@/components/design-v2/cart-copy";
import { useI18n } from "@/i18n";
import { CartCoupon, CouponSummary, useCartCoupon } from "@/components/design-v2/CartCoupon";
import { Button } from "@/components/ui/button";
import { useCommercePanels } from "./commerce-panels";
import { PANEL_COPY } from "@/components/account/panel-copy";

export function CartContents({ inPanel = false }: { inPanel?: boolean }) {
  const { locale, uiLocale } = useI18n();
  const c = pick(locale, CART_COPY);
  // The one existing cart store — no second cart, no price recalculation.
  const { lines, removeLine, updateQuantity } = useCart();
  const currency = lines[0]?.currency ?? "EUR";
  const total = lines.reduce((sum, line) => sum + (line.price ?? 0) * line.quantity, 0);
  const coupon = useCartCoupon(lines);
  const applied = coupon.result?.ok && !coupon.pending ? coupon.result : null;
  const { panel } = useCommercePanels();
  if (!inPanel && panel === "cart") return null;

  return (
      <div className="pt-2">
        {!inPanel && <V2PageTitle title={c.title} lead={lines.length ? c.lead : undefined} />}
        {lines.length === 0 ? (
          <V2State tone="empty" title={c.empty} text={c.emptyText} action={
            <Link to="/esim" search={{ country: "" }} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">{c.browse}</Link>
          } />
        ) : (
          <div className={inPanel ? "grid gap-3" : "lg:grid lg:grid-cols-[minmax(0,1.8fr)_minmax(18rem,0.9fr)] lg:items-start lg:gap-8"}>
            <ul className="grid gap-2 lg:gap-3">
              {lines.map((line) => (
                <li key={line.id} className="rounded-2xl border border-border bg-card p-3 lg:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-display text-base font-bold text-foreground">
                        <span className="truncate">{lineTitle(line, locale)}</span>
                        {line.isTest && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-primary">{c.test}</span>}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{lineFacts(line, c)}</p>
                    </div>
                    <Button variant="ghost" size="icon" type="button" onClick={() => removeLine(line.productId)} aria-label={`${c.remove}: ${lineTitle(line, locale)}`} className="size-10 shrink-0 text-muted-foreground hover:bg-secondary hover:text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1" aria-label={c.qty}>
                      <Button variant="outline" size="icon" type="button" disabled={line.quantity <= 1} onClick={() => updateQuantity(line.productId, line.quantity - 1)} aria-label={c.dec} className="size-10"><Minus className="size-3.5" /></Button>
                      <span className="min-w-7 text-center text-sm font-bold">{line.quantity}</span>
                      <Button variant="outline" size="icon" type="button" disabled={line.quantity >= 9} onClick={() => updateQuantity(line.productId, line.quantity + 1)} aria-label={c.inc} className="size-10"><Plus className="size-3.5" /></Button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{c.unit} {money(line.price ?? 0, line.currency)}</p>
                      <p className="font-display text-base font-bold text-foreground">{money((line.price ?? 0) * line.quantity, line.currency)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <aside className={inPanel ? "border-t border-border pt-4" : "mt-3 rounded-2xl border border-border bg-card p-4 shadow-card lg:sticky lg:top-24 lg:mt-0 lg:p-6"}>
              <div role="status" className="mb-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
                <p className="text-sm font-bold text-foreground">{PANEL_COPY[locale].purchaseOff}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{PANEL_COPY[locale].purchaseOffText}</p>
              </div>
              <CartCoupon coupon={coupon} />
              {applied && <CouponSummary result={applied} currency={currency} />}
              <div className="flex items-center justify-between bg-secondary px-4 py-3 rounded-xl">
                <span className="text-sm font-semibold text-muted-foreground">{c.total}</span>
                <strong className="font-display text-xl text-foreground">{money(applied ? applied.total : total, currency)}</strong>
              </div>
              <Link to="/odeme" className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{c.review}</Link>
              <Link to="/$locale" params={{ locale: uiLocale }} className="mt-2 flex min-h-11 w-full items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground hover:bg-secondary">{c.continueShopping}</Link>
            </aside>
          </div>
        )}
      </div>
  );
}
