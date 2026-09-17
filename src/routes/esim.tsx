import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, PlaceholderSection } from "@/components/AppShell";
import { listPublishedProducts } from "@/lib/platform.functions";

export const Route = createFileRoute("/esim")({
  head: () => ({
    meta: [
      { title: "eSIM paketleri | Seyahat Servisleri Platformu" },
      {
        name: "description",
        content:
          "Ülke, bölge ve global eSIM paketleri için katalog altyapısı. Sağlayıcı entegrasyonu sonraki fazda.",
      },
      { property: "og:title", content: "eSIM paketleri" },
      { property: "og:description", content: "Ülke, bölge ve global eSIM paketleri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EsimPage,
});

function EsimPage() {
  const { data: products } = useQuery({
    queryKey: ["products", "ESIM"],
    queryFn: () => listPublishedProducts({ data: { serviceType: "ESIM" } }),
  });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">eSIM</h1>
      <div className="mt-6 grid gap-4">
        {(products ?? []).map((product) => (
          <div key={product.id} className="rounded-xl border border-border p-4 text-sm">
            {product.name}
          </div>
        ))}
        {(products ?? []).length === 0 && (
          <PlaceholderSection
            title="Katalog boş"
            description="eSIM ürünleri sağlayıcı senkronizasyonu ile dolacak."
            items={["Ülke paketi", "Bölge paketi", "Sıla Yolu rotası", "Global paket"]}
          />
        )}
      </div>
    </AppShell>
  );
}
