import { createFileRoute } from "@tanstack/react-router";
import { Image } from "lucide-react";
import { AdminSectionPage, adminHead } from "@/components/admin/AdminSectionPage";
export const Route = createFileRoute("/_authenticated/admin/media")({ head: () => adminHead("Medya", "eSIM ve Lounge medya yönetimi."), component: () => <AdminSectionPage title="Medya" icon={Image} description="Tüm servisler, eSIM ve Lounge için görsel varlıklar; kullanım yeri, masaüstü/mobil varyant ve alternatif metin bilgileriyle ayrılır." state="Henüz yönetilebilir medya kaydı yok." /> });