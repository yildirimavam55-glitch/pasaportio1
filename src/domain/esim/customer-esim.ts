export type CustomerEsimStatus =
  "PREPARING" | "READY" | "ACTIVE" | "EXPIRED" | "EXHAUSTED" | "CANCELLED" | "SUPPORT";

const READY = new Set(["READY", "FULFILLED", "INSTALLED"]);
const ACTIVE = new Set(["ACTIVE", "IN_USE", "ENABLED"]);
const EXPIRED = new Set(["EXPIRED"]);
const EXHAUSTED = new Set(["EXHAUSTED", "USED_UP", "DEPLETED"]);
const CANCELLED = new Set(["CANCELLED", "CANCELED", "REFUNDED", "REVOKED"]);
const SUPPORT = new Set(["FAILED", "ERROR", "SUPPORT", "DELIVERY_EMAIL_FAILED"]);

export function normalizeCustomerEsimStatus(value: string | null | undefined): CustomerEsimStatus {
  const status = String(value ?? "PENDING")
    .trim()
    .toUpperCase();
  if (READY.has(status)) return "READY";
  if (ACTIVE.has(status)) return "ACTIVE";
  if (EXPIRED.has(status)) return "EXPIRED";
  if (EXHAUSTED.has(status)) return "EXHAUSTED";
  if (CANCELLED.has(status)) return "CANCELLED";
  if (SUPPORT.has(status)) return "SUPPORT";
  return "PREPARING";
}

export function boundedUsagePercent(totalMb: number | null, remainingMb: number | null) {
  if (totalMb == null || remainingMb == null || totalMb <= 0) return null;
  return Math.min(100, Math.max(0, ((totalMb - remainingMb) / totalMb) * 100));
}

export function remainingDays(expiresAt: string | null, now = new Date()) {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt);
  if (Number.isNaN(expires.getTime())) return null;
  return Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / 86_400_000));
}

export function isUnlimitedEsim(totalMb: number | null, installInfo: unknown) {
  if (totalMb != null) return false;
  if (!installInfo || typeof installInfo !== "object" || Array.isArray(installInfo)) return false;
  const info = installInfo as Record<string, unknown>;
  return info["unlimited_data"] === true || info["unlimited"] === true || info["data_type"] === "UNLIMITED";
}

export function fairUseText(installInfo: unknown) {
  if (!installInfo || typeof installInfo !== "object" || Array.isArray(installInfo)) return null;
  const info = installInfo as Record<string, unknown>;
  for (const key of ["fair_use_note", "fair_use_policy", "high_speed_allowance"]) {
    const value = info[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function isHistoryEsim(args: {
  status: string | null | undefined;
  remainingMb: number | null;
  totalMb: number | null;
  expiresAt: string | null;
  now?: Date;
}) {
  const normalized = normalizeCustomerEsimStatus(args.status);
  if (["EXPIRED", "EXHAUSTED", "CANCELLED"].includes(normalized)) return true;
  if (args.totalMb != null && args.remainingMb != null && args.remainingMb <= 0) return true;
  if (args.expiresAt) {
    const expires = new Date(args.expiresAt);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() <= (args.now ?? new Date()).getTime())
      return true;
  }
  return false;
}

export function formatMegabytes(value: number, locale: string) {
  const numberLocale = locale === "de" ? "de-DE" : locale === "tr" ? "tr-TR" : "en-US";
  if (value >= 1024)
    return `${new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 1 }).format(value / 1024)} GB`;
  return `${new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 0 }).format(value)} MB`;
}
