import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock3,
  LogOut,
  PackageCheck,
  Plane,
  RefreshCcw,
  Settings,
  Signal,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { CustomerEsimCard } from "@/components/account/CustomerEsimCard";
import { PublicShell } from "@/components/travel/PublicShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { isHistoryEsim } from "@/domain/esim/customer-esim";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerAccount } from "@/lib/customer-account.functions";

export const Route = createFileRoute("/_authenticated/hesabim/")({
  head: () => ({
    meta: [
      { title: "Hesabım — Travely" },
      { name: "description", content: "eSIM'lerinizi, rezervasyonlarınızı ve siparişlerinizi güvenle yönetin." },
      { property: "og:title", content: "Hesabım — Travely" },
      { property: "og:description", content: "eSIM'lerinizi, rezervasyonlarınızı ve siparişlerinizi güvenle yönetin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

const COPY = {
  tr: {
    eyebrow: "Hesabım",
    title: "Seyahat merkezim",
    active: "Aktif eSIM'ler",
    history: "Geçmiş eSIM'ler",
    lounges: "Lounge rezervasyonları",
    orders: "Siparişlerim",
    settings: "Profil ve ayarlar",
    refresh: "Güncelle",
    refreshing: "Güncelleniyor",
    updated: "Son güncelleme",
    noActive: "Henüz aktif bir eSIM'iniz yok.",
    noHistory: "Geçmiş eSIM kaydı yok.",
    noLounges: "Henüz Lounge rezervasyonunuz yok.",
    noOrders: "Henüz siparişiniz yok.",
    findEsim: "eSIM bul",
    loungeStatus: "Durum",
    guests: "kişi",
    orderStatus: "Sipariş durumu",
    logout: "Çıkış yap",
    logoutTitle: "Hesabınızdan çıkılsın mı?",
    logoutText: "Bu cihazdaki özel hesap verileri temizlenecek.",
    cancel: "Vazgeç",
    loggingOut: "Çıkış yapılıyor",
    logoutError: "Çıkış yapılamadı. Lütfen tekrar deneyin.",
    loadError: "Hesap bilgileri yüklenemedi.",
  },
  de: {
    eyebrow: "Mein Konto",
    title: "Meine Reiseübersicht",
    active: "Aktive eSIMs",
    history: "Frühere eSIMs",
    lounges: "Lounge-Buchungen",
    orders: "Meine Bestellungen",
    settings: "Profil und Einstellungen",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert",
    updated: "Zuletzt aktualisiert",
    noActive: "Du hast noch keine aktive eSIM.",
    noHistory: "Keine früheren eSIMs.",
    noLounges: "Du hast noch keine Lounge-Buchung.",
    noOrders: "Du hast noch keine Bestellung.",
    findEsim: "eSIM finden",
    loungeStatus: "Status",
    guests: "Personen",
    orderStatus: "Bestellstatus",
    logout: "Abmelden",
    logoutTitle: "Möchtest du dich abmelden?",
    logoutText: "Private Kontodaten werden von diesem Gerät entfernt.",
    cancel: "Abbrechen",
    loggingOut: "Abmeldung läuft",
    logoutError: "Abmeldung fehlgeschlagen. Bitte versuche es erneut.",
    loadError: "Kontodaten konnten nicht geladen werden.",
  },
  en: {
    eyebrow: "My account",
    title: "My travel hub",
    active: "Active eSIMs",
    history: "Previous eSIMs",
    lounges: "Lounge bookings",
    orders: "My orders",
    settings: "Profile and settings",
    refresh: "Refresh",
    refreshing: "Refreshing",
    updated: "Last updated",
    noActive: "You don't have an active eSIM yet.",
    noHistory: "No previous eSIMs.",
    noLounges: "You don't have a Lounge booking yet.",
    noOrders: "You don't have an order yet.",
    findEsim: "Find an eSIM",
    loungeStatus: "Status",
    guests: "travelers",
    orderStatus: "Order status",
    logout: "Sign out",
    logoutTitle: "Sign out of your account?",
    logoutText: "Private account data will be cleared from this device.",
    cancel: "Cancel",
    loggingOut: "Signing out",
    logoutError: "Unable to sign out. Please try again.",
    loadError: "Account details could not be loaded.",
  },
} as const;

function AccountPage() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const account = useQuery({
    queryKey: ["customer-account"],
    queryFn: () => getCustomerAccount(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await queryClient.cancelQueries();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      queryClient.clear();
      await navigate({ to: "/", search: { service: "esim" }, replace: true });
    } catch {
      toast.error(copy.logoutError);
      setSigningOut(false);
    }
  }

  const profile = account.data?.profile;
  const email = profile?.email ?? "";
  const name = profile?.full_name?.trim() || email.split("@")[0] || copy.eyebrow;
  const initial = name.charAt(0).toLocaleUpperCase(locale) || "T";
  const activeEsims = (account.data?.esims ?? []).filter((esim) => !isHistoryEsim({ status: esim.status, totalMb: esim.totalDataMb, remainingMb: esim.remainingDataMb, expiresAt: esim.expiresAt }));
  const historyEsims = (account.data?.esims ?? []).filter((esim) => isHistoryEsim({ status: esim.status, totalMb: esim.totalDataMb, remainingMb: esim.remainingDataMb, expiresAt: esim.expiresAt }));
  const updatedAt = account.data?.fetchedAt ? new Intl.DateTimeFormat(locale === "de" ? "de-DE" : locale === "tr" ? "tr-TR" : "en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(account.data.fetchedAt)) : "—";

  return (
    <PublicShell>
      <main className="mx-auto max-w-site px-4 pb-28 pt-6 sm:px-6 sm:pb-14 sm:pt-10">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-brand">{initial}</span>
            <div className="min-w-0"><p className="text-xs font-bold uppercase text-primary">{copy.eyebrow}</p><h1 className="truncate font-display text-2xl font-bold sm:text-3xl">{name}</h1><p className="truncate text-sm text-muted-foreground">{email}</p></div>
          </div>
          <Button variant="outline" size="icon" aria-label={copy.refresh} disabled={account.isFetching} onClick={() => void account.refetch()}><RefreshCcw className={account.isFetching ? "animate-spin" : ""} /></Button>
        </header>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-3.5" />{copy.updated}: {updatedAt}</div>
        {account.isError && <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{copy.loadError}</div>}

        <AccountSection icon={Signal} title={copy.active} count={activeEsims.length}>
          {activeEsims.length ? <div className="customer-esim-track">{activeEsims.map((esim) => <CustomerEsimCard key={esim.id} esim={esim} locale={locale} />)}</div> : <EmptyState text={copy.noActive}><Button asChild variant="cta"><Link to="/" search={{ service: "esim" }} hash="finder">{copy.findEsim}</Link></Button></EmptyState>}
        </AccountSection>

        <AccountSection icon={Clock3} title={copy.history} count={historyEsims.length}>
          {historyEsims.length ? <div className="customer-esim-track">{historyEsims.map((esim) => <CustomerEsimCard key={esim.id} esim={esim} locale={locale} />)}</div> : <EmptyState text={copy.noHistory} />}
        </AccountSection>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <AccountSection icon={Plane} title={copy.lounges} count={account.data?.lounges.length ?? 0} compact>
            {(account.data?.lounges.length ?? 0) > 0 ? <div className="grid gap-2">{account.data?.lounges.map((booking) => <div key={booking.id} className="rounded-xl border border-border bg-card p-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><div className="min-w-0"><p className="truncate font-bold">{booking.lounge_name || booking.airport_iata || "Lounge"}</p><p className="mt-1 text-xs text-muted-foreground">{booking.airport_iata}{booking.terminal ? ` · ${booking.terminal}` : ""} · {booking.travelers_count} {copy.guests}</p></div><span className="text-xs font-bold text-primary">{booking.status}</span></div></div>)}</div> : <EmptyState text={copy.noLounges} />}
          </AccountSection>
          <AccountSection icon={PackageCheck} title={copy.orders} count={account.data?.orders.length ?? 0} compact>
            {(account.data?.orders.length ?? 0) > 0 ? <div className="grid gap-2">{account.data?.orders.map((order) => <div key={order.id} className="rounded-xl border border-border bg-card p-4"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><div className="min-w-0"><p className="truncate font-bold">#{order.order_number}</p><p className="mt-1 text-xs text-muted-foreground">{copy.orderStatus}: {order.fulfillment_status}</p></div><strong className="text-sm">{new Intl.NumberFormat(locale === "de" ? "de-DE" : locale === "tr" ? "tr-TR" : "en-GB", { style: "currency", currency: order.currency }).format(Number(order.gross_revenue))}</strong></div></div>)}</div> : <EmptyState text={copy.noOrders} />}
          </AccountSection>
        </div>

        <section className="mt-8 border-t border-border pt-6">
          <Link to="/hesabim/seyahatler" className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-semibold hover:bg-secondary"><Settings className="size-5 text-primary" />{copy.settings}</Link>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button type="button" variant="ghost" className="mt-2 min-h-12 w-full justify-start px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"><LogOut />{copy.logout}</Button></AlertDialogTrigger>
            <AlertDialogContent className="mx-4 w-[calc(100%-2rem)] rounded-2xl sm:mx-0 sm:w-full">
              <AlertDialogHeader><AlertDialogTitle>{copy.logoutTitle}</AlertDialogTitle><AlertDialogDescription>{copy.logoutText}</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>{copy.cancel}</AlertDialogCancel><AlertDialogAction disabled={signingOut} onClick={(event) => { event.preventDefault(); void handleSignOut(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{signingOut ? copy.loggingOut : copy.logout}</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </main>
    </PublicShell>
  );
}

function AccountSection({ icon: Icon, title, count, compact = false, children }: { icon: typeof UserRound; title: string; count: number; compact?: boolean; children: ReactNode }) {
  return <section className={compact ? "min-w-0" : "mt-8"}><div className="mb-3 flex items-center gap-2"><Icon className="size-5 text-primary" /><h2 className="font-display text-xl font-bold">{title}</h2><span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">{count}</span></div>{children}</section>;
}

function EmptyState({ text, children }: { text: string; children?: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border bg-secondary/45 px-5 py-6 text-center"><p className="text-sm text-muted-foreground">{text}</p>{children && <div className="mt-4">{children}</div>}</div>;
}
