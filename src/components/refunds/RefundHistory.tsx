import { useQuery } from "@tanstack/react-query";

import { formatDate, formatMoney } from "@/components/account/copy";
import { useI18n } from "@/i18n";
import { listMyRefundRequests } from "@/lib/refunds.functions";
import { REFUND_COPY } from "./refund-copy";

/** Customer refund history: request, date, package, amount, status and customer-facing reply only. */
export function RefundHistory() {
  const { locale } = useI18n();
  const c = REFUND_COPY[locale];
  const q = useQuery({ queryKey: ["my-refund-requests"], queryFn: () => listMyRefundRequests(), staleTime: 60_000 });
  const rows = q.data ?? [];
  if (q.isLoading || !rows.length) return null;
  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-display text-lg font-bold">{c.history}</h2>
      <ul className="mt-3 grid gap-2">
        {rows.map((r) => (
          <li key={r.id} className="grid gap-1 rounded-xl border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="min-w-0 truncate">{r.productLabel ?? "eSIM"}</strong>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">{c.statuses[r.status]}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {c.requestDate}: {formatDate(r.createdAt, locale)} · {c.amount}: {r.amount != null ? formatMoney(r.amount, r.currency, locale) : r.isTest ? c.demoAmount : "—"}
              {r.isTest ? " · TEST / DEMO" : ""}
            </span>
            {r.customerMessage && <span className="text-xs">{c.response}: {r.customerMessage}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
