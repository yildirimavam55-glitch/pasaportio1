import { QueryClient, dehydrate, hydrate, type DehydratedState } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Loader-fetched queries (published storefront CMS, media URLs) travel with the SSR HTML,
    // so the hydrated render reuses the exact data — and image URLs — the server rendered.
    dehydrate: () => ({ queryClientState: JSON.stringify(dehydrate(queryClient)) }),
    hydrate: (dehydrated: { queryClientState: string }) => {
      hydrate(queryClient, JSON.parse(dehydrated.queryClientState) as DehydratedState);
    },
  });

  return router;
};
