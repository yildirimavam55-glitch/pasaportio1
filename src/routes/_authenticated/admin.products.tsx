import { createFileRoute } from "@tanstack/react-router";

import { AdminGate } from "@/components/AdminGate";
import { PlaceholderSection } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: () => (
    <AdminGate title="Ürünler">
      <PlaceholderSection
        title="Ortak ürün katmanı"
        description="Sağlayıcıya ait veriler ile yöneticiye ait pazarlama verileri ayrıdır; senkronizasyon pazarlama verisini ezmez."
        items={[
          "Yaşam döngüsü: IMPORTED → DRAFT → PUBLISHED",
          "eSIM detay modeli",
          "Lounge detay modeli",
          "Fiyat kuralları ve marj koruması",
        ]}
      />
    </AdminGate>
  ),
});
