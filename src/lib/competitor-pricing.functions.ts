import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminDb, audit, type AdminCtx } from "@/lib/admin-guard";
import { parseCompetitorCsv, type CompetitorPrice } from "@/domain/pricing/competitive";
import { COMPETITOR_SETTINGS_ID, loadStore, sanitizeStore } from "@/lib/competitor-pricing.server";
import { planResearchImport, type ResearchFile } from "@/domain/pricing/airalo";
import airaloResearch from "@/data/airalo-research-2026-10-05.json";
import airaloResearch2 from "@/data/airalo-research-2026-10-05-video2.json";
import airaloResearch3 from "@/data/airalo-research-2026-10-05-video3.json";
import airaloResearch4 from "@/data/airalo-research-2026-10-06-video4.json";
import airaloResearch5 from "@/data/airalo-research-2026-10-06-video5.json";
import airaloResearch6 from "@/data/airalo-research-2026-10-06-video6.json";
import airaloResearch7 from "@/data/airalo-research-2026-10-06-video7.json";
import airaloResearchShots from "@/data/airalo-research-2026-10-06-screenshots.json";

const RESEARCH_FILES: Record<string, ResearchFile & { file: string }> = {
  "airalo-2026-10-05": airaloResearch as ResearchFile & { file: string },
  "airalo-2026-10-05-video2": airaloResearch2 as ResearchFile & { file: string },
  "airalo-2026-10-05-video3": airaloResearch3 as ResearchFile & { file: string },
  "airalo-2026-10-06-video4": airaloResearch4 as ResearchFile & { file: string },
  "airalo-2026-10-06-video5": airaloResearch5 as ResearchFile & { file: string },
  "airalo-2026-10-06-video6": airaloResearch6 as ResearchFile & { file: string },
  "airalo-2026-10-06-video7": airaloResearch7 as ResearchFile & { file: string },
  "airalo-2026-10-06-screenshots": airaloResearchShots as ResearchFile & { file: string },
};

async function catalogueIsos(db: any, isos: string[]) {
  const found = new Set<string>();
  await Promise.all([...new Set(isos)].map(async (iso) => {
    const { count } = await db.from("esim_product_details").select("product_id", { count: "exact", head: true }).eq("country_iso", iso);
    if ((count ?? 0) > 0) found.add(iso);
  }));
  return found;
}

async function planFor(db: any, fileId: string) {
  const file = RESEARCH_FILES[fileId];
  if (!file) throw new Error("Bilinmeyen araştırma dosyası");
  const store = await loadStore(db);
  const isos = await catalogueIsos(db, file.rows.flatMap((r) => (r.iso ? [r.iso] : [])));
  return { file, store, plan: planResearchImport(file, store.entries, isos, new Date().toISOString()) };
}

/** Read-only preview of the bundled Airalo app research; nothing is saved. */
export const previewResearchImport = createServerFn({ method: "POST" })
  .inputValidator((input: { fileId: string }) => ({ fileId: String(input.fileId) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { file, plan } = await planFor(await adminDb(context as AdminCtx), data.fileId);
    return { file: file.file, competitor: file.competitor, sourceType: file.sourceType, source: file.sourceDescription, checkedAt: file.checkedAt,
      summary: plan.summary, invalid: plan.invalid, countryMatchRequired: plan.countryMatchRequired };
  });

/** Explicit Admin confirmation: upserts competitor observations by competitor+country+package; never touches selling prices. */
export const commitResearchImport = createServerFn({ method: "POST" })
  .inputValidator((input: { fileId: string }) => ({ fileId: String(input.fileId) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const db = await adminDb(context as AdminCtx);
    const { file, store, plan } = await planFor(db, data.fileId);
    const sig = (e: { competitor: string; iso: string; key: string }) => `${e.competitor.toLowerCase()}|${e.iso}|${e.key}`;
    const incoming = new Set(plan.entries.map(sig));
    const prior = new Map(store.entries.map((e) => [sig(e), e.id]));
    const kept = store.entries.filter((e) => !incoming.has(sig(e)));
    const added = plan.entries.map((e) => ({ ...e, id: prior.get(sig(e)) ?? crypto.randomUUID() }));
    const history = [...store.history, { at: new Date().toISOString(), competitor: file.competitor, file: file.file, checkedAt: file.checkedAt, sourceType: file.sourceType,
      rows: plan.summary.rows, countries: plan.summary.countries, newRecords: plan.summary.newRecords, updated: plan.summary.updated, invalid: plan.summary.invalid, countryMatchRequired: plan.summary.countryMatchRequired }];
    const next = sanitizeStore({ ...store, entries: [...kept, ...added], history });
    const { error } = await db.from("platform_settings").upsert({ id: COMPETITOR_SETTINGS_ID, data: next });
    if (error) throw new Error(error.message);
    await audit(db, "competitor_prices.research_import", "platform_settings", COMPETITOR_SETTINGS_ID, { entries: store.entries.length }, { entries: next.entries.length, ...plan.summary });
    return plan.summary;
  });

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
