import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Armchair, Car, FileText, LifeBuoy, Plus, QrCode, Signal, Users } from "lucide-react";
import { CLink as Link } from "@/components/design-v2/v2-context";
import { AccountLayout } from "@/components/account/AccountLayout";
import { CustomerEsimCard } from "@/components/account/CustomerEsimCard";
import { PURCHASE_COPY } from "@/components/account/purchases-copy";
import { formatDate } from "@/components/account/copy";
import { useAccountDemo } from "@/components/account/pages/EsimsPage";
import { getCountryPhoto } from "@/components/travel/countryPhotos";
import { CountryFlag } from "@/components/travel/CountryFlag";
import { Button } from "@/components/ui/button";
import { createAccountDemo } from "@/domain/esim/account-demo";
import { getCountryByIso } from "@/domain/geo/countries";
import { useI18n } from "@/i18n";
import { getCustomerAccount } from "@/lib/customer-account.functions";

type Filter = "all" | "esim" | "lounge" | "vignette";

/** Preview-only fixtures (never written, never real codes). Real Lounge/Vignette orders do not exist yet. */
function demoLounge(now: Date) {
  return { id: "demo-lounge", iso: "TR", name: "IGA Lounge", airport: "İstanbul (IST) · International", passengers: 1, validUntil: new Date(now.getTime() + 60 * 86_400_000).toISOString(), order: "DEMO-L-0001" };
}
function demoVignette(now: Date) {
  return { id: "demo-vignette", iso: "AT", product: "10-day vignette", start: new Date(now.getTime() + 20 * 86_400_000).toISOString(), end: new Date(now.getTime() + 29 * 86_400_000).toISOString(), order: "DEMO-V-0001" };
}

function DemoBadge() {
  return <span className="rounded-full border border-warning/40 bg-card px-2 py-0.5 text-[11px] font-bold text-warning">DEMO</span>;
}

function Photo({ iso, className }: { iso: string; className: string }) {
  const photo = getCountryPhoto(iso);
  return photo ? <img src={photo.cardImage} alt="" loading="lazy" className={`object-cover ${className}`} /> : <div className={`bg-secondary ${className}`} />;
}

function ServiceCard({ iso, kind, title, subtitle, to, id, demo }: { iso: string; kind: "esim" | "lounge" | "vignette"; title: string; subtitle: string; to: string; id?: string; demo?: boolean }) {
  const { locale } = useI18n();
  const c = PURCHASE_COPY[locale];
  const Icon = kind === "esim" ? Signal : kind === "lounge" ? Armchair : Car;
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="relative">
        <Photo iso={iso} className="h-36 w-full" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-1 text-xs font-semibold"><Icon className="size-3.5" />{kind === "esim" ? "eSIM" : kind === "lounge" ? "Lounge" : "Vignette"}</span>
        {demo && <span className="absolute right-3 top-3"><DemoBadge /></span>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-base font-bold">{title}</h3>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><CountryFlag iso={iso} className="h-3.5 w-5" />{subtitle}</p>
        <Button asChild className="mt-4 min-h-11 w-full">
          <Link to={to} {...(id ? { params: { id } } : {})} {...(demo ? { search: { demo: 1 } } : {})}>{c.view}<ArrowRight className="size-4" /></Link>
        </Button>
      </div>
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-secondary/45 px-5 py-8 text-center text-sm text-muted-foreground">{text}</div>;
}

export function PurchasesPage() {
  const { locale } = useI18n();
  const c = PURCHASE_COPY[locale];
  const demo = useAccountDemo();
  const [filter, setFilter] = useState<Filter>("all");
  const [now] = useState(() => new Date());
  const account = useQuery({ queryKey: ["customer-account"], queryFn: () => getCustomerAccount(), staleTime: 60_000, refetchOnWindowFocus: false });
  const esims = account.data?.esims ?? [];
  const demoEsims = useMemo(() => (demo ? createAccountDemo(now) : []), [demo, now]);
  const lounges = demo ? [demoLounge(now)] : [];
  const vignettes = demo ? [demoVignette(now)] : [];
  const counts = { all: esims.length + demoEsims.length + lounges.length + vignettes.length, esim: esims.length + demoEsims.length, lounge: lounges.length, vignette: vignettes.length };
  const show = (k: Filter) => filter === "all" || filter === k;

  return (
    <AccountLayout
      active="purchases"
      title={c.nav.purchases}
      lead={c.lead}
      actions={<Button asChild variant="cta" className="min-h-11"><Link to="/esim"><Plus className="size-4" />{c.newProduct}</Link></Button>}
    >
      {demo && <p className="mb-3 text-xs text-muted-foreground">{c.demoNote}</p>}
      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={c.nav.purchases}>
        {(["all", "esim", "lounge", "vignette"] as const).map((k) => (
          <Button key={k} variant={filter === k ? "default" : "outline"} className="min-h-10 shrink-0 rounded-full px-4 text-sm" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {k === "all" ? c.all : k === "esim" ? "eSIM" : k === "lounge" ? "Lounge" : "Vignette"} ({counts[k]})
          </Button>
        ))}
      </div>
      {filter === "all" && counts.all === 0 && !account.isLoading && <Empty text={c.emptyAll} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {show("esim") && esims.map((e) => <CustomerEsimCard key={e.id} esim={e} locale={locale} />)}
        {show("esim") && demoEsims.map((e) => <ServiceCard key={e.id} kind="esim" iso={e.iso} demo title={`${getCountryByIso(e.iso)?.name[locale] ?? e.iso} eSIM · ${e.total} GB`} subtitle={getCountryByIso(e.iso)?.name[locale] ?? e.iso} to="/account/esims" />)}
        {show("lounge") && lounges.map((l) => <ServiceCard key={l.id} kind="lounge" iso={l.iso} demo id={l.id} title={l.name} subtitle={l.airport} to="/account/lounge/$id" />)}
        {show("vignette") && vignettes.map((v) => <ServiceCard key={v.id} kind="vignette" iso={v.iso} demo id={v.id} title={`${getCountryByIso(v.iso)?.name[locale] ?? v.iso} Vignette`} subtitle={v.product} to="/account/vignette/$id" />)}
      </div>
      {filter === "esim" && counts.esim === 0 && !account.isLoading && <Empty text={c.emptyAll} />}
      {filter === "lounge" && !lounges.length && <Empty text={c.emptyLounge} />}
      {filter === "vignette" && !vignettes.length && <Empty text={c.emptyVignette} />}
    </AccountLayout>
  );
}

export function LoungeListPage() {
  const { locale } = useI18n();
  const c = PURCHASE_COPY[locale];
  const demo = useAccountDemo();
  const [now] = useState(() => new Date());
  const l = demo ? demoLounge(now) : null;
  return (
    <AccountLayout active="lounge" title={c.nav.lounge}>
      {l ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><ServiceCard kind="lounge" iso={l.iso} demo id={l.id} title={l.name} subtitle={l.airport} to="/account/lounge/$id" /></div> : <Empty text={c.emptyLounge} />}
    </AccountLayout>
  );
}

export function VignetteListPage() {
  const { locale } = useI18n();
  const c = PURCHASE_COPY[locale];
  const demo = useAccountDemo();
  const [now] = useState(() => new Date());
  const v = demo ? demoVignette(now) : null;
  return (
    <AccountLayout active="vignette" title={c.nav.vignette}>
      {v ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><ServiceCard kind="vignette" iso={v.iso} demo id={v.id} title={`${getCountryByIso(v.iso)?.name[locale] ?? v.iso} Vignette`} subtitle={v.product} to="/account/vignette/$id" /></div> : <Empty text={c.emptyVignette} />}
    </AccountLayout>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
      <Icon className="size-5 shrink-0 text-primary" />
      <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="truncate text-sm font-semibold">{value}</p></div>
    </div>
  );
}

function DetailShell({ active, title, iso, heading, sub, order, children }: { active: "lounge" | "vignette"; title: string; iso: string; heading: string; sub: string; order: string; children: React.ReactNode }) {
  const { locale } = useI18n();
  const c = PURCHASE_COPY[locale];
  return (
    <AccountLayout active={active} title={title} actions={<DemoBadge />}>
      <p className="mb-3 text-xs text-muted-foreground">{c.demoNote}</p>
      <section className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Photo iso={iso} className="h-24 w-32 shrink-0 rounded-xl sm:h-28 sm:w-40" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold">{heading}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><CountryFlag iso={iso} className="h-3.5 w-5" />{getCountryByIso(iso)?.name[locale] ?? iso}</p>
          <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
          <p className="mt-2 text-xs text-muted-foreground">{c.order} #{order}</p>
        </div>
      </section>
      <div className="mt-4 grid gap-4">{children}</div>
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Link to="/account/support" className="flex min-h-11 items-center gap-3 text-sm font-semibold"><LifeBuoy className="size-5 text-primary" />{c.support}<ArrowRight className="ml-auto size-4" /></Link>
      </section>
    </AccountLayout>
  );
}

function NotFound({ active }: { active: "lounge" | "vignette" }) {
  const { locale } = useI18n();
  const c = PURCHASE_COPY[locale];
  return <AccountLayout active={active} title={active === "lounge" ? c.nav.lounge : c.nav.vignette}><Empty text={c.notFound} /></AccountLayout>;
}

export function LoungeDetailPage({ id }: { id: string }) {
  const { locale } = useI18n();
  const c = PURCHASE_COPY[locale];
  const demo = useAccountDemo();
  const [now] = useState(() => new Date());
  if (!demo || id !== "demo-lounge") return <NotFound active="lounge" />;
  const l = demoLounge(now);
  return (
    <DetailShell active="lounge" title={c.nav.lounge} iso={l.iso} heading={l.name} sub={l.airport} order={l.order}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Fact icon={Users} label={c.passengers} value={String(l.passengers)} />
        <Fact icon={FileText} label={c.validity} value={formatDate(l.validUntil, locale)} />
        <Fact icon={Armchair} label={c.usage} value={c.readyToUse} />
      </div>
      <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-[auto_1fr]">
        <div className="mx-auto grid size-28 place-items-center rounded-xl border border-dashed border-border bg-secondary"><QrCode className="size-10 text-muted-foreground" /><DemoBadge /></div>
        <dl className="grid gap-2 text-sm">
          <div><dt className="text-xs text-muted-foreground">{c.voucher}</dt><dd className="font-semibold">DEMO</dd></div>
          <div><dt className="text-xs text-muted-foreground">{c.airport}</dt><dd className="font-semibold">{l.airport}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{c.loungeName}</dt><dd className="font-semibold">{l.name}</dd></div>
        </dl>
      </section>
    </DetailShell>
  );
}

export function VignetteDetailPage({ id }: { id: string }) {
  const { locale } = useI18n();
  const c = PURCHASE_COPY[locale];
  const demo = useAccountDemo();
  const [now] = useState(() => new Date());
  if (!demo || id !== "demo-vignette") return <NotFound active="vignette" />;
  const v = demoVignette(now);
  return (
    <DetailShell active="vignette" title={c.nav.vignette} iso={v.iso} heading={`${getCountryByIso(v.iso)?.name[locale] ?? v.iso} Vignette`} sub={v.product} order={v.order}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Fact icon={Car} label={c.plate} value={c.plateMissing} />
        <Fact icon={FileText} label={`${c.start} – ${c.end}`} value={`${formatDate(v.start, locale)} – ${formatDate(v.end, locale)}`} />
        <Fact icon={Armchair} label={c.status} value={c.readyToUse} />
      </div>
      <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-muted-foreground">{c.country}</dt><dd className="font-semibold">{getCountryByIso(v.iso)?.name[locale] ?? v.iso}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{c.product}</dt><dd className="font-semibold">{v.product}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{c.document}</dt><dd className="font-semibold">DEMO</dd></div>
        </dl>
      </section>
    </DetailShell>
  );
}
