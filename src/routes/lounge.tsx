import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, PlaceholderSection } from "@/components/AppShell";
import { listPublishedProducts } from "@/lib/platform.functions";

export const Route = createFileRoute("/lounge")({
  head: () => ({
    meta: [
      { title: "Havalimanı lounge erişimi | Seyahat Servisleri Platformu" },
      {
        name: "description",
        content:
          "Havalimanı ve terminal bazlı lounge katalog altyapısı. Sağlayıcı entegrasyonu sonraki fazda.",
      },
      { property: "og:title", content: "Havalimanı lounge erişimi" },
      { property: "og:description", content: "Havalimanı ve terminal bazlı lounge erişimi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoungePage,
});

function LoungePage() {
  const { data: products } = useQuery({
    queryKey: ["products", "LOUNGE"],
    queryFn: () => listPublishedProducts({ data: { serviceType: "LOUNGE" } }),
  });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Lounge</h1>
      <div className="mt-6 grid gap-4">
        {(products ?? []).map((product) => (
          <div key={product.id} className="rounded-xl border border-border p-4 text-sm">
            {product.name}
          </div>
        ))}
        {(products ?? []).length === 0 && (
          <PlaceholderSection
            title="Katalog boş"
            description="Lounge ürünleri sağlayıcı senkronizasyonu ile dolacak."
            items={["Havalimanı · IATA", "Terminal", "Açılış saatleri", "Kalış süresi"]}
          />
        )}
      </div>
    </AppShell>
  );
}
