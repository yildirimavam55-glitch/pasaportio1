import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { parseCompetitorCsv, type CompetitorPrice } from "@/domain/pricing/competitive";
import { COMPETITOR_SETTINGS_ID, loadStore, sanitizeStore } from "@/lib/competitor-pricing.server";

/** Admin-only competitor research; read and written only after the server admin check. */
export const getCompetitorStore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadStore(await adminDb(context as AdminCtx)));

/** Read-only preview of a CSV import; nothing is saved. */
export const previewCompetitorImport = createServerFn({ method: "POST" })
  .inputValidator((input: { csv: string }) => ({ csv: String(input.csv ?? "").slice(0, 500_000) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await adminDb(context as AdminCtx);
    const rows = parseCompetitorCsv(data.csv).slice(0, 2000);
    return { valid: rows.flatMap((r) => (r.ok ? [r.entry] : [])), invalid: rows.flatMap((r) => (r.ok ? [] : [{ line: r.line, error: r.error, raw: r.raw.slice(0, 200) }])) };
  });

type NewEntry = Omit<CompetitorPrice, "id">;

/** Adds entries (replacing the same competitor+country+package) and/or removes ids. */
export const saveCompetitorPrices = createServerFn({ method: "POST" })
  .inputValidator((input: { add?: NewEntry[]; removeIds?: string[]; competitors?: string[] }) => ({
    add: (input.add ?? []).slice(0, 2000), removeIds: (input.removeIds ?? []).map(String).slice(0, 2000),
    competitors: input.competitors?.map((n) => String(n).slice(0, 60)).slice(0, 4),
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const before = await loadStore(db);
    const remove = new Set(data.removeIds);
    const sig = (e: NewEntry) => `${e.competitor.toLowerCase()}|${e.iso}|${e.key}`;
    const incoming = new Set(data.add.map(sig));
    const kept = before.entries.filter((e) => !remove.has(e.id) && !incoming.has(sig(e)));
    const added = data.add.map((e) => ({ ...e, id: crypto.randomUUID() }));
    const next = sanitizeStore({ ...before, competitors: data.competitors ?? before.competitors, entries: [...kept, ...added] });
    const accepted = next.entries.length - kept.length;
    const { error } = await db.from("platform_settings").upsert({ id: COMPETITOR_SETTINGS_ID, data: next });
    if (error) throw new Error(error.message);
    await audit(db, "competitor_prices.save", "platform_settings", COMPETITOR_SETTINGS_ID,
      { entries: before.entries.length }, { entries: next.entries.length, added: accepted, removed: before.entries.length - kept.length });
    return { added: accepted, rejected: data.add.length - accepted, total: next.entries.length };
  });
