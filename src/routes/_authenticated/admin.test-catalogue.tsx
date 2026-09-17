import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, LoaderCircle, Trash2 } from "lucide-react";

import { AdminGate } from "@/components/AdminGate";
import { Button } from "@/components/ui/button";
import {
  deleteAllTestData,
  deleteTestProduct,
  duplicateTestProduct,
  listCatalogueProducts,
  setProductEnabled,
  setTestCatalogueVisible,
} from "@/lib/test-catalogue.functions";

export const Route = createFileRoute("/_authenticated/admin/test-catalogue")({
  component: TestCataloguePage,
});

type ServiceFilter = "ALL" | "ESIM" | "LOUNGE";
type SourceFilter = "ALL" | "INTERNAL_TEST" | "PROVIDER";

function TestCataloguePage() {
  const client = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["admin-catalogue"], queryFn: () => listCatalogueProducts() });
  const [service, setService] = useState<ServiceFilter>("ALL");
  const [source, setSource] = useState<SourceFilter>("INTERNAL_TEST");
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = () => client.invalidateQueries({ queryKey: ["admin-catalogue"] });
  const run = (fn: () => Promise<unknown>, message: string) =>
    fn()
      .then(() => {
        setNotice(message);
        return refresh();
      })
      .catch((error: Error) => setNotice(error.message));

  const toggleFlag = useMutation({
    mutationFn: (enabled: boolean) => setTestCatalogueVisible({ data: { enabled } }),
    onSuccess: () => {
      setNotice("Kaydedildi.");
      void refresh();
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const products = (data?.products ?? []).filter(
    (product) => (service === "ALL" || product.serviceType === service) && (source === "ALL" || product.source === source),
  );

  return (
    <AdminGate title="Test kataloğu">
      <div className="grid gap-4">
        <section className="rounded-card border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Storefront görünürlüğü</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kapalıyken INTERNAL_TEST ürünleri müşteri tarafında hiç görünmez. Canlı yayına geçmeden önce kapatılmalıdır.
          </p>
          <Button
            className="mt-3"
            variant={data?.showTestCatalogue ? "secondary" : "cta"}
            disabled={toggleFlag.isPending || isPending}
            onClick={() => toggleFlag.mutate(!data?.showTestCatalogue)}
          >
            {data?.showTestCatalogue ? "showTestCatalogue: AÇIK — kapat" : "showTestCatalogue: KAPALI — aç"}
          </Button>
        </section>

        <section className="rounded-card border border-border bg-card p-5 shadow-card">
          <div className="flex flex-wrap gap-2">
            {(["ALL", "ESIM", "LOUNGE"] as const).map((value) => (
              <Button key={value} size="sm" variant={service === value ? "secondary" : "outline"} onClick={() => setService(value)}>
                {value === "ALL" ? "Tüm servisler" : value}
              </Button>
            ))}
            {(["ALL", "INTERNAL_TEST", "PROVIDER"] as const).map((value) => (
              <Button key={value} size="sm" variant={source === value ? "secondary" : "outline"} onClick={() => setSource(value)}>
                {value === "ALL" ? "Tüm kaynaklar" : value}
              </Button>
            ))}
          </div>

          {notice && <p className="mt-3 text-sm font-semibold text-primary">{notice}</p>}

          {isPending ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="animate-spin size-4" /> Yükleniyor…</p>
          ) : products.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Bu filtreye uyan ürün yok.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {products.map((product) => (
                <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm">{product.name}</strong>
                      {product.isTest && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-primary">TEST</span>}
                    </div>
                    <span className="block text-xs text-muted-foreground">
                      {product.serviceType} · {product.code ?? product.slug} · {product.lifecycle} ·{" "}
                      {product.salePrice == null ? "—" : `${product.salePrice.toFixed(2)} ${product.currency}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={product.enabled ? "secondary" : "outline"}
                      onClick={() => void run(() => setProductEnabled({ data: { productId: product.id, enabled: !product.enabled } }), "Güncellendi.")}
                    >
                      {product.enabled ? "Açık" : "Kapalı"}
                    </Button>
                    {product.isTest && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => void run(() => duplicateTestProduct({ data: { productId: product.id } }), "Kopyalandı.")}>
                          <Copy className="size-4" /> Kopyala
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void run(() => deleteTestProduct({ data: { productId: product.id } }), "Silindi.")}>
                          <Trash2 className="size-4" /> Sil
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-destructive/40 bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Tüm test verisini sil</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Yalnızca is_test = true ve source = INTERNAL_TEST kayıtlarını siler. Sağlayıcı/üretim ürünlerine dokunmaz.
          </p>
          {confirmWipe ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="cta"
                onClick={() => {
                  setConfirmWipe(false);
                  void run(() => deleteAllTestData(), "Tüm test verisi silindi.");
                }}
              >
                Evet, tümünü sil
              </Button>
              <Button variant="outline" onClick={() => setConfirmWipe(false)}>Vazgeç</Button>
            </div>
          ) : (
            <Button className="mt-3" variant="outline" onClick={() => setConfirmWipe(true)}>
              <Trash2 className="size-4" /> DELETE ALL TEST DATA
            </Button>
          )}
        </section>
      </div>
    </AdminGate>
  );
}
