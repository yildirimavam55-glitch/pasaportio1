import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminError, AdminLoading, AdminPanel, EmptyState, Field } from "@/components/admin/AdminUi";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/domain/enums";
import { REL_REGIONS, REL_SERVICES, REL_TYPES, type RelationFields } from "@/domain/seo/relations";
import { listContentRelations, saveGuideRelations, type AdminRelationRow } from "@/lib/seo-relations.functions";

const LOCALES: Locale[] = ["tr", "de", "en"];
const input = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

type Missing = "" | "commercial" | "links" | "any";

function missingCommercial(r: AdminRelationRow) {
  return r.fields.service !== "GENERAL" && !r.target;
}
function missingLinks(r: AdminRelationRow) {
  return r.fields.relatedGuideIds.length === 0 && !r.target;
}

export function ContentRelationsTab() {
  const q = useQuery({ queryKey: ["admin-content-relations"], queryFn: () => listContentRelations() });
  const [lang, setLang] = useState<"" | Locale>("");
  const [service, setService] = useState("");
  const [country, setCountry] = useState("");
  const [ctype, setCtype] = useState("");
  const [status, setStatus] = useState("");
  const [missing, setMissing] = useState<Missing>("");
  const [editing, setEditing] = useState<string | null>(null);

  const rows = q.data?.rows ?? [];
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (lang && !r.translations.some((t) => t.locale === lang)) return false;
        if (service && r.fields.service !== service) return false;
        if (country && r.fields.countryIso !== country.toUpperCase()) return false;
        if (ctype && r.contentType !== ctype) return false;
        if (status && r.status !== status) return false;
        if (missing === "commercial" && !missingCommercial(r)) return false;
        if (missing === "links" && !missingLinks(r)) return false;
        if (missing === "any" && !(missingCommercial(r) || missingLinks(r))) return false;
        return true;
      }),
    [rows, lang, service, country, ctype, status, missing],
  );

  if (q.isPending) return <AdminLoading />;
  if (q.error) return <AdminError error={q.error} />;
  const data = q.data!;
  const types = [...new Set(rows.map((r) => r.contentType))];
  const edit = rows.find((r) => r.id === editing);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label="İçerik (ticari link yok)" value={rows.filter(missingCommercial).length} onClick={() => setMissing("commercial")} />
        <Stat label="İçerik (iç link yok)" value={rows.filter(missingLinks).length} onClick={() => setMissing("links")} />
        <Stat label={`Rehbersiz satılabilir ülke (/${data.sellableCountryCount})`} value={data.destinationsWithoutGuides.length} />
      </div>
      {!data.vignetteForSale ? (
        <p className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Vignette şu an satışta değil (Service Controls) — Vignette ilişkileri kaydedilir ama mağazada ticari bağlantı gösterilmez.
        </p>
      ) : null}

      <AdminPanel title="Content Relations">
        <div className="mb-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <select aria-label="Dil" className={input} value={lang} onChange={(e) => setLang(e.target.value as Locale | "")}>
            <option value="">Tüm diller</option>
            {LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
          <select aria-label="Servis" className={input} value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">Tüm servisler</option>
            {REL_SERVICES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input aria-label="Ülke" className={input} placeholder="Ülke ISO (IT)" value={country} maxLength={2} onChange={(e) => setCountry(e.target.value)} />
          <select aria-label="İçerik türü" className={input} value={ctype} onChange={(e) => setCtype(e.target.value)}>
            <option value="">Tüm türler</option>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select aria-label="Durum" className={input} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tüm durumlar</option>
            {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <select aria-label="Eksik ilişki" className={input} value={missing} onChange={(e) => setMissing(e.target.value as Missing)}>
            <option value="">Eksik ilişki: hepsi</option>
            <option value="commercial">Ticari link yok</option>
            <option value="links">İç link yok</option>
            <option value="any">Herhangi biri eksik</option>
          </select>
        </div>
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  {["Başlık", "Dil", "Tür", "Servis", "Ülke / Şehir / Bölge", "Ticari sayfa", "İlgili", "Ticari sayfada", "Öncelik", "Durum", ""].map((h) => (
                    <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top" data-testid="relation-row">
                    <td className="px-2 py-2">
                      {r.translations.map((t) => (
                        <div key={t.locale}><span className="font-semibold">{t.title}</span> <span className="text-muted-foreground">{t.path}</span></div>
                      ))}
                    </td>
                    <td className="px-2 py-2">
                      {r.translations.map((t) => (
                        <div key={t.locale} className={t.published ? "" : "text-muted-foreground"}>{t.locale.toUpperCase()}{t.published ? "" : " (taslak)"}</div>
                      ))}
                    </td>
                    <td className="px-2 py-2">{r.contentType}</td>
                    <td className="px-2 py-2">{r.fields.service}</td>
                    <td className="px-2 py-2">{[r.fields.countryIso, r.fields.cityName, r.fields.region].filter(Boolean).join(" / ") || "—"}</td>
                    <td className="px-2 py-2">
                      {r.target ? (
                        <span>{r.target.path} <span className="text-muted-foreground">({r.target.source === "auto" ? "otomatik" : "manuel"})</span></span>
                      ) : (
                        <span className="font-semibold text-destructive">yok</span>
                      )}
                    </td>
                    <td className="px-2 py-2">{r.fields.relatedGuideIds.length}</td>
                    <td className="px-2 py-2">{r.fields.showOnCommercial ? "Açık" : "Kapalı"}</td>
                    <td className="px-2 py-2">{r.fields.displayPriority}</td>
                    <td className="px-2 py-2">{r.status}{r.indexable ? "" : " · noindex"}</td>
                    <td className="px-2 py-2"><Button size="sm" variant="outline" onClick={() => setEditing(r.id)}>Düzenle</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Filtreye uyan içerik yok." />
        )}
      </AdminPanel>

      {edit ? <RelationsEditor key={edit.id} row={edit} all={rows} onClose={() => setEditing(null)} /> : null}

      <AdminPanel title="Rehberi olmayan satılabilir eSIM destinasyonları">
        <p className="text-xs text-muted-foreground">{data.destinationsWithoutGuides.join(", ") || "Hepsinin rehberi var."}</p>
      </AdminPanel>
    </div>
  );
}

function Stat({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl border border-border bg-card p-3 text-left">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </button>
  );
}

/** Relations editor for one content record (also embedded in the guide editor). */
export function RelationsEditor({ row, all, onClose }: { row: AdminRelationRow; all: AdminRelationRow[]; onClose?: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<RelationFields>(row.fields);
  const [alts, setAlts] = useState<Partial<Record<Locale, string>>>(
    Object.fromEntries(row.translations.map((t) => [t.locale, t.heroAlt])),
  );
  const set = <K extends keyof RelationFields>(k: K, v: RelationFields[K]) => setF((p) => ({ ...p, [k]: v }));
  const save = useMutation({
    mutationFn: () => saveGuideRelations({ data: { id: row.id, fields: f, heroAlts: alts } }),
    onSuccess: () => {
      toast.success("İlişkiler kaydedildi.");
      void qc.invalidateQueries({ queryKey: ["admin-content-relations"] });
      void qc.invalidateQueries({ queryKey: ["admin-guides"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const title = row.translations[0]?.title ?? "İçerik";
  const others = all.filter((r) => r.id !== row.id);

  return (
    <AdminPanel title={`Relations — ${title}`}>
      <div className="mb-3 rounded-md bg-secondary px-3 py-2 text-xs">
        <strong>Çeviri kardeşleri:</strong>{" "}
        {row.translations.map((t) => `${t.locale.toUpperCase()} ${t.path}${t.published ? "" : " (taslak)"}`).join(" · ") || "—"}
        <br />
        <strong>Otomatik öneri:</strong> {row.autoSuggestion ? row.autoSuggestion.path : "canlı katalogda eşleşen hedef yok"}
        {" · "}
        <strong>Geçerli:</strong> {row.target ? `${row.target.path} (${row.target.source})` : "yok"}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Servis">
          <select className={input} value={f.service} onChange={(e) => set("service", e.target.value as RelationFields["service"])}>
            {REL_SERVICES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="İlişki türü">
          <select className={input} value={f.relType} onChange={(e) => set("relType", e.target.value as RelationFields["relType"])}>
            {REL_TYPES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Konsept anahtarı (TR/DE/EN ortak)">
          <input className={input} value={f.conceptKey} placeholder="esim-germany" onChange={(e) => set("conceptKey", e.target.value)} />
        </Field>
        <Field label="Ülke (ISO)">
          <input className={input} maxLength={2} value={f.countryIso} onChange={(e) => set("countryIso", e.target.value.toUpperCase())} />
        </Field>
        <Field label="Şehir">
          <input className={input} value={f.cityName} onChange={(e) => set("cityName", e.target.value)} />
        </Field>
        <Field label="Bölge">
          <select className={input} value={f.region} onChange={(e) => set("region", e.target.value)}>
            <option value="">—</option>
            {REL_REGIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Havalimanı (IATA)">
          <input className={input} maxLength={3} value={f.airport} onChange={(e) => set("airport", e.target.value.toUpperCase())} />
        </Field>
        <Field label="Ticari sayfa (manuel, ör. /esim?country=IT)">
          <input className={input} value={f.commercialPage} onChange={(e) => set("commercialPage", e.target.value)} />
        </Field>
        <Field label="eSIM destinasyonu (ISO veya bölge, manuel)">
          <input className={input} value={f.esimDestination} placeholder="IT veya EUROPE" onChange={(e) => set("esimDestination", e.target.value.toUpperCase())} />
        </Field>
        <Field label="Lounge (manuel)">
          <input className={input} value={f.lounge} onChange={(e) => set("lounge", e.target.value)} />
        </Field>
        <Field label="Vignette (ülke ISO)">
          <input className={input} maxLength={2} value={f.vignette} onChange={(e) => set("vignette", e.target.value.toUpperCase())} />
        </Field>
        <Field label="Görüntüleme önceliği">
          <input type="number" className={input} value={f.displayPriority} onChange={(e) => set("displayPriority", Number(e.target.value))} />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        {([
          ["showOnCommercial", "Ticari sayfada göster"],
          ["autoRelation", "Otomatik ilişki"],
          ["featured", "Öne çıkan rehber"],
        ] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2">
            <input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} /> {label}
          </label>
        ))}
      </div>
      <Field label="İlgili rehberler">
        <div className="grid max-h-40 gap-1 overflow-y-auto rounded-md border border-border p-2 text-xs sm:grid-cols-2">
          {others.map((o) => (
            <label key={o.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={f.relatedGuideIds.includes(o.id)}
                onChange={(e) =>
                  set("relatedGuideIds", e.target.checked ? [...f.relatedGuideIds, o.id] : f.relatedGuideIds.filter((x) => x !== o.id))
                }
              />
              {o.translations[0]?.title ?? o.id} <span className="text-muted-foreground">({o.status})</span>
            </label>
          ))}
        </div>
      </Field>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {row.translations.map((t) => (
          <Field key={t.locale} label={`Görsel ALT ${t.locale.toUpperCase()}`}>
            <input className={input} value={alts[t.locale] ?? ""} onChange={(e) => setAlts((p) => ({ ...p, [t.locale]: e.target.value }))} />
          </Field>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Hero görseli dile bağlı değildir (tek görsel, metinsiz). Görseli rehber editöründen değiştir.</p>
      <div className="mt-4 flex gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Kaydet</Button>
        {onClose ? <Button variant="outline" onClick={onClose}>Kapat</Button> : null}
      </div>
    </AdminPanel>
  );
}

/** Relations section for the existing guide editor. */
export function GuideRelationsSection({ guideId }: { guideId: string }) {
  const q = useQuery({ queryKey: ["admin-content-relations"], queryFn: () => listContentRelations() });
  if (q.isPending) return <AdminLoading />;
  if (q.error) return <AdminError error={q.error} />;
  const row = q.data!.rows.find((r) => r.id === guideId);
  if (!row) return <EmptyState title="İlişkiler için önce içeriği kaydet." />;
  return <RelationsEditor key={row.id} row={row} all={q.data!.rows} />;
}
