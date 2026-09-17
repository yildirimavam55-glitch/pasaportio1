import { createFileRoute } from "@tanstack/react-router";

import { AdminGate } from "@/components/AdminGate";
import { PlaceholderSection } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: () => (
    <AdminGate title="Müşteriler">
      <PlaceholderSection
        title="Müşteri ve yolcu modeli"
        description="Müşteri ile yolcu ayrı kavramlardır; bir müşteri birden çok yolcu için satın alabilir."
        items={["Profil", "Roller", "Yolcular", "Seyahatler"]}
      />
    </AdminGate>
  ),
});
