import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { getEsimCoverageAudit } from "@/lib/esim-coverage.functions";
import { getCountryByIso, searchCountries } from "@/domain/geo/countries";

export const Route = createFileRoute("/_authenticated/admin/esim/coverage")({ component: EsimCoveragePage });

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-bold">{value}</dd>
    </div>
  );
}

function EsimCoveragePage() {
  const [query, setQuery] = useState("");
  const { data, isPending, error } = useQuery({ queryKey: ["esim-coverage-audit"], queryFn: () => getEsimCoverageAudit() });

  const wanted = query.trim() ? new Set(searchCountries(query, 20).map((country) => country.iso)) : null;
  const rows = (data?.rows ?? []).filter((row) => !wanted || wanted.has(row.iso));

  return (
    <AdminGate title="eSIM kapsama">
      {isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="animate-spin" /> Kapsama raporu hesaplanıyor…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : data ? (
        <div className="space-y-5">
          <section className="rounded-card border border-border bg-card p-5">
            <h2 className="font-display text-lg font-bold">Katalog özeti</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <Stat label="Toplam ülke" value={data.totalCountries} />
              <Stat label="Kapsanan ülke" value={data.coveredCountries} />
              <Stat label="Kapsamayan ülke" value={data.uncoveredCountries.length} />
              <Stat label="Toplam ürün" value={data.totalProducts} />
              <Stat label="Yayında" value={data.publishedProducts} />
              <Stat label="Taslak" value={data.draftProducts} />
              <Stat label="Kullanılamaz" value={data.unavailableProducts} />
              <Stat label="Tek ülke" value={data.singleProducts} />
              <Stat label="Bölgesel" value={data.regionalProducts} />
              <Stat label="Global" value={data.globalProducts} />
              <Stat label="Kapsaması eksik" value={data.brokenCoverageProducts} />
            </dl>
          </section>

          <section className="rounded-card border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold">Ülke bazında kapsama</h2>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3">
                <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                <input
                  className="w-48 bg-transparent text-sm outline-none"
                  placeholder="Ülke ara"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Ülke ara"
                />
              </label>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2">Ülke</th><th className="pb-2">Tek ülke</th><th className="pb-2">Bölgesel</th><th className="pb-2">Global</th><th className="pb-2">Toplam</th><th className="pb-2">En düşük fiyat</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 250).map((row) => {
                    const country = getCountryByIso(row.iso);
                    return (
                      <tr key={row.iso} className="border-t border-border/60">
                        <td className="py-2">{country?.flag} {country?.name.tr ?? row.iso} <span className="text-muted-foreground">({row.iso})</span></td>
                        <td className="py-2">{row.single}</td>
                        <td className="py-2">{row.regional}</td>
                        <td className="py-2">{row.global}</td>
                        <td className={`py-2 font-semibold ${row.total === 0 ? "text-destructive" : ""}`}>{row.total}</td>
                        <td className="py-2">{row.lowestPrice == null ? "-" : `${row.lowestPrice} ${row.currency}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {data.uncoveredCountries.length > 0 && (
            <section className="rounded-card border border-border bg-card p-5">
              <h2 className="font-display text-lg font-bold">Sağlayıcı kapsamı olmayan ülkeler</h2>
              <p className="mt-1 text-sm text-muted-foreground">Bu ülkeler için sahte paket oluşturulmaz; sağlayıcı kataloğunda ürün yoktur.</p>
              <p className="mt-3 text-sm">
                {data.uncoveredCountries.map((iso) => `${getCountryByIso(iso)?.name.tr ?? iso} (${iso})`).join(", ")}
              </p>
            </section>
          )}
        </div>
      ) : null}
    </AdminGate>
  );
}
