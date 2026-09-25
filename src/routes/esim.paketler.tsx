import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired V1 page — permanently redirected to the primary V2 storefront. V1 kept at /legacy-v1/esim/paketler.
export const Route = createFileRoute("/esim/paketler")({
  beforeLoad: () => { throw redirect({ to: "/esim", statusCode: 301 }); },
});
