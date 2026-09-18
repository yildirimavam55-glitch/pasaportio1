import type { LucideIcon } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { EmptyState } from "@/components/admin/AdminUi";

export function AdminSectionPage({ title, icon: Icon, description, state = "Henüz yapılandırılmadı." }: { title: string; icon: LucideIcon; description: string; state?: string }) {
  return <AdminGate title={title}><div className="admin-card p-5"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-petrol-soft text-primary"><Icon className="size-4" /></span><div><h2 className="font-display text-lg font-bold">{title}</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p></div></div><div className="mt-5"><EmptyState title={state} detail="Bu alan gerçek veri veya güvenli bir bağlantı oluştuğunda kullanılabilir; örnek veri gösterilmez." /></div></div></AdminGate>;
}

export function adminHead(title: string, description: string) {
  return { meta: [{ title: `${title} — Travel Platform Admin` }, { name: "description", content: description }, { property: "og:title", content: `${title} — Travel Platform Admin` }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
}