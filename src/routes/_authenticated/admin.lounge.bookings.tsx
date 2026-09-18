import { createFileRoute } from "@tanstack/react-router";
import { AdminGate } from "@/components/AdminGate";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { OperationsView } from "@/components/admin/OperationsView";

export const Route = createFileRoute("/_authenticated/admin/lounge/bookings")({
  head: () => adminHead("Lounge rezervasyonları", "Lounge rezervasyon ve voucher operasyonu."),
  component: () => <AdminGate title="Lounge rezervasyonları"><OperationsView service="LOUNGE" /></AdminGate>,
});
