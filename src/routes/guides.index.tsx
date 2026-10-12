import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy English hub → English guide hub (overlay locales read English content) (single permanent redirect). */
export const Route = createFileRoute("/guides/")({
  beforeLoad: () => {
    throw redirect({ href: "/en/guides", statusCode: 301 });
  },
});
