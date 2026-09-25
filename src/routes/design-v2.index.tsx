import { createFileRoute, redirect } from "@tanstack/react-router";

// Former V2 preview URL — V2 is now the primary storefront on the public URLs.
export const Route = createFileRoute("/design-v2/")({
  beforeLoad: () => { throw redirect({ href: "/esim", statusCode: 301 }); },
});
