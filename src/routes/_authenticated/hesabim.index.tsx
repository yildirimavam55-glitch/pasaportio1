import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell, PlaceholderSection } from "@/components/AppShell";
import { getMyAccess } from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/hesabim/")({
  component: AccountPage,
});

function AccountPage() {
  const { data: access } = useQuery({ queryKey: ["access"], queryFn: () => getMyAccess() });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">Hesabım</h1>
      <div className="mt-6 grid gap-4">
        <Link
          to="/hesabim/seyahatler"
          className="rounded-xl border border-border p-4 text-sm hover:bg-accent"
        >
          Seyahatlerim
        </Link>
        {access?.isAdmin && (
          <Link to="/admin" className="rounded-xl border border-border p-4 text-sm hover:bg-accent">
            Yönetim paneli
          </Link>
        )}
        <PlaceholderSection
          title="Servislerim"
          description="eSIM ve lounge satın alımları sonraki fazlarda burada listelenecek."
          items={["eSIM", "Lounge"]}
        />
      </div>
    </AppShell>
  );
}
