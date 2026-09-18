import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { AdminSectionPage, adminHead } from "@/components/admin/AdminSectionPage";
export const Route = createFileRoute("/_authenticated/admin/audit")({ head: () => adminHead("Denetim kaydı", "Yönetici değişiklik geçmişi."), component: () => <AdminSectionPage title="Denetim kaydı" icon={ShieldCheck} description="Fiyat, yayın, rol, bayrak ve provider değişiklikleri gizli bilgiler olmadan izlenir." state="Henüz denetim kaydı yok." /> });