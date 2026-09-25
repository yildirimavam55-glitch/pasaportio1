import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Car } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getVignetteAdmin } from "@/lib/admin-vignette.functions";

export const Route = createFileRoute("/_authenticated/admin/vignette")({
  head: () => adminHead("Vignette", "Vignette servis durumu ve gerçek ürünler."),
  component: VignetteAdmin,
});

const AVAILABILITY_LABEL = { ACTIVE: "Satışta", NOT_FOR_SALE: "Yakında / satışta değil", PAUSED: "Duraklatıldı" } as const;

function VignetteAdmin() {
  const [tab, setTab] = useState<"overview" | "products">("overview");
  const q = useQuery({ queryKey: ["admin-vignette"], queryFn: () => getVignetteAdmin() });
  return (
    <AdminGate title="Vignette">
      <div className="grid gap-3">
        <div className="admin-card flex flex-wrap gap-1 p-2">
          <Button size="sm" variant={tab === "overview" ? "default" : "ghost"} onClick={() => setTab("overview")}>Genel bakış</Button>
          <Button size="sm" variant={tab === "products" ? "default" : "ghost"} onClick={() => setTab("products")}>Ürünler</Button>
          <Button asChild size="sm" variant="ghost"><Link to="/admin/storefront/v2/$page" params={{ page: "vignette" }}>Storefront</Link></Button>
          <Button asChild size="sm" variant="ghost"><Link to="/admin/service-controls">Servis kontrolü</Link></Button>
        </div>
        {q.isPending ? <AdminLoading /> : q.error ? <AdminError error={q.error} /> : tab === "overview" ? (
          <AdminPanel title="Genel bakış" action={<Car className="size-4 text-muted-foreground" />}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Stat label="Servis durumu" value={AVAILABILITY_LABEL[q.data.availability]} />
              <Stat label="Satılabilir ürün" value={String(q.data.sellableCount)} />
              <Stat label="Ülke" value={String(q.data.countriesCount)} />
              <Stat label="Sipariş" value={String(q.data.ordersCount)} />
              <Stat label="Yeni satın alma" value={q.data.checkout ? "Açık" : "Kapalı"} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Vignette henüz ticari olarak başlatılmadı. Müşteri sayfası “yakında” durumunu gösterir; ürün sepete eklenemez.</p>
          </AdminPanel>
        ) : (
          <AdminPanel title={`Ürünler (${q.data.productCount})`}>
            {q.data.products.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center">
                <p className="text-sm font-bold">0 ürün</p>
                <p className="mt-1 text-xs text-muted-foreground">Henüz gerçek bir Vignette sağlayıcısı bağlanmadı. Ürünler; ülke, sağlayıcı kimliği, geçerlilik, araç kategorisi, tedarik maliyeti, müşteri fiyatı ve durum ile burada listelenecek. Sahte ürün oluşturulmaz.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-muted-foreground"><th>Ürün</th><th>Sağlayıcı kimliği</th><th>Tedarik maliyeti</th><th>Müşteri fiyatı</th><th>Durum</th><th>Aktif</th></tr></thead>
                  <tbody>{q.data.products.map((p) => (
                    <tr key={p.id} className="border-t border-border"><td className="py-2 font-semibold">{p.name}</td><td>{p.providerExternalId ?? "—"}</td><td>{p.supplierCost ?? "—"}</td><td>{p.salePrice != null ? `${p.salePrice} ${p.currency}` : "—"}</td><td><StatusBadge value={p.lifecycle} /></td><td>{p.active ? "Evet" : "Hayır"}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </AdminPanel>
        )}
      </div>
    </AdminGate>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border p-3"><p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>;
}
