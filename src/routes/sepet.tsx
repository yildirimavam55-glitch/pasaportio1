import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { V2Shell, V2_NOINDEX, money, pick } from "@/components/design-v2/V2Shell";
import { V2PageTitle, V2State } from "@/components/design-v2/V2States";
import { useCart } from "@/domain/cart/store";
import { CART_COPY, lineFacts, lineTitle } from "@/components/design-v2/cart-copy";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/sepet")({
  head: () => ({ meta: [{ title: "Sepet | travely" }, ...V2_NOINDEX] }),
  component: V2Cart,
});

function V2Cart() {
  const { locale } = useI18n();
  const c = pick(locale, CART_COPY);
  // The one existing cart store — no second cart, no price recalculation.
  const { lines, removeLine, updateQuantity } = useCart();
  const currency = lines[0]?.currency ?? "EUR";
  const total = lines.reduce((sum, line) => sum + (line.price ?? 0) * line.quantity, 0);

  return (
    <V2Shell level="transaction" nav="cart">
      <div className="pt-2">
        <V2PageTitle title={c.title} lead={lines.length ? c.lead : undefined} />
        {lines.length === 0 ? (
          <V2State tone="empty" title={c.empty} text={c.emptyText} action={
            <Link to="/esim" search={{ country: "" }} className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">{c.browse}</Link>
          } />
        ) : (
          <>
            <ul className="grid gap-2">
              {lines.map((line) => (
                <li key={line.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-display text-base font-bold text-foreground">
                        <span className="truncate">{lineTitle(line, locale)}</span>
                        {line.isTest && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-primary">{c.test}</span>}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{lineFacts(line, c)}</p>
                    </div>
                    <button type="button" onClick={() => removeLine(line.productId)} aria-label={`${c.remove}: ${lineTitle(line, locale)}`} className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-destructive">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1" aria-label={c.qty}>
                      <button type="button" disabled={line.quantity <= 1} onClick={() => updateQuantity(line.productId, line.quantity - 1)} aria-label={c.dec} className="grid size-10 place-items-center rounded-full border border-border disabled:opacity-40"><Minus className="size-3.5" /></button>
                      <span className="min-w-7 text-center text-sm font-bold">{line.quantity}</span>
                      <button type="button" disabled={line.quantity >= 9} onClick={() => updateQuantity(line.productId, line.quantity + 1)} aria-label={c.inc} className="grid size-10 place-items-center rounded-full border border-border disabled:opacity-40"><Plus className="size-3.5" /></button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{c.unit} {money(line.price ?? 0, line.currency)}</p>
                      <p className="font-display text-base font-bold text-foreground">{money((line.price ?? 0) * line.quantity, line.currency)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
              <span className="text-sm font-semibold text-muted-foreground">{c.total}</span>
              <strong className="font-display text-xl text-foreground">{money(total, currency)}</strong>
            </div>
            <Link to="/odeme" className="mt-3 flex min-h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{c.review}</Link>
          </>
        )}
      </div>
    </V2Shell>
  );
}
