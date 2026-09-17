import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import { getMyAccess } from "@/lib/platform.functions";

/**
 * UI-side admin gate. The real boundary is server-side: every admin table is
 * protected by RLS `is_admin()` and admin server functions re-check the role.
 */
export function AdminGate({ title, children }: { title: string; children: ReactNode }) {
  const { data, isPending } = useQuery({ queryKey: ["access"], queryFn: () => getMyAccess() });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6">
        {isPending && <p className="text-sm text-muted-foreground">Yükleniyor…</p>}
        {!isPending && !data?.isAdmin && (
          <p className="text-sm text-muted-foreground">
            Bu alan için yönetici yetkisi gerekiyor. Yetki yalnızca açıkça atanır.
          </p>
        )}
        {!isPending && data?.isAdmin && children}
      </div>
    </AppShell>
  );
}
