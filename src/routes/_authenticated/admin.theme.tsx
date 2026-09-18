import { createFileRoute } from "@tanstack/react-router";
import { Palette } from "lucide-react";
import { AdminSectionPage, adminHead } from "@/components/admin/AdminSectionPage";
export const Route = createFileRoute("/_authenticated/admin/theme")({ head: () => adminHead("Tema", "Marka ve görsel tema yönetimi."), component: () => <AdminSectionPage title="Tema" icon={Palette} description="Marka, renk, tipografi, düğme, köşe ve gölge ayarları yalnızca görsel kontrollerle yönetilecek; ham stil değerleri gösterilmez." state="Tema düzenleme bağlantısı yapılandırılmadı." /> });