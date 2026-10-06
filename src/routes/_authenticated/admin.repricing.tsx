import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { packageKeyLabel } from "@/domain/pricing/manual-prices";
import type { Priority } from "@/domain/pricing/repricing";
import { approveRepricing, getRepricingQueue, type RepricingRow } from "@/lib/repricing.functions";

export const Route = createFileRoute("/_authenticated/admin/repricing")({
  head: () => adminHead("Fiyat kontrol kuyruğu", "Tedarikçi maliyeti değişen paketlerin fiyat incelemesi."),
  component: Repricing,
});

const euro = (v: number | null | undefined) => (v == null ? "—" : new Intl.NumberFormat("tr-TR", { style: "currency", currency: "EUR" }).format(v));
const pct = (v: number | null | undefined) => (v == null ? "—" : `%${v.toFixed(1)}`);
const regionNames = new Intl.DisplayNames(["tr"], { type: "region" });
const countryName = (iso: string | null) => (iso ? regionNames.of(iso) ?? iso : "Bölgesel");

const PRIORITY: Record<Priority, { label: string; cls: string }> = {
  CRITICAL: { label: "🔴 SATIŞ FİYATI MALİYETİN ALTINDA / ZARAR RİSKİ", cls: "border-destructive text-destructive" },
  HIGH: { label: "🟠 Yüksek öncelik", cls: "border-border" },
  NORMAL: { label: "🟡 Fiyat kontrolü gerekli", cls: "border-border" },
  CURRENT: { label: "🟢 Güncel", cls: "border-border" },
  UNKNOWN_BASELINE: { label: "BAŞLANGIÇ MALİYETİ BİLİNMİYOR", cls: "border-border text-muted-foreground" },
};

type Filters = { priority: Priority | "QUEUE" | "ALL"; country: string; type: "ALL" | "STD" | "UNL"; dir: "ALL" | "UP" | "DOWN"; airalo: "ALL" | "YES" | "NO" };

function Repricing() {
  const fetchQueue = useServerFn(getRepricingQueue);
  const q = useQuery({ queryKey: ["repricing-queue"], queryFn: () => fetchQueue() });
  const [f, setF] = useState<Filters>({ priority: "QUEUE", country: "", type: "ALL", dir: "ALL", airalo: "ALL" });
  const rows = useMemo(() => (q.data?.rows ?? []).filter((r) =>
    (f.priority === "ALL" || (f.priority === "QUEUE" ? ["CRITICAL", "HIGH", "NORMAL"].includes(r.priority) : r.priority === f.priority)) &&
    (!f.country || r.iso === f.country) &&
    (f.type === "ALL" || (f.type === "UNL") === r.unlimited) &&
    (f.dir === "ALL" || (f.dir === "UP" ? (r.change ?? 0) > 0 : (r.change ?? 0) < 0)) &&
    (f.airalo === "ALL" || (f.airalo === "YES") === (r.airalo != null))), [q.data, f]);
  const countries = useMemo(() => [...new Set((q.data?.rows ?? []).map((r) => r.iso).filter(Boolean) as string[])].sort((a, b) => countryName(a).localeCompare(countryName(b), "tr")), [q.data]);
  const c = q.data?.counts ?? {};
  const tile = (p: Priority, label: string) => (
    <button type="button" onClick={() => setF({ ...f, priority: f.priority === p ? "QUEUE" : p })}
      className={`rounded-md border p-3 text-left ${f.priority === p ? "border-primary" : "border-border"}`}>
      <div className="text-xs">{label}</div><div className="text-xl font-bold">{c[p] ?? 0}</div>
    </button>
  );
  return (
    <AdminGate title="Fiyat kontrol kuyruğu">
      {q.isLoading ? <AdminLoading /> : q.error ? <AdminError error={q.error} /> : (
        <div className="min-w-0 space-y-4">
          <p className="text-xs text-muted-foreground">Ürünler mevcut fiyatla satışta kalır. Fiyat yalnız tek tek onayınızla değişir.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {tile("CRITICAL", "🔴 Kritik")}{tile("HIGH", "🟠 Yüksek öncelik")}{tile("NORMAL", "🟡 Fiyat kontrolü gerekli")}{tile("CURRENT", "🟢 Güncel")}{tile("UNKNOWN_BASELINE", "Başlangıç maliyeti bilinmiyor")}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select className="admin-field" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} aria-label="Ülke">
              <option value="">Tüm ülkeler</option>{countries.map((iso) => <option key={iso} value={iso}>{countryName(iso)}</option>)}
            </select>
            <select className="admin-field" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Filters["type"] })} aria-label="Paket türü">
              <option value="ALL">Standart + Sınırsız</option><option value="STD">Standart</option><option value="UNL">Sınırsız</option>
            </select>
            <select className="admin-field" value={f.dir} onChange={(e) => setF({ ...f, dir: e.target.value as Filters["dir"] })} aria-label="Maliyet yönü">
              <option value="ALL">Maliyet: tümü</option><option value="UP">Maliyet arttı</option><option value="DOWN">Maliyet düştü</option>
            </select>
            <select className="admin-field" value={f.airalo} onChange={(e) => setF({ ...f, airalo: e.target.value as Filters["airalo"] })} aria-label="Airalo">
              <option value="ALL">Airalo: tümü</option><option value="YES">Airalo var</option><option value="NO">Airalo yok</option>
            </select>
          </div>
          <div className="text-xs text-muted-foreground">{rows.length} paket{f.priority === "QUEUE" ? " (inceleme gereken)" : ""}</div>
          <div className="space-y-2">{rows.slice(0, 200).map((r) => <QueueCard key={r.id} r={r} />)}</div>
          {rows.length > 200 && <p className="text-xs text-muted-foreground">İlk 200 gösteriliyor; filtreyle daraltın.</p>}
        </div>
      )}
    </AdminGate>
  );
}

function QueueCard({ r }: { r: RepricingRow }) {
  const qc = useQueryClient();
  const approve = useServerFn(approveRepricing);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(r.suggested != null ? String(r.suggested) : "");
  const m = useMutation({
    mutationFn: (price: number) => approve({ data: { productId: r.id, price, expectedCurrentPrice: r.price ?? 0 } }),
    onSuccess: (res) => { toast.success(`Yeni fiyat onaylandı: ${euro(res.price)}`); setOpen(false); qc.invalidateQueries({ queryKey: ["repricing-queue"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const p = PRIORITY[r.priority];
  const n = Number(value.replace(",", "."));
  const newProfit = r.cost != null && Number.isFinite(n) ? n - r.cost : null;
  return (
    <div className={`rounded-md border p-3 text-sm ${p.cls}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-semibold">{countryName(r.iso)} · {packageKeyLabel(r.key)}</div>
        <div className="text-xs font-semibold">{p.label}</div>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
        <div><dt className="text-muted-foreground">Güncel maliyet</dt><dd>{euro(r.cost)}</dd></div>
        <div><dt className="text-muted-foreground">Onaydaki maliyet</dt><dd>{r.baseline == null ? "Bilinmiyor" : euro(r.baseline)}</dd></div>
        <div><dt className="text-muted-foreground">Maliyet değişimi</dt><dd>{r.change == null ? "—" : `${r.change > 0 ? "+" : ""}${euro(r.change)} (${pct(r.changePct)})`}</dd></div>
        <div><dt className="text-muted-foreground">MEVCUT FİYAT</dt><dd className="font-semibold">{euro(r.price)}</dd></div>
        <div><dt className="text-muted-foreground">Mevcut kâr / markup</dt><dd>{euro(r.profit)} · {pct(r.markup)}</dd></div>
        <div><dt className="text-muted-foreground">AIRALO</dt><dd>{r.airalo == null ? "Kesin eşleşme yok" : euro(r.airalo)}</dd></div>
        <div><dt className="text-muted-foreground">ÖNERİLEN YENİ FİYAT</dt><dd className="font-semibold">{r.suggested == null ? `Manuel kontrol (${r.suggestionRule})` : euro(r.suggested)}</dd></div>
        <div><dt className="text-muted-foreground">Önerilen kâr / markup</dt><dd>{euro(r.suggestedProfit)} · {pct(r.suggestedMarkup)}</dd></div>
      </dl>
      {r.priority !== "CURRENT" && (
        !open ? <Button size="sm" variant="outline" className="mt-2" onClick={() => setOpen(true)}>Yeni fiyatı incele</Button> : (
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="text-xs">Yeni satış fiyatı (EUR)
              <input type="number" step="0.01" min="0.01" inputMode="decimal" className="admin-field mt-1 block w-32" value={value} onChange={(e) => setValue(e.target.value)} />
            </label>
            <span className="text-xs">KÂR: {euro(newProfit)}</span>
            <Button size="sm" disabled={!Number.isFinite(n) || n <= 0 || m.isPending}
              onClick={() => { if (window.confirm(`${countryName(r.iso)} · ${packageKeyLabel(r.key)}\n${euro(r.price)} → ${euro(n)} onaylansın mı?`)) m.mutate(n); }}>Onayla</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Vazgeç</Button>
          </div>
        )
      )}
    </div>
  );
}
