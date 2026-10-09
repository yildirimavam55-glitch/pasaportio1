import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, TicketPercent, X } from "lucide-react";
import type { CartLine } from "@/domain/cart/store";
import type { CouponResult } from "@/domain/promotions";
import { validateCoupon } from "@/lib/promotions.functions";
import { useI18n } from "@/i18n";
import { money } from "./V2Shell";
import { PROMO_COPY } from "./promo-copy";

const CODE_KEY = "travely.coupon.v1";
const CODE_EVENT = "cart:coupon-changed";

/**
 * Only the typed code is stored locally. Every render of the summary comes from the
 * server result (authoritative prices, server time, usage limits) and is re-fetched
 * whenever the cart changes or the tab regains focus, so an edited campaign is picked up.
 */
export function useCartCoupon(lines: CartLine[]) {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    const read = () => { try { setCode(window.localStorage.getItem(CODE_KEY)); } catch { /* ignore */ } };
    read(); window.addEventListener(CODE_EVENT, read); window.addEventListener("storage", read);
    return () => { window.removeEventListener(CODE_EVENT, read); window.removeEventListener("storage", read); };
  }, []);
  const payload = useMemo(() => lines.map((l) => ({ productId: l.productId, quantity: l.quantity })), [lines]);
  const query = useQuery({
    queryKey: ["coupon", code, payload],
    queryFn: () => { if (!code) throw new Error("Missing coupon"); return validateCoupon({ data: { code, lines: payload } }); },
    enabled: Boolean(code) && payload.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const apply = (next: string) => { const v = next.trim().toUpperCase(); try { window.localStorage.setItem(CODE_KEY, v); } catch { /* ignore */ } setCode(v); window.dispatchEvent(new Event(CODE_EVENT)); if (v === code && payload.length) void query.refetch(); };
  const remove = () => { try { window.localStorage.removeItem(CODE_KEY); } catch { /* ignore */ } setCode(null); window.dispatchEvent(new Event(CODE_EVENT)); };
  return { code, result: query.data as CouponResult | undefined, pending: query.isFetching, error: query.error, apply, remove };
}

export function CartCoupon({ coupon }: { coupon: ReturnType<typeof useCartCoupon> }) {
  const { locale } = useI18n();
  const c = (PROMO_COPY as any)[locale] ?? PROMO_COPY.tr;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const { code, result, pending, error } = coupon;
  const applied = result?.ok ? result : null;
  const failure = code && !pending ? (error ? c.errors.NETWORK : result && !result.ok ? c.errors[result.reason].replace("{min}", money(result.minOrder ?? 0, "EUR")) : null) : null;

  if (applied) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-3 py-2">
        <CheckCircle2 className="size-5 shrink-0 text-success" />
        <p className="min-w-0 flex-1 text-sm font-semibold text-foreground"><span translate="no">{applied.code}</span> {c.applied}</p>
        <button type="button" onClick={() => { coupon.remove(); setValue(""); }} aria-label={c.remove} className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary"><X className="size-4" /></button>
      </div>
    );
  }
  return (
    <div className="mb-3 rounded-xl border border-border">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open || Boolean(failure)} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-semibold text-foreground">
        <TicketPercent className="size-4 text-primary" /><span className="flex-1">{c.toggle}</span>
        <ChevronDown className={`size-4 transition-transform ${open || failure ? "rotate-180" : ""}`} />
      </button>
      {(open || failure) && (
        <form className="grid gap-2 px-3 pb-3" onSubmit={(e) => { e.preventDefault(); if (value.trim()) coupon.apply(value); }}>
          <div className="flex gap-2">
            <input
              value={value}
              onChange={(e) => setValue(e.target.value.toUpperCase())}
              placeholder={c.placeholder}
              aria-label={c.placeholder}
              autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} maxLength={32}
              className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-base font-semibold uppercase tracking-wide"
            />
            <button type="submit" disabled={!value.trim() || pending} className="h-11 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{pending ? c.applying : c.apply}</button>
          </div>
          {failure && <p role="alert" className="text-xs font-semibold text-destructive">{failure}</p>}
        </form>
      )}
    </div>
  );
}

export function CouponSummary({ result, currency }: { result: Extract<CouponResult, { ok: true }>; currency: string }) {
  const { locale } = useI18n();
  const c = (PROMO_COPY as any)[locale] ?? PROMO_COPY.tr;
  return (
    <div className="grid gap-1.5 px-1 pb-2 text-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">{c.subtotal}</span><span className="font-semibold">{money(result.subtotal, currency)}</span></div>
      <div className="flex justify-between text-success"><span className="font-semibold">{c.discount} — <span translate="no">{result.code}</span></span><span className="font-bold">−{money(result.discount, currency)}</span></div>
      {result.eligibleSubtotal < result.subtotal && <p className="text-[11px] text-muted-foreground">{c.partial}</p>}
    </div>
  );
}
