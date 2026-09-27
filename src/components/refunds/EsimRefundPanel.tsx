import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { formatDate, formatMoney } from "@/components/account/copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { REFUND_REASONS, type RefundReason } from "@/domain/refunds/refund-policy";
import { useI18n } from "@/i18n";
import { createRefundRequest, getEsimRefundState } from "@/lib/refunds.functions";
import { RefundPolicyLink } from "./RefundTrust";
import { REFUND_COPY } from "./refund-copy";

const OPEN = new Set(["REQUESTED", "UNDER_REVIEW", "APPROVED"]);

/** Account eSIM detail: 14-day refund state, request sheet and request history. All rules are server-side. */
export function EsimRefundPanel({ esimId }: { esimId: string }) {
  const { locale } = useI18n();
  const c = REFUND_COPY[locale];
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<RefundReason | "">("");
  const [note, setNote] = useState("");
  const [ack, setAck] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const state = useQuery({ queryKey: ["esim-refund-state", esimId], queryFn: () => getEsimRefundState({ data: { esimId } }), staleTime: 30_000 });
  const submit = useMutation({
    mutationFn: () => createRefundRequest({ data: { esimId, reasonCode: reason as RefundReason, ...(note.trim() ? { note: note.trim() } : {}), acknowledged: true } }),
    onSuccess: async () => {
      setJustSent(true);
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["esim-refund-state", esimId] });
      await qc.invalidateQueries({ queryKey: ["my-refund-requests"] });
    },
  });

  const s = state.data;
  if (state.isLoading) return <div className="h-24 animate-pulse rounded-2xl bg-secondary" />;
  if (!s) return null;

  const openRequest = s.history.find((r) => OPEN.has(r.status));
  const amountText = s.isDemo && s.amount == null ? c.demoAmount : s.amount != null ? formatMoney(s.amount, s.currency, locale) : "—";
  const errorMessage = submit.error ? (String((submit.error as Error).message).includes("OPEN_REQUEST") ? c.duplicate : c.error) : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card" aria-labelledby="refund-title">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" />
        <h2 id="refund-title" className="font-display text-lg font-bold">{c.title}</h2>
        {s.isDemo && <Badge variant="outline" className="ml-auto border-warning/40 text-[10px]">TEST / DEMO</Badge>}
      </div>

      {openRequest ? (
        <div className="mt-3 grid gap-1 text-sm">
          {justSent && <p className="flex items-center gap-1.5 font-semibold text-success"><CheckCircle2 className="size-4" />{c.received}</p>}
          <p><span className="text-muted-foreground">{c.status}: </span><strong>{c.statuses[openRequest.status]}</strong></p>
          <p className="text-xs text-muted-foreground">{c.requestDate}: {formatDate(openRequest.createdAt, locale)}</p>
          {openRequest.customerMessage && <p className="mt-1 rounded-lg bg-secondary px-3 py-2 text-xs">{openRequest.customerMessage}</p>}
        </div>
      ) : !s.windowOpen ? (
        <p className="mt-2 text-sm text-muted-foreground">{c.expired}</p>
      ) : s.canRequest ? (
        <>
          <p className="mt-2 text-sm font-semibold">{c.daysLeft(s.daysLeft)}</p>
          {s.usageVerification !== "VERIFIED_UNUSED" && <p className="mt-1 text-xs text-muted-foreground">{s.isDemo ? c.demo : c.reviewNote}</p>}
          <Button variant="outline" className="mt-3 min-h-11 w-full" onClick={() => { submit.reset(); setOpen(true); }}>{c.create}</Button>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {s.eligibility === "NOT_ELIGIBLE_USED" ? c.used : s.eligibility === "NOT_ELIGIBLE_UNPAID" ? c.unpaid : c.noOrder}
        </p>
      )}

      <RefundPolicyLink className="mt-3 text-xs" />

      {s.history.filter((r) => r !== openRequest).length > 0 && (
        <ul className="mt-4 grid gap-2 border-t border-border pt-3 text-xs">
          {s.history.filter((r) => r !== openRequest).map((r) => (
            <li key={r.id} className="grid gap-0.5">
              <span><strong>{c.statuses[r.status]}</strong> · {formatDate(r.createdAt, locale)}</span>
              {r.customerMessage && <span className="text-muted-foreground">{r.customerMessage}</span>}
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="z-[70] max-h-[92dvh] overflow-y-auto rounded-t-3xl pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-lg">
          <SheetHeader className="text-left">
            <SheetTitle>{c.sheetTitle}</SheetTitle>
            <SheetDescription className="font-semibold text-foreground">{s.label}</SheetDescription>
          </SheetHeader>
          {s.isDemo && <p className="mt-2 rounded-lg bg-warning/10 px-3 py-2 text-xs font-semibold">{c.demo}</p>}
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div><dt className="text-muted-foreground">{c.purchase}</dt><dd className="font-semibold">{s.purchaseAt ? formatDate(s.purchaseAt, locale) : "—"}</dd></div>
            <div><dt className="text-muted-foreground">{c.paid}</dt><dd className="font-semibold">{amountText}</dd></div>
            <div><dt className="text-muted-foreground">{c.window}</dt><dd className="font-semibold">{c.daysLeftShort(s.daysLeft)}</dd></div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{c.explain}</p>
          <form
            className="mt-3 grid gap-3"
            onSubmit={(event) => { event.preventDefault(); if (reason && ack) submit.mutate(); }}
          >
            <label className="grid gap-1 text-sm font-semibold">
              {c.reason}
              <select required value={reason} onChange={(event) => setReason(event.target.value as RefundReason)} className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm font-normal">
                <option value="" disabled>{c.reasonPick}</option>
                {REFUND_REASONS.map((code) => <option key={code} value={code}>{c.reasons[code]}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {c.note}
              <Textarea rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className="font-normal" />
            </label>
            <label className="flex items-start gap-2 text-xs leading-5">
              <Checkbox checked={ack} onCheckedChange={(value) => setAck(value === true)} className="mt-0.5" />
              {c.ack}
            </label>
            {errorMessage && <p className="text-xs font-semibold text-destructive" role="alert">{errorMessage}</p>}
            <Button type="submit" variant="cta" className="min-h-11" disabled={!reason || !ack || submit.isPending}>{submit.isPending ? c.sending : c.submit}</Button>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}
