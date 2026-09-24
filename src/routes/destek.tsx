import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Mail, MessageCircle, Package, Smartphone, UserRound } from "lucide-react";

import { PublicShell } from "@/components/travel/PublicShell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

/** WhatsApp support number in international format, digits only. */
export const WHATSAPP_NUMBER = "4900000000000";
const SUPPORT_EMAIL = "destek@travely.app";

const COPY = {
  tr: {
    title: "Nasıl yardımcı olabiliriz?",
    lead: "eSIM kurulumu, siparişler ve seyahat soruların için buradayız.",
    wa: "WhatsApp'tan yaz",
    waNote: "Genellikle birkaç dakika içinde yanıt veriyoruz.",
    waMsg: "Merhaba Travely, yardıma ihtiyacım var.",
    mail: "E-posta gönder",
    quick: "Hızlı bağlantılar",
    links: ["eSIM'lerim", "Siparişlerim", "Cihaz uyumluluğu"],
    faq: "Sık sorulan sorular",
    qa: [
      ["eSIM'imi ne zaman kurmalıyım?", "Yola çıkmadan önce Wi-Fi bağlantısındayken kurman önerilir. Paket, genellikle hedef ülkede ilk bağlantıda başlar."],
      ["QR kodum nerede?", "Satın alma sonrasında QR kodun ve kurulum bilgilerin Hesabım → eSIM'lerim bölümünde görünür."],
      ["Telefonum eSIM destekliyor mu?", "Paket sayfasındaki cihaz uyumluluğu kontrolüyle kolayca öğrenebilirsin."],
      ["İnternetim çalışmıyor, ne yapmalıyım?", "Telefon ayarlarından eSIM hattının açık ve veri dolaşımının (roaming) aktif olduğunu kontrol et. Sorun sürerse WhatsApp'tan bize yaz."],
    ],
  },
  de: {
    title: "Wie können wir helfen?",
    lead: "Wir helfen bei eSIM-Einrichtung, Bestellungen und Reisefragen.",
    wa: "Per WhatsApp schreiben",
    waNote: "Wir antworten meist innerhalb weniger Minuten.",
    waMsg: "Hallo Travely, ich brauche Hilfe.",
    mail: "E-Mail senden",
    quick: "Schnellzugriff",
    links: ["Meine eSIMs", "Meine Bestellungen", "Gerätekompatibilität"],
    faq: "Häufige Fragen",
    qa: [
      ["Wann sollte ich meine eSIM installieren?", "Am besten vor der Abreise im WLAN. Das Paket startet meist mit der ersten Verbindung im Zielland."],
      ["Wo finde ich meinen QR-Code?", "Nach dem Kauf findest du QR-Code und Anleitung unter Konto → Meine eSIMs."],
      ["Unterstützt mein Handy eSIM?", "Prüfe es mit dem Gerätecheck auf der Paketseite."],
      ["Mein Internet funktioniert nicht?", "Prüfe, ob die eSIM-Leitung aktiv und Daten-Roaming eingeschaltet ist. Sonst schreib uns per WhatsApp."],
    ],
  },
  en: {
    title: "How can we help?",
    lead: "We're here for eSIM setup, orders and travel questions.",
    wa: "Chat on WhatsApp",
    waNote: "We usually reply within a few minutes.",
    waMsg: "Hi Travely, I need help.",
    mail: "Send an email",
    quick: "Quick links",
    links: ["My eSIMs", "My orders", "Device compatibility"],
    faq: "Frequently asked questions",
    qa: [
      ["When should I install my eSIM?", "Ideally before you travel, on Wi-Fi. The plan usually starts on first connection at your destination."],
      ["Where is my QR code?", "After purchase, your QR code and setup steps are in Account → My eSIMs."],
      ["Does my phone support eSIM?", "Use the device compatibility check on the package page."],
      ["My internet isn't working?", "Check that the eSIM line is on and data roaming is enabled. If it persists, message us on WhatsApp."],
    ],
  },
} as const;

export const Route = createFileRoute("/destek")({
  head: () => ({
    meta: [
      { title: "Destek | Travely eSIM Yardım ve WhatsApp" },
      { name: "description", content: "Travely destek: WhatsApp, e-posta ve eSIM kurulumu için sık sorulan sorular." },
      { property: "og:title", content: "Destek | Travely eSIM Yardım ve WhatsApp" },
      { property: "og:description", content: "WhatsApp'tan bize yazın; eSIM kurulumu, siparişler ve seyahat sorularında yardım." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { locale } = useI18n();
  const c = COPY[(locale as keyof typeof COPY) ?? "tr"] ?? COPY.tr;
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(c.waMsg)}`;
  const quick = [
    { to: "/account/esims", icon: Smartphone },
    { to: "/account/orders", icon: Package },
    { to: "/esim/paketler", icon: UserRound },
  ] as const;
  return (
    <PublicShell>
      <div className="mx-auto grid max-w-3xl gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <header className="grid gap-2">
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">{c.title}</h1>
          <p className="text-muted-foreground">{c.lead}</p>
        </header>

        <section className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          <Button asChild size="lg" className="h-14 text-base">
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-5" /> {c.wa}
            </a>
          </Button>
          <p className="text-center text-xs text-muted-foreground">{c.waNote}</p>
          <Button asChild variant="outline" size="lg">
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail className="size-5" /> {c.mail}
            </a>
          </Button>
        </section>

        <section className="grid gap-3">
          <h2 className="text-lg font-bold text-foreground">{c.quick}</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {quick.map((q, i) => (
              <Link key={q.to} to={q.to} className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground">
                <q.icon className="size-4 text-primary" /> {c.links[i]}
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="text-lg font-bold text-foreground">{c.faq}</h2>
          <div className="grid gap-2">
            {c.qa.map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-border bg-card p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-foreground">
                  {q}
                  <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={c.wa}
        className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        <MessageCircle className="size-6" />
      </a>
    </PublicShell>
  );
}
