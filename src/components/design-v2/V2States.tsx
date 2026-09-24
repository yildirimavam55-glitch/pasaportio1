import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleSlash, Inbox, Loader2, XCircle } from "lucide-react";

export type V2Tone = "loading" | "empty" | "success" | "warning" | "error" | "unavailable";

const TONE: Record<V2Tone, { icon: typeof Inbox; ring: string; iconCls: string }> = {
  loading: { icon: Loader2, ring: "border-border", iconCls: "bg-secondary text-primary animate-spin" },
  empty: { icon: Inbox, ring: "border-dashed border-border", iconCls: "bg-secondary text-muted-foreground" },
  success: { icon: CheckCircle2, ring: "border-primary/30", iconCls: "bg-primary-soft text-primary" },
  warning: { icon: AlertTriangle, ring: "border-warning/40", iconCls: "bg-sand-soft text-warning" },
  error: { icon: XCircle, ring: "border-destructive/30", iconCls: "bg-destructive/10 text-destructive" },
  unavailable: { icon: CircleSlash, ring: "border-border", iconCls: "bg-secondary text-muted-foreground" },
};

/** One state card for every V2 screen: loading / empty / success / warning / error / unavailable. */
export function V2State({ tone, title, text, action }: { tone: V2Tone; title: string; text?: ReactNode; action?: ReactNode }) {
  const t = TONE[tone];
  const Icon = t.icon;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-2xl border bg-card p-5 text-center ${t.ring}`}>
      <span className={`mx-auto grid size-11 place-items-center rounded-full ${tone === "loading" ? "bg-secondary text-primary" : t.iconCls}`}>
        <Icon className={`size-5 ${tone === "loading" ? "animate-spin" : ""}`} />
      </span>
      <p className="mt-3 font-display text-base font-bold text-foreground">{title}</p>
      {text && <div className="mt-1 text-sm text-muted-foreground">{text}</div>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Compact page heading for transaction/account levels (no hero photography). */
export function V2PageTitle({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <header className="mb-4">
      <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
      {lead && <p className="mt-1 text-sm text-muted-foreground">{lead}</p>}
    </header>
  );
}

export function V2Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>{children}</div>;
}
