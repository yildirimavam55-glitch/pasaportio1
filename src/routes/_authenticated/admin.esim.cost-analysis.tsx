import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { getEsim10GbCostAnalysis } from "@/lib/esim-cost-analysis.functions";
import { getCountryByIso } from "@/domain/geo/countries";

export const Route = createFileRoute("/_authenticated/admin/esim/cost-analysis")({ component: CostAnalysisPage });

const money = (n: number | null, c: string | null) => (n == null ? "—" : `${n.toFixed(2)} ${c ?? ""}`);

function CostAnalysisPage() {
  return (
    <AdminGate title="eSIM maliyet analizi">
      <div className="space-y-8">
        <h2 className="font-display text-lg font-bold">10 GB paketler</h2>
        <CostSection kind="10GB" />
        <h2 className="font-display text-lg font-bold">Limitsiz paketler (tüm süreler)</h2>
        <CostSection kind="UNLIMITED" />
      </div>
    </AdminGate>
  );
}

function CostSection({ kind }: { kind: "10GB" | "UNLIMITED" }) {
  const { data, isPending, error } = useQuery({ queryKey: ["esim-cost", kind], queryFn: () => getEsim10GbCostAnalysis({ data: { kind } }) });
  return (
    <>
      {isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="animate-spin" /> Hesaplanıyor…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : data ? (
        <div className="space-y-5">
          <section className="rounded-card border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Yalnızca tedarikçi kataloğundaki aktif, yerel (tek ülke) {kind === "UNLIMITED" ? "limitsiz" : "10 GB"} paketler. Sadece analiz — mağaza fiyatları değişmez.</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-secondary/60 p-3"><dt className="text-xs font-semibold uppercase text-muted-foreground">{data.countriesWithData} ülke ort. maliyet</dt><dd className="mt-1 text-lg font-bold">{money(data.avgOfAverages, data.currency)}</dd></div>
              <div className="rounded-xl bg-secondary/60 p-3"><dt className="text-xs font-semibold uppercase text-muted-foreground">Ort. en ucuz maliyet</dt><dd className="mt-1 text-lg font-bold">{money(data.avgOfCheapest, data.currency)}</dd></div>
              <div className="rounded-xl bg-secondary/60 p-3"><dt className="text-xs font-semibold uppercase text-muted-foreground">+%30 önerilen ort. satış</dt><dd className="mt-1 text-lg font-bold">{money(data.markupAverage, data.currency)}</dd></div>
              <div className="rounded-xl bg-secondary/60 p-3"><dt className="text-xs font-semibold uppercase text-muted-foreground">Verisi olmayan ülke</dt><dd className="mt-1 text-lg font-bold">{data.rows.length - data.countriesWithData}</dd></div>
            </dl>
          </section>
          {kind === "UNLIMITED" && <DaysTable rows={data.rows} />}
          <section className="overflow-x-auto rounded-card border border-border bg-card p-5">
            <table className="w-full min-w-[34rem] text-sm">
              <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Ülke</th><th className="pb-2">Paket</th><th className="pb-2">En ucuz</th><th className="pb-2">Ortalama</th><th className="pb-2">En pahalı</th><th className="pb-2">Para birimi</th></tr></thead>
              <tbody>
                {data.rows.map((r) => {
                  const c = getCountryByIso(r.iso);
                  return (
                    <tr key={r.iso} className="border-t border-border/60">
                      <td className="py-2">{c?.flag} {c?.name.tr ?? r.iso}</td>
                      <td className={`py-2 ${r.count === 0 ? "text-destructive" : ""}`}>{r.count}</td>
                      <td className="py-2">{money(r.min, null)}</td>
                      <td className="py-2 font-semibold">{money(r.avg, null)}</td>
                      <td className="py-2">{money(r.max, null)}</td>
                      <td className="py-2">{r.currency ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}
    </>
  );
}

const DAYS = [1, 3, 5, 7, 10, 15, 30];
function DaysTable({ rows }: { rows: import("@/lib/esim-cost-analysis.functions").CostRow[] }) {
  return (
    <section className="overflow-x-auto rounded-card border border-border bg-card p-5">
      <p className="mb-3 text-sm text-muted-foreground">Süreye göre tedarikçi maliyeti (en ucuz – en pahalı, EUR)</p>
      <table className="w-full min-w-[48rem] text-sm">
        <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Ülke</th>{DAYS.map((d) => <th key={d} className="pb-2">{d} gün</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => {
            const c = getCountryByIso(r.iso);
            return (
              <tr key={r.iso} className="border-t border-border/60">
                <td className="py-2">{c?.flag} {c?.name.tr ?? r.iso}</td>
                {DAYS.map((d) => { const g = r.byDays?.[d]; return <td key={d} className="py-2 whitespace-nowrap">{g ? (g.min === g.max ? g.min.toFixed(2) : `${g.min.toFixed(2)}–${g.max.toFixed(2)}`) : "—"}</td>; })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
