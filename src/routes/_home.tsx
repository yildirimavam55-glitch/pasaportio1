import { createFileRoute, Outlet } from "@tanstack/react-router";
import { EsimHomePage } from "@/components/design-v2/pages/EsimHomePage";
import { v2PageQuery } from "@/components/design-v2/V2Sections";

/**
 * Shared parent of every locale homepage (/, /tr, /de, /en, /$locale). Children only set
 * locale + SEO head, so switching language keeps the page and its media mounted while
 * text updates through i18n state.
 */
export const Route = createFileRoute("/_home")({
  loader: ({ context }) => context.queryClient.ensureQueryData(v2PageQuery("esim")),
  component: HomeLayout,
});

function HomeLayout() {
  return (
    <>
      <EsimHomePage />
      <Outlet />
    </>
  );
}
