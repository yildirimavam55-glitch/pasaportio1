import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy account URL — kept so older links keep working. */
export const Route = createFileRoute("/_authenticated/hesabim/")({
  beforeLoad: () => {
    throw redirect({ to: "/account", replace: true });
  },
  component: () => null,
});
