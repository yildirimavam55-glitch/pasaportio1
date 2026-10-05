import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, money } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getCountryPricing, getManualPricingOverview, previewCopyCountryPrices, saveManualPrices } from "@/lib/manual-pricing.functions";
import { packageKeyLabel, profitAndMargin } from "@/domain/pricing/manual-prices";

export const Route = createFileRoute("/_authenticated/admin/manual-pricing")({
  head: () => adminHead("Paket fiyatları", "Genel ve ülkeye özel manuel eSIM fiyatları."),
  component: ManualPricing,
});

const SOURCE_LABEL = { COUNTRY: "ÜLKEYE ÖZEL", GLOBAL: "GENEL PAKET FİYATI", AUTO: "OTOMATİK FALLBACK" } as const;
const pct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);
const parse = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

function SourceBadge({ source }: { source: keyof typeof SOURCE_LABEL }) {
  const tone = source === "COUNTRY" ? "bg-primary text-primary-foreground" : source === "GLOBAL" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{SOURCE_LABEL[source]}</span>;
}

type Loss = { name: string; iso: string | null; key: string; cost: number | null; price: number | null; loss: number | null };

function useSave(onDone: () => void) {
  const qc = useQueryClient();
  const [losses, setLosses] = useState<{ args: any; list: Loss[]; count: number } | null>(null);
  const m = useMutation({
    mutationFn: (args: { scope: string; entries: { key: string; price: number | null }[]; confirmLoss?: boolean }) => saveManualPrices({ data: args }),
    onSuccess: async (res, args) => {
      if (!res.ok) { setLosses({ args, list: res.losses, count: res.lossCount }); return; }
      setLosses(null);
      toast.success(`Kaydedildi. ${res.updated} ürün fiyatı güncellendi.`);
      await qc.invalidateQueries({ queryKey: ["manual-pricing"] });
      onDone();
    },
    onError: (e: any) => toast.error(e?.message ?? "Kaydedilemedi."),
  });
  const lossDialog = losses && (
    <div className="mt-3 rounded-2xl border border-destructive bg-destructive/10 p-4 text-sm">
      <p className="font-bold text-destructive">⚠ ZARARINA SATIŞ — {losses.count} ürün tedarikçi maliyetinin altında satılacak</p>
      <ul className="mt-2 space-y-1">
        {losses.list.slice(0, 10).map((l, i) => (
          <li key={i}>{l.iso} · {packageKeyLabel(l.key)} — Tedarikçi {money(l.cost)} · Satış {money(l.price)} · Zarar {money(l.loss)}</li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="destructive" onClick={() => m.mutate({ ...losses.args, confirmLoss: true })}>Zararına rağmen kaydet</Button>
        <Button size="sm" variant="outline" onClick={() => setLosses(null)}>Vazgeç</Button>
      </div>
    </div>
  );
  return { save: m.mutate, pending: m.isPending, lossDialog };
}

function ManualPricing() {
  const [tab, setTab] = useState<"global" | "country" | "copy">("global");
  const [iso, setIso] = useState("TR");
  const overview = useQuery({ queryKey: ["manual-pricing", "overview"], queryFn: () => getManualPricingOverview() });
  return (
    <AdminGate title="Paket fiyatları">
      <p className="mb-4 text-sm text-muted-foreground">Öncelik: Ülkeye özel fiyat → Genel paket fiyatı → Otomatik % kâr + .99. Katalog senkronu manuel fiyatların üzerine yazmaz.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {([["global", "Genel paket fiyatları"], ["country", "Ülkeye özel fiyatlar"], ["copy", "Fiyatları kopyala"]] as const).map(([k, l]) => (
          <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} onClick={() => setTab(k)}>{l}</Button>
        ))}
      </div>
      {overview.isLoading ? <AdminLoading /> : overview.error ? <AdminError error={overview.error} /> : overview.data && (
        tab === "global" ? <GlobalPrices data={overview.data} />
          : tab === "country" ? <><CountryOverview data={overview.data} iso={iso} onPick={setIso} /><CountryPrices iso={iso} /></>
          : <CopyPrices countries={overview.data.countries.map((c) => c.iso)} />
      )}
    </AdminGate>
  );
}

function GlobalPrices({ data }: { data: Awaited<ReturnType<typeof getManualPricingOverview>> }) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const { save, pending, lossDialog } = useSave(() => setEdits({}));
  const sections = [
    { title: "STANDARD", rows: data.groups.filter((g) => !g.key.startsWith("U|")) },
    { title: "UNLIMITED", rows: data.groups.filter((g) => g.key.startsWith("U|")) },
  ].map((s) => ({ ...s, rows: [...s.rows].sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true })) }));
  const changed = Object.entries(edits).filter(([k, v]) => parse(v) !== (data.global[k] ?? null));
  return (
    <AdminPanel title="Genel paket fiyatları" action={<Button size="sm" variant="cta" disabled={!changed.length || pending} onClick={() => save({ scope: "GLOBAL", entries: changed.map(([key, v]) => ({ key, price: parse(v) })) })}>Değişiklikleri kaydet ({changed.length})</Button>}>
      <p className="mb-3 text-xs text-muted-foreground">Yalnızca katalogda gerçekten bulunan veri/gün kombinasyonları listelenir. Boş bırakılan satır otomatik fiyatı kullanır.</p>
      {lossDialog}
      {sections.map((s) => (
        <div key={s.title} className="mb-5">
          <h3 className="mb-2 text-sm font-bold">{s.title}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">Paket</th><th>Ülke</th><th>Tedarikçi maliyeti</th><th>Genel fiyat</th><th></th></tr></thead>
              <tbody>
                {s.rows.map((g) => {
                  const v = edits[g.key] ?? (data.global[g.key]?.toString() ?? "");
                  const p = parse(v);
                  const loss = p != null && g.maxCost != null && p < g.maxCost;
                  return (
                    <tr key={g.key} className="border-t border-border">
                      <td className="py-1.5 font-medium">{packageKeyLabel(g.key)}</td>
                      <td>{g.countries}</td>
                      <td className="whitespace-nowrap">{money(g.minCost)} – {money(g.maxCost)}</td>
                      <td><input aria-label={`Genel fiyat ${packageKeyLabel(g.key)}`} inputMode="decimal" className="w-24 rounded-lg border border-input bg-background px-2 py-1" placeholder="Otomatik" value={v} onChange={(e) => setEdits({ ...edits, [g.key]: e.target.value })} /></td>
                      <td className="text-xs">{loss ? <span className="font-semibold text-destructive">⚠ Bazı ülkelerde zarar</span> : g.lowCount ? <span className="text-destructive">⚠ {g.lowCount} düşük marj</span> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </AdminPanel>
  );
}

function CountryOverview({ data, iso, onPick }: { data: Awaited<ReturnType<typeof getManualPricingOverview>>; iso: string; onPick: (iso: string) => void }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "country" | "check">("all");
  const rows = data.countries.filter((c) => c.iso.includes(q.trim().toUpperCase()) && (filter === "all" || (filter === "country" ? c.country > 0 : c.check > 0)));
  return (
    <AdminPanel title="Ülke özeti" className="mb-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <input aria-label="Ülke ara" className="rounded-lg border border-input bg-background px-2 py-1 text-sm" placeholder="Ülke kodu (TR)" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filtre" className="rounded-lg border border-input bg-background px-2 py-1 text-sm" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="all">Tümü</option><option value="country">Ülkeye özel fiyatı olan</option><option value="check">Kontrol gerekli</option>
        </select>
      </div>
      <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((c) => (
          <button key={c.iso} onClick={() => onPick(c.iso)} className={`rounded-xl border p-2 text-left text-xs ${c.iso === iso ? "border-primary bg-primary/5" : "border-border"}`}>
            <div className="text-sm font-bold">{c.iso} · {c.packages} paket</div>
            <div>Vitrin: {c.published} · Ülkeye özel: {c.country}</div>
            <div>Genel fiyat: {c.global} · Fallback: {c.auto}</div>
            <div className={c.check ? "font-semibold text-destructive" : ""}>Kontrol gerekli: {c.check}</div>
          </button>
        ))}
      </div>
    </AdminPanel>
  );
}

function CountryPrices({ iso }: { iso: string }) {
  const q = useQuery({ queryKey: ["manual-pricing", "country", iso], queryFn: () => getCountryPricing({ data: { iso } }) });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const { save, pending, lossDialog } = useSave(() => setEdits({}));
  // One editable price per package structure; several supplier products may share it.
  const groups = useMemo(() => {
    const m = new Map<string, NonNullable<typeof q.data>["rows"]>();
    for (const r of q.data?.rows ?? []) m.set(r.key, [...(m.get(r.key) ?? []), r]);
    return [...m.entries()];
  }, [q.data]);
  if (q.isLoading) return <AdminLoading />;
  if (q.error) return <AdminError error={q.error} />;
  const changed = Object.entries(edits).filter(([k, v]) => parse(v) !== (groups.find(([gk]) => gk === k)?.[1][0]?.country ?? null));
  return (
    <AdminPanel title={`Ülkeye özel fiyatlar · ${iso}`} action={<Button size="sm" variant="cta" disabled={!changed.length || pending} onClick={() => save({ scope: iso, entries: changed.map(([key, v]) => ({ key, price: parse(v) })) })}>Değişiklikleri kaydet ({changed.length})</Button>}>
      {lossDialog}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">Paket</th><th>Tedarikçi</th><th>Genel</th><th>{iso} fiyatı</th><th>Aktif fiyat</th><th>Kâr</th><th>Marj</th><th>Kaynak</th><th></th></tr></thead>
          <tbody>
            {groups.map(([key, rows]) => {
              const r = rows[0]!;
              const v = edits[key] ?? (r.country?.toString() ?? "");
              const draft = parse(v);
              const active = draft ?? r.general ?? r.autoPrice;
              const cost = Math.max(...rows.map((x) => x.cost ?? 0));
              const pm = profitAndMargin(active, cost);
              const low = pm.margin != null && !pm.loss && pm.margin < r.minMargin;
              const source = draft != null ? "COUNTRY" : r.general != null ? "GLOBAL" : "AUTO";
              return (
                <tr key={key} className="border-t border-border">
                  <td className="py-1.5 font-medium">{packageKeyLabel(key)}{rows.length > 1 && <span className="text-xs text-muted-foreground"> ×{rows.length}</span>}</td>
                  <td>{money(cost)}</td>
                  <td>{money(r.general)}</td>
                  <td><input aria-label={`${iso} fiyatı ${packageKeyLabel(key)}`} inputMode="decimal" className="w-24 rounded-lg border border-input bg-background px-2 py-1" placeholder="—" value={v} onChange={(e) => setEdits({ ...edits, [key]: e.target.value })} /></td>
                  <td className="font-semibold">{money(active)}</td>
                  <td className={pm.loss ? "font-semibold text-destructive" : ""}>{money(pm.profit)}</td>
                  <td>{pct(pm.margin)}</td>
                  <td><SourceBadge source={source} />{pm.loss ? <div className="text-xs font-semibold text-destructive">⚠ ZARARINA SATIŞ</div> : low ? <div className="text-xs text-destructive">⚠ DÜŞÜK MARJ — FİYATI KONTROL ET</div> : null}</td>
                  <td>{r.country != null && <Button size="sm" variant="ghost" onClick={() => save({ scope: iso, entries: [{ key, price: null }] })}>Ülkeye özel fiyatı kaldır</Button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminPanel>
  );
}

function CopyPrices({ countries }: { countries: string[] }) {
  const [from, setFrom] = useState("DE");
  const [to, setTo] = useState("AT");
  const preview = useMutation({ mutationFn: () => previewCopyCountryPrices({ data: { from, to } }) });
  const { save, pending, lossDialog } = useSave(() => preview.reset());
  return (
    <AdminPanel title="Fiyatları başka ülkeden kopyala">
      <div className="flex flex-wrap items-end gap-2 text-sm">
        <label>Kaynak<select className="ml-2 rounded-lg border border-input bg-background px-2 py-1" value={from} onChange={(e) => { setFrom(e.target.value); preview.reset(); }}>{countries.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Hedef<select className="ml-2 rounded-lg border border-input bg-background px-2 py-1" value={to} onChange={(e) => { setTo(e.target.value); preview.reset(); }}>{countries.map((c) => <option key={c}>{c}</option>)}</select></label>
        <Button size="sm" variant="outline" disabled={from === to || preview.isPending} onClick={() => preview.mutate()}>Önizle</Button>
      </div>
      {preview.data && (
        <div className="mt-4 text-sm">
          <p className="mb-2 text-xs text-muted-foreground">Yalnızca aynı veri miktarı, gün ve paket türüne sahip paketler eşleşir. Eşleşmeyen: {preview.data.skipped.map(packageKeyLabel).join(", ") || "yok"}</p>
          {preview.data.matches.length === 0 ? <p>Kopyalanacak eşleşen ülkeye özel fiyat yok.</p> : (
            <ul className="space-y-1">{preview.data.matches.map((m) => (
              <li key={m.key}>{packageKeyLabel(m.key)}: {money(m.current)} → <b>{money(m.price)}</b> ({m.products} ürün){m.loss && <span className="text-destructive"> ⚠ zarar</span>}</li>
            ))}</ul>
          )}
          {lossDialog}
          {preview.data.matches.length > 0 && <Button className="mt-3" size="sm" variant="cta" disabled={pending} onClick={() => save({ scope: to, entries: preview.data!.matches.map((m) => ({ key: m.key, price: m.price })) })}>Onayla ve {to} ülkesine uygula</Button>}
        </div>
      )}
    </AdminPanel>
  );
}
