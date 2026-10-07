/**
 * Repricing queue classification. Pure and read-only: it never changes prices,
 * publication or checkout. Products keep selling at their current price.
 */
import { suggestPrice } from "./final-engine";

/** Snapshot sources that record the supplier cost behind an Admin-approved price. */
export const APPROVED_SOURCES = ["FINAL_PRICING_", "ADMIN_REPRICE"];
export const MATERIAL_ABS = 0.05; // €
export const MATERIAL_PCT = 1; // %
export const WEAK_MARKUP_PCT = 20;

export type Priority = "CRITICAL" | "HIGH" | "NORMAL" | "CURRENT" | "UNKNOWN_BASELINE";

/** Cost used when the current price was approved, or null when it cannot be established. */
export function approvedBaseline(snapshot: any): number | null {
  const src = String(snapshot?.source ?? "");
  if (!APPROVED_SOURCES.some((s) => src.startsWith(s))) return null;
  const c = Number(snapshot?.supplierCost);
  return Number.isFinite(c) && c > 0 ? c : null;
}

export type BaselineKind = "APPROVED" | "SYSTEM_DOCUMENTED" | "NEW_MONITORING";
export const BASELINE_LABEL: Record<BaselineKind, string> = {
  APPROVED: "Admin onaylı fiyat maliyeti",
  SYSTEM_DOCUMENTED: "Belgeli fiyat-anı maliyeti — sistem, 2026-10-05, Admin onayı yok",
  NEW_MONITORING: "YENİ İZLEME BAŞLANGICI — 2026-10-07 (tarihsel maliyet değil)",
};

/**
 * Cost from which supplier-cost changes are monitored. An Admin-approved cost always wins;
 * a `monitoringBaseline` only says where monitoring starts and never means the price was approved.
 */
export function monitoringBaseline(snapshot: any): { cost: number; kind: BaselineKind } | null {
  const approved = approvedBaseline(snapshot);
  if (approved != null) return { cost: approved, kind: "APPROVED" };
  const mb = snapshot?.monitoringBaseline;
  const c = Number(mb?.cost);
  if ((mb?.kind === "SYSTEM_DOCUMENTED" || mb?.kind === "NEW_MONITORING") && Number.isFinite(c) && c > 0) return { cost: c, kind: mb.kind };
  return null;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export function classifyRepricing(input: { cost: number | null; price: number | null; baseline: number | null; airaloExact: number | null }) {
  const { cost, price, baseline, airaloExact } = input;
  const profit = cost != null && price != null ? r2(price - cost) : null;
  const markup = cost != null && cost > 0 && price != null ? r2(((price - cost) / cost) * 100) : null;
  const change = cost != null && baseline != null ? r2(cost - baseline) : null;
  const changePct = change != null && baseline ? r2((change / baseline) * 100) : null;
  const material = change != null && changePct != null && Math.abs(change) >= MATERIAL_ABS && Math.abs(changePct) >= MATERIAL_PCT;

  let priority: Priority;
  // Loss risk is a fact of current data and is always surfaced, baseline or not.
  if (cost != null && price != null && cost >= price) priority = "CRITICAL";
  else if (baseline == null) priority = "UNKNOWN_BASELINE";
  else if (!material) priority = "CURRENT";
  else if (change! > 0 && markup != null && markup < WEAK_MARKUP_PCT) priority = "HIGH";
  else priority = "NORMAL";

  const s = suggestPrice(cost, airaloExact);
  const suggestedProfit = s.price != null && cost != null ? r2(s.price - cost) : null;
  const suggestedMarkup = s.price != null && cost ? r2(((s.price - cost) / cost) * 100) : null;
  return { priority, profit, markup, change, changePct, suggestion: s, suggestedProfit, suggestedMarkup };
}

export const PRIORITY_ORDER: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2, UNKNOWN_BASELINE: 3, CURRENT: 4 };
