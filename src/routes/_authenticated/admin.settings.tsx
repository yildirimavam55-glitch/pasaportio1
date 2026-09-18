import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { AdminSectionPage, adminHead } from "@/components/admin/AdminSectionPage";
export const Route = createFileRoute("/_authenticated/admin/settings")({ head: () => adminHead("Ayarlar", "Yönetim sistemi ayarları."), component: () => <AdminSectionPage title="Ayarlar" icon={Settings} description="Yönetim hesabı, sistem tercihleri ve güvenli yapılandırma durumu burada görünür." /> });