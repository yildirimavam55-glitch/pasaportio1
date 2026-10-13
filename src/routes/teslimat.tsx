import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, ShieldCheck } from "lucide-react";

import { EsimInstallGuide } from "@/components/account/EsimInstallGuide";
import { CLink as Link } from "@/components/design-v2/v2-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { localize } from "@/i18n/overlay";
import { confirmGuestRenewal, openGuestDeliveryRequest, requestGuestRenewal } from "@/lib/commerce-guest-delivery.functions";

const COPY = localize({
  tr: { title: "eSIM teslimatın", loading: "Yükleniyor…", order: "Sipariş", status: "Durum", data: "Veri", validUntil: "Geçerlilik", unlimited: "Sınırsız", none: "Bu siparişte henüz hazır eSIM yok. Hazır olduğunda burada görünecek.", invalidTitle: "Bu bağlantı geçerli değil veya süresi dolmuş", invalidBody: "Güvenliğin için teslimat bağlantıları kısa süre geçerlidir. Sipariş numaran ve siparişte kullandığın e-posta ile yeni bağlantı isteyebilirsin.", orderNumber: "Sipariş numarası", email: "E-posta", send: "Doğrulama kodu gönder", sent: "Bilgiler eşleşirse e-postana 6 haneli bir kod gönderilecek.", code: "6 haneli kod", confirm: "Yeni bağlantıyı aç", wrong: "Kod doğrulanamadı. Bilgileri kontrol edip tekrar dene.", support: "Destek al", private: "Bu sayfa yalnızca sana özeldir; bağlantıyı paylaşma." },
  de: { title: "Deine eSIM-Zustellung", loading: "Wird geladen…", order: "Bestellung", status: "Status", data: "Daten", validUntil: "Gültig bis", unlimited: "Unbegrenzt", none: "Für diese Bestellung ist noch keine eSIM bereit. Sie erscheint hier, sobald sie bereit ist.", invalidTitle: "Dieser Link ist ungültig oder abgelaufen", invalidBody: "Zu deiner Sicherheit sind Zustell-Links nur kurz gültig. Mit Bestellnummer und Bestell-E-Mail kannst du einen neuen Link anfordern.", orderNumber: "Bestellnummer", email: "E-Mail", send: "Bestätigungscode senden", sent: "Wenn die Angaben passen, senden wir dir einen 6-stelligen Code.", code: "6-stelliger Code", confirm: "Neuen Link öffnen", wrong: "Code konnte nicht bestätigt werden. Bitte Angaben prüfen.", support: "Hilfe erhalten", private: "Diese Seite ist nur für dich – teile den Link nicht." },
  en: { title: "Your eSIM delivery", loading: "Loading…", order: "Order", status: "Status", data: "Data", validUntil: "Valid until", unlimited: "Unlimited", none: "No eSIM is ready for this order yet. It will appear here once ready.", invalidTitle: "This link is invalid or has expired", invalidBody: "For your security, delivery links are short-lived. Request a new one with your order number and the email used for the order.", orderNumber: "Order number", email: "Email", send: "Send verification code", sent: "If the details match, a 6-digit code will be sent to your email.", code: "6-digit code", confirm: "Open new link", wrong: "The code could not be verified. Check the details and try again.", support: "Get support", private: "This page is personal to you — do not share the link." },
} as const);

export const Route = createFileRoute("/teslimat")({
  ssr: false,
  head: () => ({ meta: [
    { title: "eSIM teslimatı | pasaport.io" },
    { name: "description", content: "Misafir siparişin için güvenli eSIM kurulum sayfası." },
    { property: "og:title", content: "eSIM teslimatı | pasaport.io" },
    { property: "og:description", content: "Misafir siparişin için güvenli eSIM kurulum sayfası." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" }, { name: "referrer", content: "no-referrer" },
  ] }),
  component: GuestDeliveryPage,
});

function GuestDeliveryPage() {
  // S3: the token lives in the URL fragment (#…), which browsers never send to the
  // server, so it cannot reach access logs. It is removed from the address bar at once,
  // so later error reports, analytics or shared screenshots never contain it.
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const raw = window.location.hash.slice(1);
    setToken(/^[0-9a-f]{64}$/.test(raw) ? raw : "");
    if (raw) window.history.replaceState(null, "", window.location.pathname);
  }, []);
  const { locale } = useI18n();
  const c = COPY[locale] ?? COPY.en;
  const open = useServerFn(openGuestDeliveryRequest);
  const q = useQuery({ queryKey: ["guest-delivery"], queryFn: () => (token ? open({ data: { token } }) : Promise.resolve({ ok: false } as const)), enabled: token !== null, retry: false, staleTime: 60_000, gcTime: 0 });

  return (
    <main className="mx-auto grid w-full max-w-xl gap-5 px-4 py-8 sm:py-12">
      <h1 className="font-display text-2xl font-bold">{c.title}</h1>
      {token === null || q.isPending ? <p className="text-sm text-muted-foreground">{c.loading}</p>
        : q.data?.ok ? <Delivered order={q.data.order} c={c} locale={locale} />
        : <Renew c={c} />}
      <Button asChild variant="outline" className="min-h-11 w-fit"><Link to="/destek"><LifeBuoy className="size-4" />{c.support}</Link></Button>
    </main>
  );
}

type Copy = (typeof COPY)[keyof typeof COPY];
type Order = Extract<Awaited<ReturnType<typeof openGuestDeliveryRequest>>, { ok: true }>["order"];

function Delivered({ order, c, locale }: { order: Order; c: Copy; locale: any }) {
  return (
    <>
      <p className="flex gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-primary" />{c.private}</p>
      <p className="text-sm"><span className="text-muted-foreground">{c.order}:</span> <span className="font-semibold">{order.orderNumber}</span></p>
      {order.esims.length === 0 ? <p className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">{c.none}</p> : order.esims.map((e) => {
        const expired = Boolean(e.expiresAt && Date.parse(e.expiresAt) < Date.now()) || e.status === "EXPIRED";
        return (
          <section key={e.id} className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <div className="grid gap-1">
              <h2 className="font-display text-lg font-bold">{e.packageLabel ?? e.destinationLabel ?? "eSIM"}</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">{c.status}</dt><dd className="font-semibold">{e.status}</dd>
                {e.totalDataMb != null && (<><dt className="text-muted-foreground">{c.data}</dt><dd>{e.totalDataMb < 0 ? c.unlimited : `${Math.round(e.totalDataMb / 102.4) / 10} GB`}</dd></>)}
                {e.expiresAt && (<><dt className="text-muted-foreground">{c.validUntil}</dt><dd>{new Date(e.expiresAt).toLocaleDateString(locale)}</dd></>)}
              </dl>
            </div>
            <EsimInstallGuide locale={locale} esimId={e.id} qrPayload={e.qrPayload} installInfo={e.installInfo} activationPolicy={e.activationPolicy} expired={expired} />
          </section>
        );
      })}
    </>
  );
}

function Renew({ c }: { c: Copy }) {
  const request = useServerFn(requestGuestRenewal);
  const confirm = useServerFn(confirmGuestRenewal);
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <h2 className="font-display text-lg font-bold">{c.invalidTitle}</h2>
      <p className="text-sm text-muted-foreground">{c.invalidBody}</p>
      <form className="grid gap-3" onSubmit={async (ev) => {
        ev.preventDefault(); setBusy(true); setError(false);
        try {
          if (step === "form") { await request({ data: { orderNumber, email } }); setStep("code"); }
          else { const r = await confirm({ data: { orderNumber, email, code } }); if (r.ok) { window.location.replace(`/teslimat#${r.token}`); window.location.reload(); }; else setError(true); }
        } finally { setBusy(false); }
      }}>
        <Input aria-label={c.orderNumber} placeholder={c.orderNumber} value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required maxLength={40} disabled={step === "code"} />
        <Input aria-label={c.email} placeholder={c.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} disabled={step === "code"} />
        {step === "code" && (<>
          <p className="text-sm text-muted-foreground">{c.sent}</p>
          <Input aria-label={c.code} placeholder={c.code} inputMode="numeric" pattern="\d{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
        </>)}
        {error && <p className="text-sm text-destructive">{c.wrong}</p>}
        <Button type="submit" variant="cta" className="min-h-11" disabled={busy}>{step === "form" ? c.send : c.confirm}</Button>
      </form>
    </section>
  );
}
