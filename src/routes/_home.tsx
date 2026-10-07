import { createFileRoute, Outlet } from "@tanstack/react-router";
import { EsimHomePage, destinationPricesQuery } from "@/components/design-v2/pages/EsimHomePage";
import { v2PageQuery } from "@/components/design-v2/V2Sections";

/**
 * Shared parent of every locale homepage (/, /tr, /de, /en, /$locale). Children only set
 * locale + SEO head, so switching language keeps the page and its media mounted while
 * text updates through i18n state.
 */
export const Route = createFileRoute("/_home")({
  // Layout + Popular Countries prices load in parallel so the first viewport is complete;
  // a price failure falls back to the client request instead of failing the page.
  loader: async ({ context }) => {
    const [page] = await Promise.all([
      context.queryClient.ensureQueryData(v2PageQuery("esim")),
      context.queryClient.ensureQueryData(destinationPricesQuery).catch(() => null),
    ]);
    return page;
  },
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
