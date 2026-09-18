import { createFileRoute } from "@tanstack/react-router";
import { Flag } from "lucide-react";
import { AdminSectionPage, adminHead } from "@/components/admin/AdminSectionPage";
export const Route = createFileRoute("/_authenticated/admin/flags")({ head: () => adminHead("Özellik bayrakları", "Güvenli özellik görünürlüğü yönetimi."), component: () => <AdminSectionPage title="Özellik bayrakları" icon={Flag} description="Müşteri görünürlüğü ve operasyonel açma/kapama kontrolleri onay ve denetim kaydıyla yönetilir." /> });