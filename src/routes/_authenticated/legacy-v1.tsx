import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { V2Context } from "@/components/design-v2/v2-context";
import { getMyAccess } from "@/lib/platform.functions";

// LEGACY V1 storefront — rollback/debug only. Admin-only, noindex, never in sitemap or public navigation.
export const Route = createFileRoute("/_authenticated/legacy-v1")({
  head: () => ({
    meta: [
      { title: "Legacy V1 (admin)" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LegacyLayout,
});

function LegacyLayout() {
  const { data, isPending } = useQuery({ queryKey: ["access"], queryFn: () => getMyAccess() });
  if (isPending) return <main className="grid min-h-screen place-items-center text-sm text-muted-foreground">…</main>;
  if (!data?.isAdmin) return <main className="grid min-h-screen place-items-center p-6 text-center text-sm text-muted-foreground">Bu alan yalnızca yöneticiler içindir.</main>;
  return (
    <V2Context.Provider value={false}>
      <div className="bg-warning/20 px-3 py-1 text-center text-[11px] font-semibold">LEGACY V1 — yalnız geri dönüş/test için</div>
      <Outlet />
    </V2Context.Provider>
  );
}
