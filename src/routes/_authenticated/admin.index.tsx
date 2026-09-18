import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, Boxes, CalendarDays, CircleDollarSign, ClipboardList, Plane, RadioTower, Users } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { AdminError, AdminLoading, AdminPanel, AdminTable, EmptyState, Metric, StatusBadge } from "@/components/admin/AdminUi";
import { adminHead } from "@/components/admin/AdminSectionPage";
import { Button } from "@/components/ui/button";
import { getBusinessDashboard } from "@/lib/admin-analytics.functions";
import { resolveRange, type DateRangeKey } from "@/domain/analytics/dashboard";

type ServiceContext = "all" | "esim" | "lounge";
export const Route = createFileRoute("/_authenticated/admin/")({
  validateSearch: (search: Record<string, unknown>): { service?: ServiceContext } => search["service"] === "esim" || search["service"] === "lounge" ? { service: search["service"] } : {},
  head: () => adminHead("İş kontrol merkezi", "Genel, eSIM ve Lounge işletme performansı."),
  component: Dashboard,
});

const ranges: Array<{ key: DateRangeKey; label: string }> = [
  { key: "today", label: "Bugün" }, { key: "yesterday", label: "Dün" }, { key: "last7", label: "Son 7 gün" },
  { key: "last30", label: "Son 30 gün" }, { key: "thisMonth", label: "Bu ay" }, { key: "custom", label: "Özel" },
];
const labels: Record<string,string> = { PAID_NOT_FULFILLED:"Ödendi, teslim edilmedi", PROVIDER_ERROR:"Provider hatası", PROVISIONING_DELAYED:"Provisioning gecikti", WEBHOOK_FAILED:"Webhook başarısız", QR_DELIVERY_FAILED:"QR teslimi başarısız", VOUCHER_DELIVERY_FAILED:"Voucher teslimi başarısız", CATALOGUE_SYNC_FAILED:"Katalog senkronu başarısız", CATALOGUE_STALE:"Katalog güncel değil", LOW_PROVIDER_BALANCE:"Provider bakiyesi düşük", MARGIN_BELOW_MINIMUM:"Marj minimum altında", REFUND_REQUEST:"İade talebi" };
const serviceAlerts = { all: Object.keys(labels), esim: ["PAID_NOT_FULFILLED","PROVIDER_ERROR","PROVISIONING_DELAYED","WEBHOOK_FAILED","QR_DELIVERY_FAILED","CATALOGUE_SYNC_FAILED","CATALOGUE_STALE","LOW_PROVIDER_BALANCE","MARGIN_BELOW_MINIMUM","REFUND_REQUEST"], lounge: ["PAID_NOT_FULFILLED","PROVIDER_ERROR","WEBHOOK_FAILED","VOUCHER_DELIVERY_FAILED","CATALOGUE_SYNC_FAILED","CATALOGUE_STALE","LOW_PROVIDER_BALANCE","MARGIN_BELOW_MINIMUM","REFUND_REQUEST"] };
const field = "admin-field";
const money = (value:number,currency="EUR") => `${value.toFixed(2)} ${currency}`;
const pct = (value:number|null|undefined) => value==null?"—":`${(value*100).toFixed(1)}%`;

function Dashboard(){
  const navigate=Route.useNavigate(); const {service: searchService}=Route.useSearch(); const service=searchService??"all";
  const [rangeKey,setRangeKey]=useState<DateRangeKey>("last30"); const preset=useMemo(()=>resolveRange(rangeKey,new Date()),[rangeKey]); const [custom,setCustom]=useState(preset); const range=rangeKey==="custom"?custom:preset;
  const [compare,setCompare]=useState(true); const [metric,setMetric]=useState<"revenue"|"grossContribution"|"orders">("revenue");
  const serviceType=service==="esim"?"ESIM":service==="lounge"?"LOUNGE":"ALL";
  const filters={from:range.from,to:range.to,serviceType:serviceType as "ALL"|"ESIM"|"LOUNGE",compare};
  const q=useQuery({queryKey:["business-dashboard",filters],queryFn:()=>getBusinessDashboard({data:filters})}); const data=q.data; const k=data?.kpis; const currency=k?.currency??"EUR";
  const prev=data?.previousKpis; const delta=(now:number,old:number|undefined)=>!compare||!old?"Karşılaştırma verisi yok":`${now>=old?"+":""}${(((now-old)/old)*100).toFixed(1)}% önceki dönem`;
  const margin=k&&k.grossRevenue>0?k.grossContribution/k.grossRevenue:null;
  const serviceRow=data?.byService.find((row:any)=>row.serviceType===serviceType);
  const title=service==="esim"?"eSIM performansı":service==="lounge"?"Lounge performansı":"Genel işletme görünümü";
  const chart=(data?.series??[]).map((point:any,index:number)=>({...point,previous:data?.previousSeries?.[index]?.[metric]??0}));
  const cards=service==="all"?[
    ["Ciro",k?money(k.grossRevenue,currency):"—",k&&prev?delta(k.grossRevenue,prev.grossRevenue):undefined],["Sipariş",k?.orders??"—",k&&prev?delta(k.orders,prev.orders):undefined],["Provider maliyeti",k?money(k.providerCost,currency):"—"],["Brüt kâr",k?money(k.grossContribution,currency):"—"],["Brüt marj",pct(margin)],["Ortalama sepet",k?money(k.averageOrderValue,currency):"—"],["Dönüşüm",pct(k?.conversionRate)],["Tekrar satın alma",pct(k?.repeatPurchaseRate)]
  ]:service==="esim"?[
    ["eSIM ciro",money(serviceRow?.revenue??0,currency)],["eSIM sipariş",serviceRow?.orders??0],["Satılan eSIM",k?.servicesSold??0],["Provider maliyeti",money(serviceRow?.providerCost??0,currency)],["Brüt kâr",money(serviceRow?.grossContribution??0,currency)],["Brüt marj",pct(serviceRow&&serviceRow.revenue>0?serviceRow.grossContribution/serviceRow.revenue:null)],["Provisioning başarısı","—","Güvenilir durum verisi bekleniyor"],["QR teslim başarısı","—","Teslimat olayı bekleniyor"]
  ]:[
    ["Lounge ciro",money(serviceRow?.revenue??0,currency)],["Rezervasyon",serviceRow?.orders??0],["Misafir",data?.lounge.averageTravelers==null?"—":data.lounge.averageTravelers.toFixed(1)],["Provider maliyeti",money(serviceRow?.providerCost??0,currency)],["Brüt kâr",money(serviceRow?.grossContribution??0,currency)],["Brüt marj",pct(serviceRow&&serviceRow.revenue>0?serviceRow.grossContribution/serviceRow.revenue:null)],["Rezervasyon başarısı","—","Güvenilir durum verisi bekleniyor"],["Voucher başarısı","—","Teslimat olayı bekleniyor"]
  ];
  return <AdminGate title={title}><div className="grid min-w-0 gap-4">
    <section className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="inline-flex w-fit rounded-lg border border-border bg-card p-1 shadow-card" aria-label="Servis bağlamı">{(["all","esim","lounge"] as const).map(value=><Button key={value} size="sm" variant={service===value?"default":"ghost"} onClick={()=>navigate({search:{service:value}})} className="min-w-24">{value==="all"?"GENEL":value==="esim"?<><RadioTower/>eSIM</>:<><Plane/>LOUNGE</>}</Button>)}</div>
      <div className="flex flex-wrap gap-1.5">{ranges.map(item=><Button key={item.key} size="sm" variant={rangeKey===item.key?"secondary":"outline"} onClick={()=>setRangeKey(item.key)}>{item.label}</Button>)}<select className={field} aria-label="Raporlama para birimi"><option>EUR</option></select></div>
    </section>
    {rangeKey==="custom"&&<section className="admin-card flex flex-wrap items-center gap-2 p-3"><CalendarDays className="size-4 text-primary"/><input type="date" className={field} value={custom.from} onChange={e=>setCustom({...custom,from:e.target.value})}/><span>—</span><input type="date" className={field} value={custom.to} onChange={e=>setCustom({...custom,to:e.target.value})}/></section>}
    <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={compare} onChange={e=>setCompare(e.target.checked)}/>Önceki dönemle karşılaştır</label>
    {q.isPending?<AdminLoading/>:q.error?<AdminError error={q.error}/>:<>
      {(!k||k.orders===0)&&<EmptyState title="Henüz satış verisi yok." detail="Gerçek siparişler oluştuğunda bu görünüm otomatik güncellenir."/>}
      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label,value,detail],i)=><Metric key={String(label)} label={String(label)} value={value as string|number} detail={detail as string|undefined} tone={i===3||i===4?"profit":service==="esim"?"esim":service==="lounge"?"lounge":"default"}/>)}</section>
      <AdminPanel title="Performans" action={<div className="flex gap-1">{(["revenue","grossContribution","orders"] as const).map(v=><Button key={v} size="sm" variant={metric===v?"secondary":"ghost"} onClick={()=>setMetric(v)}>{v==="revenue"?"Ciro":v==="grossContribution"?"Brüt kâr":"Sipariş"}</Button>)}</div>}>
        <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><CartesianGrid strokeDasharray="3 3" opacity={.2}/><XAxis dataKey="date" tick={{fontSize:10}} minTickGap={22}/><YAxis tick={{fontSize:10}} width={44}/><Tooltip/><Area type="monotone" dataKey={metric} name={metric==="revenue"?"Ciro":metric==="grossContribution"?"Brüt kâr":"Sipariş"} stroke="var(--color-primary)" fill="var(--color-primary-soft)"/>{compare&&<Area type="monotone" dataKey="previous" name="Önceki dönem" stroke="var(--color-muted-foreground)" fill="transparent"/>}</AreaChart></ResponsiveContainer></div>
      </AdminPanel>
      {service==="all"&&<div className="grid gap-4 xl:grid-cols-2"><AdminPanel title="Servis performansı"><div className="grid gap-3 sm:grid-cols-2">{data?.byService.map((row:any)=><div key={row.serviceType} className={`rounded-md border p-3 ${row.serviceType==="ESIM"?"border-success/30 bg-primary-soft/35":"border-warning/35 bg-sand-soft/55"}`}><div className="flex items-center gap-2 font-semibold">{row.serviceType==="ESIM"?<RadioTower className="size-4 text-success"/>:<Plane className="size-4 text-warning"/>}{row.serviceType==="ESIM"?"eSIM":"Lounge"}</div><dl className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><dt className="text-muted-foreground">Ciro</dt><dd className="font-bold">{money(row.revenue,currency)}</dd></div><div><dt className="text-muted-foreground">Sipariş</dt><dd className="font-bold">{row.orders}</dd></div><div><dt className="text-muted-foreground">Brüt kâr</dt><dd className="font-bold">{money(row.grossContribution,currency)}</dd></div></dl></div>)}</div></AdminPanel><SourcePanel data={data} currency={currency}/></div>}
      {service==="esim"&&<div className="grid gap-4 xl:grid-cols-2"><Insight title="eSIM satış içgörüleri" blocks={[["Destinasyonlar",data?.esim.topDestinations],["Bölgeler",data?.esim.topRegions],["Önerilen GB",data?.esim.topRecommendedGb],["Rota presetleri",data?.routes.presets]]}/><Funnel data={data}/><Insight title="Cihaz uyumluluğu" blocks={[["Kontrol açılışı",[{label:"Toplam",count:data?.esim.compatibilityChecks??0}]]]}/><TopProducts data={data} currency={currency}/></div>}
      {service==="lounge"&&<div className="grid gap-4 xl:grid-cols-2"><Insight title="Lounge içgörüleri" blocks={[["Havalimanları",data?.lounge.topAirports],["Lounge’lar",data?.lounge.topLounges],["Kalkış / Aktarma / Varış",data?.lounge.situations]]}/><Funnel data={data}/><TopProducts data={data} currency={currency}/><AdminPanel title="Rezervasyon özeti"><p className="text-sm text-muted-foreground">Ortalama misafir: <strong className="text-foreground">{data?.lounge.averageTravelers==null?"—":data.lounge.averageTravelers.toFixed(1)}</strong></p></AdminPanel></div>}
      <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]"><AdminPanel title="Dikkat Gerektirenler" action={<Link to="/admin/alerts" className="text-xs font-semibold text-primary">Tümünü gör</Link>}><div className="grid gap-2 sm:grid-cols-2">{serviceAlerts[service].map(key=>{const count=data?.alertCounts?.[key]??0;return <div key={key} className="flex items-center gap-2 rounded-md border border-border p-2.5"><AlertTriangle className={`size-4 ${count?"text-destructive":"text-muted-foreground"}`}/><span className="min-w-0 flex-1 text-xs">{labels[key]}</span><StatusBadge value={count?`${count} AÇIK`:"TEMİZ"}/></div>})}</div></AdminPanel><QuickActions service={service}/></div>
    </>}
  </div></AdminGate>;
}
function Insight({title,blocks}:{title:string;blocks:Array<[string,Array<{label:string;count:number}>|undefined]>}){return <AdminPanel title={title}><div className="grid gap-3 sm:grid-cols-2">{blocks.map(([name,rows])=><div key={name} className="rounded-md border border-border p-3"><strong className="text-xs">{name}</strong>{!rows?.length?<p className="mt-2 text-xs text-muted-foreground">Veri yok.</p>:<ul className="mt-2 grid gap-1 text-xs">{rows.slice(0,5).map(row=><li key={row.label} className="flex justify-between"><span className="truncate">{row.label}</span><b>{row.count}</b></li>)}</ul>}</div>)}</div></AdminPanel>}
function Funnel({data}:{data:any}){return <AdminPanel title="Finder dönüşüm hunisi">{!data?.funnel?.some((s:any)=>s.count)?<EmptyState title="Henüz Finder etkinliği yok."/>:<AdminTable head={["Adım","Sayı","Dönüşüm","Kayıp"]}>{data.funnel.map((s:any)=><tr key={s.key}><td>{s.label}</td><td>{s.count}</td><td>{pct(s.conversionRate)}</td><td>{pct(s.dropOffRate)}</td></tr>)}</AdminTable>}</AdminPanel>}
function TopProducts({data,currency}:{data:any;currency:string}){return <AdminPanel title="En çok satanlar">{!data?.topProducts?.length?<EmptyState title="Henüz satış yok."/>:<AdminTable head={["Ürün","Sipariş","Ciro","Brüt kâr"]}>{data.topProducts.map((p:any)=><tr key={p.product}><td>{p.product}</td><td>{p.orders}</td><td>{money(p.revenue,currency)}</td><td>{money(p.grossContribution,currency)}</td></tr>)}</AdminTable>}</AdminPanel>}
function SourcePanel({data,currency}:{data:any;currency:string}){return <AdminPanel title="Trafik kaynağı">{!data?.bySource?.length?<EmptyState title="Henüz trafik verisi yok."/>:<AdminTable head={["Kaynak","Ziyaret","Satın alma","Ciro"]}>{data.bySource.map((r:any)=><tr key={r.source}><td>{r.source}</td><td>{r.visits}</td><td>{r.purchases}</td><td>{money(r.revenue,currency)}</td></tr>)}</AdminTable>}</AdminPanel>}
function QuickActions({service}:{service:ServiceContext}){const links=service==="esim"?[["Paketleri yönet","/admin/products",Boxes],["eSIM teslimat","/admin/esim/fulfillment",RadioTower]]:service==="lounge"?[["Lounge’ları yönet","/admin/products",Boxes],["Rezervasyonlar","/admin/lounge/bookings",Plane]]:[["Siparişler","/admin/orders",ClipboardList],["Müşteriler","/admin/customers",Users],["Finans","/admin/finance",CircleDollarSign]];return <AdminPanel title="Hızlı işlemler"><div className="grid gap-2">{links.map(([label,to,Icon]:any)=><Link key={label} to={to} className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold"><Icon className="size-4 text-primary"/>{label}<ArrowRight className="ml-auto size-4"/></Link>)}</div></AdminPanel>}