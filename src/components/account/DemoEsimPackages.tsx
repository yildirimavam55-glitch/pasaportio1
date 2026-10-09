import { useState } from 'react';
import { AlertCircle, Bell, BookOpen, ChevronDown, ChevronUp, Link2, Pencil, Plus, QrCode, RotateCcw } from 'lucide-react';
import { CLink as Link } from '@/components/design-v2/v2-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { formatDate } from './copy';
import { ACCOUNT_DEMO_COPY, ACCOUNT_REFUND_MESSAGES } from './demo-copy';
import { createAccountDemo, demoRefund, demoUsage, type DemoEsim } from '@/domain/esim/account-demo';
import { remainingDays } from '@/domain/esim/customer-esim';
import { getCountryByIso, flagOf } from '@/domain/geo/countries';
import { useI18n } from '@/i18n';

export function DemoEsimPackages() {
  const { locale } = useI18n();
  const c = ACCOUNT_DEMO_COPY[locale];
  const [now] = useState(() => new Date());
  const [packages] = useState(() => createAccountDemo(now));
  const [expanded, setExpanded] = useState<string | null>(packages[0]?.id ?? null);
  const [filter, setFilter] = useState<'all' | 'active' | 'ready' | 'expired'>('all');
  const [action, setAction] = useState<{ id: string; label: string } | null>(null);
  const visible = packages.filter(p => filter === 'all' || (filter === 'active' && p.active) || (filter === 'ready' && !p.active));
  return <div data-account-demo className="mx-auto max-w-3xl">
    <p className="text-sm text-muted-foreground">{c.demo} · 3 eSIM · 2 {c.active.toLowerCase()} · 1 {c.ready.toLowerCase()}</p>
    <p className="mt-1 text-xs text-muted-foreground">{c.disclaimer}</p>
    <div className="my-4 flex flex-wrap gap-2" aria-label={c.title}>
      {(['all', 'active', 'ready', 'expired'] as const).map(key => <Button key={key} variant={filter === key ? 'default' : 'outline'} className="min-h-11 rounded-full px-3 text-xs sm:text-sm" aria-pressed={filter === key} onClick={() => { setFilter(key); }}>{c[key]} ({key === 'all' ? 3 : key === 'active' ? 2 : key === 'ready' ? 1 : 0})</Button>)}
    </div>
    <div className="grid gap-3">{visible.map(esim => <DemoPackageCard key={esim.id} esim={esim} now={now} open={expanded === esim.id} onToggle={() => setExpanded(expanded === esim.id ? null : esim.id)} onAction={label => setAction({ id: esim.id, label })} />)}</div>
    {!visible.length && <p className="py-8 text-center text-sm text-muted-foreground">{c.empty}</p>}
    <Button asChild variant="outline" className="mt-3 min-h-11 w-full"><Link to="/esim"><Plus className="size-5" />{c.newPackage}</Link></Button>
    <Sheet open={Boolean(action)} onOpenChange={open => { if (!open) setAction(null); }}>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-2xl">
        <SheetHeader><SheetTitle>{action?.label}</SheetTitle><SheetDescription>{c.simulation} · eSIM ••{action?.id.slice(-4)}</SheetDescription></SheetHeader>
        {action?.label === c.qr && <div className="mx-auto my-5 grid size-28 place-items-center rounded-lg border border-dashed border-border bg-secondary"><QrCode aria-hidden="true" className="size-12 text-muted-foreground" /><span className="text-xs font-bold">DEMO</span></div>}
        <p className="my-4 text-sm text-muted-foreground">{c.disclaimer}</p>
        <Button variant="outline" className="w-full" onClick={() => setAction(null)}>{c.close}</Button>
      </SheetContent>
    </Sheet>
  </div>;
}

function DemoPackageCard({ esim, now, open, onToggle, onAction }: { esim: DemoEsim; now: Date; open: boolean; onToggle: () => void; onAction: (label: string) => void }) {
  const { locale } = useI18n();
  const c = ACCOUNT_DEMO_COPY[locale];
  const r = ACCOUNT_REFUND_MESSAGES[locale];
  const [nickname, setNickname] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(() => { try { return sessionStorage.getItem(`${esim.id}-refund`) === '1'; } catch { return false; } });
  const [notified, setNotified] = useState(() => { try { return sessionStorage.getItem(`${esim.id}-alert`) === '1'; } catch { return false; } });
  const usage = demoUsage(esim);
  const refund = demoRefund(esim, now, pending);
  const days = remainingDays(esim.expiresAt, now);
  const name = nickname ?? c[esim.nickname];
  const number = (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
  const simulate = (kind: 'refund' | 'alert') => { try { sessionStorage.setItem(`${esim.id}-${kind}`, '1'); } catch { /* Still isolated to this mounted demo. */ } if (kind === 'refund') setPending(true); else setNotified(true); };
  return <article data-demo-esim={esim.id} className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card">
    <header className="flex items-start justify-between gap-2 border-b border-border pb-3">
      <div className="flex min-w-0 gap-3"><span className="text-3xl" aria-hidden="true">{flagOf(esim.iso)}</span><div className="min-w-0"><h2 className="text-base font-bold sm:text-lg">{getCountryByIso(esim.iso)?.name[locale]} · {esim.total} GB</h2>
        {editing ? <form className="mt-1 flex max-w-64 items-center gap-1" onSubmit={e => { e.preventDefault(); setNickname(draft.trim() || name); setEditing(false); }}><Input aria-label={c.edit} value={draft} maxLength={40} onChange={e => setDraft(e.target.value)} className="min-w-0" autoFocus /><Button size="sm" type="submit">{c.save}</Button></form> : <div className="flex items-center gap-1 text-sm text-muted-foreground"><span className="break-words">{name}</span><Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label={`${c.edit} · ${esim.id}`} onClick={() => { setDraft(name); setEditing(true); }}><Pencil className="size-4" /></Button></div>}
      </div></div>
      <div className="shrink-0 text-end"><span className={`inline-block rounded-full px-2 py-1 text-[11px] font-semibold ${esim.active ? 'bg-success/10 text-success' : 'bg-info/10 text-info'}`}>{esim.active ? c.active : c.ready}</span><p className="mt-1 text-xs text-muted-foreground">DEMO · ••{esim.id.slice(-4)}</p></div>
    </header>
    <div className="pt-3"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-2xl font-bold">{number(esim.remaining)} GB <span className="text-sm">{c.remaining}</span></p><span className={`text-xs font-semibold ${usage.low ? 'text-warning' : 'text-muted-foreground'}`}>{usage.low ? `${usage.remainingPercent}% ${c.remaining}` : days != null ? `${days} ${c.days}` : c.notActivated}</span></div>
      <div className="mt-1 flex justify-between gap-2 text-xs text-muted-foreground"><span>{number(esim.used)} / {esim.total} GB {c.used}</span><span>{Math.round(usage.usedPercent)}% {c.used}</span></div><Progress value={usage.usedPercent} aria-label={`${c.used} · ${esim.id}`} className="mt-2 h-2" />
      {usage.low && <p className="mt-2 flex gap-2 rounded-lg bg-warning/10 p-2 text-xs font-semibold text-warning"><AlertCircle className="size-4 shrink-0" />{c.low}</p>}
    </div>
    {open && <div id={`${esim.id}-details`} className="pt-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">{[[c.purchase, formatDate(esim.purchaseAt, locale)], [c.activation, esim.activatedAt ? formatDate(esim.activatedAt, locale) : c.notActivated], [c.expiry, esim.expiresAt ? formatDate(esim.expiresAt, locale) : c.unknown], [c.paid, c.noPayment]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>
      <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" className="min-h-11 h-auto whitespace-normal px-2 py-2 text-xs sm:text-sm" onClick={() => onAction(c.link)}><Link2 className="size-4 shrink-0" />{c.link}</Button><Button variant="outline" className="min-h-11 text-xs sm:text-sm" onClick={() => onAction(c.qr)}><QrCode className="size-4" />{c.qr}</Button><Button variant="ghost" className="min-h-11 h-auto whitespace-normal px-1 py-2 text-xs underline" onClick={() => onAction(c.copy)}>{c.copy}</Button><Button variant="ghost" className="min-h-11 h-auto whitespace-normal px-1 py-2 text-xs underline" onClick={() => onAction(c.guide)}><BookOpen className="size-4 shrink-0" />{c.guide}</Button></div>
      <p className="mt-1 text-[11px] text-muted-foreground">{c.simulation}{esim.active && ` · ${c.reinstall}`}</p>
      <Button className="mt-3 min-h-11 w-full" onClick={() => onAction(c.topup)}><Plus className="size-5" />{c.topup} · DEMO</Button>
      {usage.low && <div className="mt-2">{notified ? <p role="status" className="text-xs text-muted-foreground">{c.notified}</p> : <Button variant="ghost" className="min-h-11 h-auto whitespace-normal text-xs" onClick={() => simulate('alert')}><Bell className="size-4 shrink-0" />{c.notify}</Button>}</div>}
      <div className="mt-3 border-t border-border pt-3 text-sm">{refund.eligibility === 'NOT_ELIGIBLE_ACTIVATED' ? <p className="text-muted-foreground">{r.activated}</p> : pending ? <p role="status" className="font-medium text-primary">{c.requested}</p> : refund.canRequest ? <><p className="text-xs text-muted-foreground">{c.refundDays} {refund.daysLeft}</p><Button variant="ghost" className="mt-1 min-h-11 w-full justify-start" onClick={() => simulate('refund')}><RotateCcw className="size-5" />{c.refund} · DEMO</Button></> : <p>{r.expired}</p>}<Link to="/account/support" className="mt-2 inline-block text-xs text-primary underline">{r.support}</Link></div>
    </div>}
    <Button variant="ghost" aria-expanded={open} aria-controls={`${esim.id}-details`} className="mt-3 min-h-11 w-full border-t border-border pt-2 text-sm" onClick={onToggle}>{open ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}{open ? c.closeDetails : c.details}</Button>
  </article>;
}