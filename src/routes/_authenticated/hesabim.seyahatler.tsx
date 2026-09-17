import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PlaceholderSection } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/hesabim/seyahatler")({
  component: TripsPage,
});

function TripsPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Seyahatlerim</h1>
      <div className="mt-6">
        <PlaceholderSection
          title="Seyahat modeli hazır"
          description="Bir seyahat birden çok servis satın alımını gruplar."
          items={["Seyahat başlığı ve tarihleri", "Destinasyon", "eSIM", "Lounge"]}
        />
      </div>
    </AppShell>
  );
}
