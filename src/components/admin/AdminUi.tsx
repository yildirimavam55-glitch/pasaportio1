import { useEffect, type ReactNode } from "react";
import { AlertCircle, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const adminCard = "admin-card p-3.5 sm:p-4";

export function AdminLoading({ label = "Veriler yükleniyor…" }: { label?: string }) {
  return <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{label}</p>;
}

export function AdminError({ error }: { error: unknown }) {
  return <p className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm font-semibold text-destructive"><AlertCircle className="size-4" />{error instanceof Error ? error.message : "Veriler alınamadı."}</p>;
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return <div className="grid min-h-28 place-items-center rounded-md border border-dashed border-border bg-secondary/25 p-5 text-center"><div><p className="text-sm font-semibold">{title}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div></div>;
}

export function StatusBadge({ value }: { value: string }) {
  const upper = value.toUpperCase();
  const tone = /PAID|FULFILLED|COMPLETED|ACTIVE|PUBLISHED|READY|DELIVERED|SUCCESS/.test(upper)
    ? "bg-success/10 text-success"
    : /FAILED|ERROR|REJECTED|CANCELLED|UNAVAILABLE/.test(upper)
      ? "bg-destructive/10 text-destructive"
      : /PENDING|DRAFT|PREPARING|REVIEW|PAUSED/.test(upper)
        ? "bg-warning/15 text-foreground"
        : "bg-info/10 text-info";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>{value}</span>;
}

export function AdminPanel({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`${adminCard} min-w-0 ${className}`}><header className="flex items-center justify-between gap-3"><h2 className="admin-panel-title">{title}</h2>{action}</header><div className="mt-3 min-w-0">{children}</div></section>;
}

export function AdminTable({ head, children }: { head: string[]; children: ReactNode }) {
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{head.map((item) => <th key={item} scope="col">{item}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export function Metric({ label, value, detail, tone = "default" }: { label: string; value: string | number; detail?: string | undefined; tone?: "default" | "esim" | "lounge" | "profit" }) {
  const border = tone === "esim" ? "border-l-4 border-l-success" : tone === "lounge" ? "border-l-4 border-l-warning" : tone === "profit" ? "border-l-4 border-l-primary" : "";
  return <div className={`admin-card ${border} p-3.5`}><span className="text-[11px] font-semibold text-muted-foreground">{label}</span><strong className="mt-1 block font-display text-xl">{value}</strong>{detail && <span className="mt-1 block text-[10px] text-muted-foreground">{detail}</span>}</div>;
}
/** Side drawer used for order / customer / product detail. Locks background scroll. */
export function AdminDrawer({ open, title, subtitle, onClose, children }: { open: boolean; title: string; subtitle?: string | undefined; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex justify-end">
    <button type="button" aria-label="Kapat" className="absolute inset-0 bg-primary/45 backdrop-blur-sm" onClick={onClose} />
    <aside role="dialog" aria-modal="true" aria-label={title} className="relative flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-panel">
      <header className="flex items-start gap-3 border-b border-border p-4">
        <div className="min-w-0 flex-1"><h2 className="truncate font-display text-lg font-bold">{title}</h2>{subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}</div>
        <Button variant="ghost" size="icon" className="size-11 shrink-0" onClick={onClose} aria-label="Kapat"><X /></Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  </div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string | undefined; children: ReactNode }) {
  return <label className="block text-xs font-semibold"><span className="block">{label}</span>{children}{hint && <span className="mt-1 block text-[10px] font-normal text-muted-foreground">{hint}</span>}</label>;
}

export function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex items-start justify-between gap-3 border-b border-border py-2 text-xs last:border-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-semibold">{value ?? "—"}</span></div>;
}

export function money(value: number | null | undefined, currency = "EUR") {
  return `${Number(value ?? 0).toFixed(2)} ${currency}`;
}
