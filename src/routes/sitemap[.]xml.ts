import { createFileRoute } from "@tanstack/react-router";

/** Serves /sitemap.xml; content comes from the single shared sitemap builder. */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { sitemapResponse } = await import("@/lib/sitemap-xml.server");
        return sitemapResponse();
      },
    },
  },
});
