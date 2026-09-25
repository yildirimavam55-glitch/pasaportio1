import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired V1 page — permanently redirected to the primary V2 storefront. V1 kept at /legacy-v1/lounge/secenekler.
export const Route = createFileRoute("/lounge/secenekler")({
  beforeLoad: () => { throw redirect({ to: "/lounge", statusCode: 301 }); },
});
