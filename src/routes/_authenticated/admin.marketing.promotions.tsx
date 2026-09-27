import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Archive, Pause, Play, Plus, X } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminDrawer, AdminError, AdminLoading, AdminPanel, AdminTable, EmptyState, Field, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { listPromotions, savePromotion, searchPromotionProducts, setPromotionStatus, type PromotionInput } from "@/lib/promotions.functions";
import { COUNTRIES, foldText, getCountryByIso } from "@/domain/geo/countries";
import { DEFAULT_BANNER_TEXT, formatDiscount } from "@/domain/promotions";
import { PromoBannerEditor } from "@/components/admin/PromoBannerEditor";

export const Route = createFileRoute("/_authenticated/admin/marketing/promotions")({
  head: () => adminHead("İndirimler", "Kupon kodları ve kampanya bannerı."),
  component: Promotions,
});

type Draft = Omit<PromotionInput, "startsAt" | "endsAt" | "discountValue" | "totalLimit" | "perCustomerLimit" | "minOrder"> & {
  startsAt: string; endsAt: string; discountValue: string; totalLimit: string; perCustomerLimit: string; minOrder: string;
};

const toLocalInput = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const fmt = (iso: string) => new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function emptyDraft(): Draft {
  const start = new Date(); start.setMinutes(0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 14); end.setHours(23, 59, 0, 0);
  return {
    id: null, name: "", code: "", status: "PAUSED", startsAt: toLocalInput(start.toISOString()), endsAt: toLocalInput(end.toISOString()),
    discountType: "PERCENT", discountValue: "15", services: ["ESIM"], countryScope: "ALL", countryIsos: [], productScope: "ALL", productIds: [],
    packageType: "ALL", packageScopes: ["COUNTRY"], totalLimit: "", perCustomerLimit: "", minOrder: "",
    bannerVisible: false, bannerText: { _v: "2" }, bannerShowCode: true, bannerShowCopy: true,
  };
}

function fromRow(row: any): Draft {
  return {
    id: row.id, name: row.name, code: row.code, status: row.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
    startsAt: toLocalInput(row.starts_at), endsAt: toLocalInput(row.ends_at), discountType: row.discount_type, discountValue: String(Number(row.discount_value)),
    services: row.services, countryScope: row.country_scope, countryIsos: row.country_isos, productScope: row.product_scope, productIds: row.product_ids,
    packageType: row.package_type, packageScopes: row.package_scopes,
    totalLimit: row.total_limit ? String(row.total_limit) : "", perCustomerLimit: row.per_customer_limit ? String(row.per_customer_limit) : "", minOrder: row.min_order != null ? String(Number(row.min_order)) : "",
    bannerVisible: row.banner_visible, bannerText: row.banner_text ?? {}, bannerShowCode: row.banner_show_code, bannerShowCopy: row.banner_show_copy,
  };
}

const num = (v: string) => (v.trim() === "" ? null : Number(v));
const SERVICE_LABEL: Record<string, string> = { ESIM: "eSIM", LOUNGE: "Lounge", VIGNETTE: "Vignette" };
const SCOPE_LABEL: Record<string, string> = { COUNTRY: "Ülke paketleri", REGION: "Bölgesel paketler", GLOBAL: "Global paketler" };

function scopeText(row: { services: string[]; country_scope?: string; countryScope?: string; country_isos?: string[]; countryIsos?: string[]; product_scope?: string; productScope?: string; product_ids?: string[]; productIds?: string[] }) {
  const isos = row.country_isos ?? row.countryIsos ?? [];
  const cs = row.country_scope ?? row.countryScope;
  const ps = row.product_scope ?? row.productScope;
  const countries = cs === "SELECTED" ? isos.map((iso) => getCountryByIso(iso)?.name.tr ?? iso).slice(0, 3).join(", ") + (isos.length > 3 ? ` +${isos.length - 3}` : "") : "Tüm ülkeler";
  return `${row.services.map((s) => SERVICE_LABEL[s] ?? s).join(" + ")} · ${countries}${ps === "SELECTED" ? ` · ${(row.product_ids ?? row.productIds ?? []).length} ürün` : ""}`;
}

function liveState(row: any) {
  if (row.status !== "ACTIVE") return row.status;
  const now = Date.now();
  if (new Date(row.starts_at).getTime() > now) return "SCHEDULED";
  if (new Date(row.ends_at).getTime() <= now) return "EXPIRED";
  return "ACTIVE";
}

function Promotions() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const list = useQuery({ queryKey: ["promotions"], queryFn: () => listPromotions() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["promotions"] });

  const save = useMutation({
    mutationFn: (d: Draft) => savePromotion({ data: {
      ...d, startsAt: new Date(d.startsAt).toISOString(), endsAt: new Date(d.endsAt).toISOString(), discountValue: Number(d.discountValue),
      totalLimit: num(d.totalLimit), perCustomerLimit: num(d.perCustomerLimit), minOrder: num(d.minOrder),
    } }),
    onSuccess: async () => { toast.success("Kampanya kaydedildi."); setDraft(null); await refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const status = useMutation({
    mutationFn: (v: { id: string; status: "ACTIVE" | "PAUSED" | "ARCHIVED" }) => setPromotionStatus({ data: v }),
    onSuccess: refresh, onError: (e: Error) => toast.error(e.message),
  });

  const rows = ((list.data ?? []) as any[]).filter((r) => showArchived || r.status !== "ARCHIVED");

  return (
    <AdminGate title="Pazarlama · İndirimler">
      <AdminPanel title="Kupon kampanyaları" action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setShowArchived((v) => !v)}>{showArchived ? "Arşivi gizle" : "Arşivi göster"}</Button><Button size="sm" variant="cta" onClick={() => setDraft(emptyDraft())}><Plus />Yeni kampanya</Button></div>}>
        {list.isPending ? <AdminLoading /> : list.error ? <AdminError error={list.error} /> : !rows.length ? (
          <EmptyState title="Henüz kupon kampanyası yok." detail="Kupon kodu, süre, kapsam ve banner ayarlarını buradan yönetin." />
        ) : (
          <AdminTable head={["Kampanya", "Kod", "İndirim", "Kapsam", "Başlangıç", "Bitiş", "Kullanım", "Durum", "Banner", ""]}>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><button type="button" className="text-left font-semibold underline-offset-2 hover:underline" onClick={() => setDraft(fromRow(row))}>{row.name}</button></td>
                <td className="font-mono font-bold">{row.code}</td>
                <td>{formatDiscount(row.discount_type, Number(row.discount_value), "tr")}</td>
                <td className="max-w-48 text-muted-foreground">{scopeText(row)}</td>
                <td>{fmt(row.starts_at)}</td>
                <td>{fmt(row.ends_at)}</td>
                <td>{row.uses} / {row.total_limit ?? "∞"}</td>
                <td><StatusBadge value={liveState(row)} /></td>
                <td><StatusBadge value={row.banner_visible ? "VISIBLE" : "HIDDEN"} /></td>
                <td className="whitespace-nowrap">
                  {row.status === "ACTIVE" && <button type="button" title="Duraklat" className="size-8" onClick={() => status.mutate({ id: row.id, status: "PAUSED" })}><Pause className="mx-auto size-3.5" /></button>}
                  {row.status === "PAUSED" && <button type="button" title="Devam ettir" className="size-8" onClick={() => status.mutate({ id: row.id, status: "ACTIVE" })}><Play className="mx-auto size-3.5" /></button>}
                  {row.status === "ARCHIVED" ? <button type="button" title="Arşivden çıkar" className="size-8" onClick={() => status.mutate({ id: row.id, status: "PAUSED" })}><Play className="mx-auto size-3.5" /></button>
                    : <button type="button" title="Arşivle" className="size-8" onClick={() => { if (confirm("Kampanya arşivlensin mi? Kod artık kullanılamaz.")) status.mutate({ id: row.id, status: "ARCHIVED" }); }}><Archive className="mx-auto size-3.5" /></button>}
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">Kupon durumu ve banner görünürlüğü ayrı kontrollerdir. Tüm doğrulama sunucuda, sunucu saatiyle yapılır. Kampanyalar silinmez, arşivlenir.</p>
      </AdminPanel>
      <AdminDrawer open={Boolean(draft)} title={draft?.id ? "Kampanyayı düzenle" : "Yeni kampanya"} onClose={() => setDraft(null)}>
        {draft && <PromotionForm draft={draft} setDraft={setDraft} saving={save.isPending} onSave={() => save.mutate(draft)} />}
      </AdminDrawer>
    </AdminGate>
  );
}

function Toggle<T extends string>({ values, value, onChange, labels }: { values: readonly T[]; value: T; onChange: (v: T) => void; labels: Record<T, string> }) {
  return <div className="mt-1 flex flex-wrap gap-1">{values.map((v) => <Button key={v} type="button" size="sm" variant={value === v ? "secondary" : "outline"} onClick={() => onChange(v)}>{labels[v]}</Button>)}</div>;
}

function PromotionForm({ draft, setDraft, saving, onSave }: { draft: Draft; setDraft: (d: Draft) => void; saving: boolean; onSave: () => void }) {
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const [countryQuery, setCountryQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const countryHits = useMemo(() => {
    const q = foldText(countryQuery);
    return q.length < 2 ? [] : COUNTRIES.filter((c) => !draft.countryIsos.includes(c.iso) && [c.name.tr, c.name.en, c.name.de, c.iso].some((n) => foldText(n).includes(q))).slice(0, 8);
  }, [countryQuery, draft.countryIsos]);
  const products = useQuery({
    queryKey: ["promo-products", productQuery, draft.productIds],
    queryFn: () => searchPromotionProducts({ data: { search: productQuery, ids: draft.productIds } }),
    enabled: draft.productScope === "SELECTED",
  });
  const toggleArr = <K extends "services" | "packageScopes">(key: K, v: Draft[K][number]) => {
    const arr = draft[key] as string[];
    set({ [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] } as Partial<Draft>);
  };
  const discount = formatDiscount(draft.discountType, Number(draft.discountValue) || 0, "tr");

  return (
    <div className="grid gap-4 text-xs">
      <section className="grid gap-2">
        <h3 className="admin-panel-title">Temel bilgiler</h3>
        <Field label="Kampanya adı (dahili)"><input className="admin-field mt-1 w-full" value={draft.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Kupon kodu" hint="A–Z, 0–9, - ve _. Tüm dillerde aynı kalır."><input className="admin-field mt-1 w-full font-mono uppercase" value={draft.code} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })} /></Field>
        <Field label="Kupon durumu"><Toggle values={["ACTIVE", "PAUSED"] as const} value={draft.status as "ACTIVE" | "PAUSED"} onChange={(v) => set({ status: v })} labels={{ ACTIVE: "Aktif", PAUSED: "Duraklatıldı" }} /></Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Başlangıç"><input type="datetime-local" className="admin-field mt-1 w-full" value={draft.startsAt} onChange={(e) => set({ startsAt: e.target.value })} /></Field>
          <Field label="Bitiş"><input type="datetime-local" className="admin-field mt-1 w-full" value={draft.endsAt} onChange={(e) => set({ endsAt: e.target.value })} /></Field>
        </div>
      </section>
      <section className="grid gap-2">
        <h3 className="admin-panel-title">İndirim</h3>
        <Toggle values={["PERCENT", "FIXED"] as const} value={draft.discountType} onChange={(v) => set({ discountType: v })} labels={{ PERCENT: "Yüzde (%)", FIXED: "Sabit (EUR)" }} />
        <Field label={draft.discountType === "PERCENT" ? "Yüzde (1–100)" : "Tutar (EUR)"}><input type="number" min="0.01" max={draft.discountType === "PERCENT" ? 100 : undefined} step="0.01" className="admin-field mt-1 w-full" value={draft.discountValue} onChange={(e) => set({ discountValue: e.target.value })} /></Field>
      </section>
      <section className="grid gap-2">
        <h3 className="admin-panel-title">Kapsam</h3>
        <div className="flex flex-wrap gap-3">{(["ESIM", "LOUNGE", "VIGNETTE"] as const).map((s) => <label key={s} className="flex items-center gap-1.5 font-semibold"><input type="checkbox" checked={draft.services.includes(s)} onChange={() => toggleArr("services", s)} />{SERVICE_LABEL[s]}</label>)}</div>
        {draft.services.includes("ESIM") && <>
          <Field label="Paket kapsamı" hint="Bölgesel/global paketler yalnızca açıkça seçilirse indirim alır."><div className="mt-1 flex flex-wrap gap-3">{(["COUNTRY", "REGION", "GLOBAL"] as const).map((s) => <label key={s} className="flex items-center gap-1.5 font-normal"><input type="checkbox" checked={draft.packageScopes.includes(s)} onChange={() => toggleArr("packageScopes", s)} />{SCOPE_LABEL[s]}</label>)}</div></Field>
          <Field label="Paket tipi"><Toggle values={["ALL", "STANDARD", "UNLIMITED"] as const} value={draft.packageType} onChange={(v) => set({ packageType: v })} labels={{ ALL: "Tümü", STANDARD: "Sadece Standart", UNLIMITED: "Sadece Sınırsız" }} /></Field>
          <Field label="Ülke kapsamı" hint="Ülke filtresi ülke paketlerine uygulanır."><Toggle values={["ALL", "SELECTED"] as const} value={draft.countryScope} onChange={(v) => set({ countryScope: v })} labels={{ ALL: "Tüm ülkeler", SELECTED: "Seçili ülkeler" }} /></Field>
          {draft.countryScope === "SELECTED" && <div className="grid gap-1.5">
            <input className="admin-field w-full" placeholder="Ülke ara…" value={countryQuery} onChange={(e) => setCountryQuery(e.target.value)} />
            {countryHits.map((c) => <button key={c.iso} type="button" className="rounded border border-border px-2 py-1 text-left hover:bg-secondary" onClick={() => { set({ countryIsos: [...draft.countryIsos, c.iso] }); setCountryQuery(""); }}>{c.flag} {c.name.tr}</button>)}
            <div className="flex flex-wrap gap-1">{draft.countryIsos.map((iso) => <span key={iso} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">{getCountryByIso(iso)?.flag} {getCountryByIso(iso)?.name.tr ?? iso}<button type="button" aria-label="Kaldır" onClick={() => set({ countryIsos: draft.countryIsos.filter((x) => x !== iso) })}><X className="size-3" /></button></span>)}</div>
          </div>}
        </>}
        <Field label="Ürün kapsamı"><Toggle values={["ALL", "SELECTED"] as const} value={draft.productScope} onChange={(v) => set({ productScope: v })} labels={{ ALL: "Tüm uygun ürünler", SELECTED: "Seçili ürünler" }} /></Field>
        {draft.productScope === "SELECTED" && <div className="grid gap-1.5">
          <input className="admin-field w-full" placeholder="Ürün ara (en az 2 harf)…" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} />
          <div className="grid max-h-48 gap-1 overflow-y-auto">{(products.data?.results ?? []).filter((p) => !draft.productIds.includes(p.id)).map((p) => (
            <button key={p.id} type="button" className="rounded border border-border px-2 py-1 text-left hover:bg-secondary" onClick={() => set({ productIds: [...draft.productIds, p.id] })}>{p.name} <span className="text-muted-foreground">· {p.iso ?? p.kind ?? p.service} · {p.unlimited ? "Sınırsız" : p.dataGb ? `${p.dataGb} GB` : ""} · {p.price.toFixed(2)} {p.currency}</span></button>
          ))}</div>
          <div className="grid gap-1">{(products.data?.selected ?? []).map((p) => <span key={p.id} className="flex items-center justify-between rounded bg-secondary px-2 py-1">{p.name} · {p.price.toFixed(2)} {p.currency}<button type="button" aria-label="Kaldır" onClick={() => set({ productIds: draft.productIds.filter((x) => x !== p.id) })}><X className="size-3" /></button></span>)}</div>
        </div>}
      </section>
      <section className="grid gap-2 sm:grid-cols-3">
        <Field label="Toplam kullanım limiti" hint="Boş = sınırsız"><input type="number" min="1" className="admin-field mt-1 w-full" value={draft.totalLimit} onChange={(e) => set({ totalLimit: e.target.value })} /></Field>
        <Field label="Müşteri başına limit" hint="Boş = sınırsız; girişli hesaba göre"><input type="number" min="1" className="admin-field mt-1 w-full" value={draft.perCustomerLimit} onChange={(e) => set({ perCustomerLimit: e.target.value })} /></Field>
        <Field label="Minimum sepet (EUR)" hint="Uygun ürünlerin toplamı"><input type="number" min="0" step="0.01" className="admin-field mt-1 w-full" value={draft.minOrder} onChange={(e) => set({ minOrder: e.target.value })} /></Field>
      </section>
      <section className="grid gap-2">
        <h3 className="admin-panel-title">Banner ayarları</h3>
        <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={draft.bannerVisible} onChange={(e) => set({ bannerVisible: e.target.checked })} />Mağazada banner göster</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={draft.bannerShowCode} onChange={(e) => set({ bannerShowCode: e.target.checked })} />Kupon kodunu göster</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={draft.bannerShowCopy} disabled={!draft.bannerShowCode} onChange={(e) => set({ bannerShowCopy: e.target.checked })} />Kopyalama butonunu göster</label>
        <PromoBannerEditor value={draft.bannerText} onChange={(bannerText) => set({ bannerText })} discountType={draft.discountType} discountValue={Number(draft.discountValue) || 0} code={draft.code} showCode={draft.bannerShowCode} visible={draft.bannerVisible} />
      </section>
      <section className="rounded-md border border-primary/20 bg-accent-soft p-3 text-[12px] leading-relaxed">
        <h3 className="admin-panel-title mb-1">Özet</h3>
        <p><strong>{discount}</strong> indirim · kod <strong className="font-mono">{draft.code || "—"}</strong> · {draft.status === "ACTIVE" ? "Aktif" : "Duraklatıldı"}</p>
        <p>Geçerli: {draft.startsAt ? fmt(new Date(draft.startsAt).toISOString()) : "—"} → {draft.endsAt ? fmt(new Date(draft.endsAt).toISOString()) : "—"}</p>
        <p>Geçerli olduğu yer: {scopeText(draft)}{draft.services.includes("ESIM") ? ` · ${draft.packageScopes.map((s) => SCOPE_LABEL[s]).join(", ")} · ${draft.packageType === "ALL" ? "Standart + Sınırsız" : draft.packageType === "STANDARD" ? "Sadece Standart" : "Sadece Sınırsız"}` : ""}</p>
        <p>Banner: {draft.bannerVisible ? "Görünür" : "Gizli"}{draft.bannerVisible && !draft.bannerShowCode ? " (kod gizli)" : ""}</p>
        <p>Kullanım: {draft.perCustomerLimit || "∞"}/müşteri · {draft.totalLimit || "∞"} toplam{draft.minOrder ? ` · min. ${draft.minOrder} EUR` : ""}</p>
      </section>
      <div className="flex gap-2">
        <Button onClick={onSave} disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</Button>
        <Button variant="outline" onClick={() => setDraft(null as unknown as Draft)}>Vazgeç</Button>
      </div>
    </div>
  );
}
