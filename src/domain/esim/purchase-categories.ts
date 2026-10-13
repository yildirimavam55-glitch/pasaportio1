import { isHistoryEsim } from "./customer-esim";

export type EsimCategory = "active" | "pending" | "used" | "refunding" | "refunded";
export const ESIM_CATEGORIES: EsimCategory[] = ["active", "pending", "used", "refunding", "refunded"];

const REFUNDED = new Set(["REFUNDED"]);
const REFUNDING = new Set(["REFUND_PENDING", "REFUND_REQUESTED", "REFUND_IN_PROGRESS", "REFUND_REVIEW"]);
const ACTIVE = new Set(["ACTIVE", "IN_USE", "ENABLED"]);

/** Exactly one category per eSIM. Refund state wins, then history, then stored active status. */
export function esimCategory(
  esim: { status: string | null | undefined; totalMb: number | null; remainingMb: number | null; expiresAt: string | null },
  opts: { refundOpen?: boolean; now?: Date } = {},
): EsimCategory {
  const raw = String(esim.status ?? "").trim().toUpperCase();
  if (REFUNDED.has(raw)) return "refunded";
  if (opts.refundOpen || REFUNDING.has(raw)) return "refunding";
  if (isHistoryEsim({ ...esim, now: opts.now })) return "used";
  if (ACTIVE.has(raw)) return "active";
  return "pending";
}
