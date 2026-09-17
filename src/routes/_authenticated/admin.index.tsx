import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminGate } from "@/components/AdminGate";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

const sections = [
  { to: "/admin/orders", label: "Siparişler" },
  { to: "/admin/customers", label: "Müşteriler" },
  { to: "/admin/products", label: "Ürünler" },
  { to: "/admin/providers", label: "Sağlayıcılar" },
] as const;

function AdminHome() {
  return (
    <AdminGate title="Yönetim">
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            className="rounded-xl border border-border p-4 text-sm hover:bg-accent"
          >
            {section.label}
          </Link>
        ))}
      </div>
    </AdminGate>
  );
}
