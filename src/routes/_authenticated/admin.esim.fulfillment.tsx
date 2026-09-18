import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/AdminGate";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { OperationsView } from "@/components/admin/OperationsView";

export const Route = createFileRoute("/_authenticated/admin/esim/fulfillment")({
  head: () => adminHead("eSIM teslimat", "eSIM sağlama ve teslimat operasyonu."),
  component: () => <AdminGate title="eSIM teslimat"><OperationsView service="ESIM" /></AdminGate>,
});
