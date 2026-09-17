import { createFileRoute } from "@tanstack/react-router";

import { AdminGate } from "@/components/AdminGate";
import { PlaceholderSection } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: () => (
    <AdminGate title="Siparişler">
      <PlaceholderSection
        title="Sipariş mimarisi hazır"
        description="Sipariş, ödeme ve karşılama durumları ayrı alanlarda tutulur."
        items={[
          "Sipariş durumu: DRAFT → COMPLETED",
          "Ödeme durumu: PENDING → PAID",
          "Karşılama durumu: PENDING → FULFILLED",
          "Satın alma anı fiyat/maliyet kaydı",
        ]}
      />
    </AdminGate>
  ),
});
