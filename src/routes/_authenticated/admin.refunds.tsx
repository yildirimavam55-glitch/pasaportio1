import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { getAdminFinance } from "@/lib/admin-control.functions";
export const Route=createFileRoute("/_authenticated/admin/refunds")({head:()=>adminHead("İadeler","İade talebi ve durum takibi."),component:Refunds});
function Refunds(){const q=useQuery({queryKey:["admin-finance"],queryFn:()=>getAdminFinance()});return <AdminGate title="İadeler">{q.isPending?<AdminLoading/>:q.error?<AdminError error={q.error}/>:<AdminPanel title="İade talepleri">{!q.data?.refunds.length?<EmptyState title="Henüz iade talebi yok."/>:<ul className="grid gap-2">{q.data.refunds.map((r:any)=><li key={r.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3"><StatusBadge value={r.status}/><strong className="text-sm">{r.order_id}</strong><span className="text-sm">{r.amount==null?"Tutar bekleniyor":`${Number(r.amount).toFixed(2)} ${r.currency}`}</span><span className="ml-auto text-xs text-muted-foreground">{r.reason??"Neden belirtilmedi"}</span></li>)}</ul>}</AdminPanel>}</AdminGate>}