import { createFileRoute } from "@tanstack/react-router";

import { AdminGate } from "@/components/AdminGate";
import { PlaceholderSection } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  component: () => (
    <AdminGate title="Sağlayıcılar">
      <PlaceholderSection
        title="Sağlayıcı merkezi temeli"
        description="Henüz canlı sağlayıcı bağlanmadı. API anahtarları yalnızca sunucu tarafında saklanır."
        items={[
          "Bağlantı durumu ve yetenekler",
          "Senkronizasyon çalışmaları ve farklar",
          "Ham sağlayıcı kayıtları ve eşleşmeler",
          "Hatalar ve eskimiş kayıtlar",
        ]}
      />
    </AdminGate>
  ),
});
