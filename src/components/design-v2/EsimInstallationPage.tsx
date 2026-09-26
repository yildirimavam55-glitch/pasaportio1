import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Apple, ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CircleHelp, Info, ScanLine, Settings2, Signal, Smartphone, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { V2Shell } from "./V2Shell";

const GUIDE = {
  tr: {
    back: "eSIM'e dön", eyebrow: "eSIM KURULUMU", title: "eSIM kurulum rehberi", lead: "Telefonuna göre adımları takip et. Menü adları cihazına ve yazılım sürümüne göre değişebilir.", iphone: "iPhone", android: "Android", progress: "Adım", of: "/", previous: "Önceki", next: "Sonraki", done: "Kurulum adımlarını tamamladım", restart: "Baştan başla", account: "eSIM'lerime git", caution: "Gerçek QR kodun ve varsa manuel kurulum bilgilerin yalnızca satın alma ve hazırlık tamamlandığında hesabındaki eSIM'de görünür. Burada örnek QR veya aktivasyon kodu yok.", connection: "Kurulum sırasında Wi-Fi bağlantısı kullan. Veri dolaşımını ve hangi hattın mobil veri için seçileceğini paket bilgilerine ve seyahat planına göre kontrol et.", note: "Kurulum ile paketin kullanım süresinin başlaması aynı şey olmayabilir; kendi paketinin aktivasyon koşullarını hesabından kontrol et.", help: "Bir adımda takıldın mı?", support: "Yardım al", complete: "Hazırsın. Bağlantını cihaz ayarlarından kontrol et.", steps: [
      { title: "Hazırlan", body: "Telefonunun eSIM uyumunu ve operatör kilidi olmadığını kontrol et. Wi-Fi'ye bağlan ve hesabındaki eSIM kurulum bilgilerini aç.", visual: "wifi" },
      { title: "Gerçek QR kodunu aç", body: "Satın alma ve hazırlık tamamlandıysa Hesabım → eSIM'lerim bölümünde kendi QR kodunu aç. Kodunu başka bir ekranda göster veya cihazının desteklediği manuel bilgileri kullan.", visual: "account" },
      { title: "eSIM ekleme ekranını aç", body: "Ayarlar → Hücresel / Mobil Veri → eSIM Ekle bölümüne git. Menü adı iOS sürümüne göre değişebilir.", android: "Ayarlar → Bağlantılar → SIM yöneticisi → eSIM ekle bölümüne git. Menü adı Android sürümüne göre değişebilir.", visual: "settings" },
      { title: "QR kodunu tara", body: "QR kodunu telefon kamerasıyla tara. Kod aynı telefondaysa cihazının sunduğu fotoğraftan ekleme veya manuel giriş seçeneğini kullan. Yalnızca hesabındaki gerçek bilgileri gir.", visual: "scan" },
      { title: "eSIM'i ekle", body: "Ekrandaki onayları takip ederek eSIM'i telefonuna ekle. İşlem tamamlanana kadar Wi-Fi bağlantını açık tut.", visual: "add" },
      { title: "Veri hattını ayarla", body: "Yeni eSIM'i mobil veri hattı olarak seç. Paketin ve bulunduğun ülkenin gerektirdiği durumlarda veri dolaşımını aç; kendi hattının dolaşım ücretlerini kontrol et.", visual: "signal" },
      { title: "Bağlantıyı kontrol et", body: "Hedef ülkede mobil veriyi dene. Bağlantı yoksa hattın açık olduğunu, veri hattı seçimini ve paket bilgilerini kontrol et. Gerekirse yardım al.", visual: "check" },
    ],
  },
  de: {
    back: "Zurück zu eSIM", eyebrow: "eSIM-EINRICHTUNG", title: "eSIM-Installationsanleitung", lead: "Folge den Schritten für dein Gerät. Menünamen können je nach Gerät und Softwareversion abweichen.", iphone: "iPhone", android: "Android", progress: "Schritt", of: "/", previous: "Zurück", next: "Weiter", done: "Schritte abgeschlossen", restart: "Von vorn beginnen", account: "Zu meinen eSIMs", caution: "Dein echter QR-Code und gegebenenfalls manuelle Einrichtungsdaten erscheinen erst nach Kauf und Bereitstellung bei deiner eSIM im Konto. Hier gibt es keinen Beispiel-QR- oder Aktivierungscode.", connection: "Verwende bei der Installation WLAN. Prüfe Datenroaming und die gewählte Datenleitung anhand deiner Paketangaben und Reisepläne.", note: "Installation und Beginn der Tariflaufzeit sind nicht immer dasselbe. Prüfe die Aktivierungsbedingungen deines eigenen Pakets im Konto.", help: "Brauchst du Hilfe bei einem Schritt?", support: "Hilfe erhalten", complete: "Fertig. Prüfe jetzt die Verbindung in den Geräteeinstellungen.", steps: [
      { title: "Vorbereiten", body: "Prüfe die eSIM-Fähigkeit und ob dein Gerät ohne SIM-Lock ist. Verbinde dich mit WLAN und öffne die Einrichtungsdaten deiner eSIM im Konto.", visual: "wifi" },
      { title: "Echten QR-Code öffnen", body: "Nach Kauf und Bereitstellung findest du deinen eigenen QR-Code unter Mein Konto → Meine eSIMs. Zeige ihn auf einem zweiten Bildschirm an oder verwende die verfügbaren manuellen Daten.", visual: "account" },
      { title: "eSIM-Einstellungen öffnen", body: "Öffne Einstellungen → Mobilfunk → eSIM hinzufügen. Die Bezeichnung hängt von der iOS-Version ab.", android: "Öffne Einstellungen → Verbindungen → SIM-Manager → eSIM hinzufügen. Die Bezeichnung hängt von der Android-Version ab.", visual: "settings" },
      { title: "QR-Code scannen", body: "Scanne deinen QR-Code mit der Gerätekamera. Ist er auf demselben Handy, nutze die angebotene Bild- oder manuelle Eingabe. Verwende ausschließlich deine echten Kontodaten.", visual: "scan" },
      { title: "eSIM hinzufügen", body: "Folge den Bestätigungen auf dem Bildschirm. Bleibe mit WLAN verbunden, bis die Installation abgeschlossen ist.", visual: "add" },
      { title: "Datenleitung einstellen", body: "Wähle die neue eSIM für mobile Daten aus. Aktiviere Datenroaming, falls Tarif und Reiseland es erfordern; prüfe mögliche Roamingkosten deiner anderen SIM.", visual: "signal" },
      { title: "Verbindung prüfen", body: "Teste mobile Daten im Zielland. Bei Problemen prüfe, ob die Leitung aktiv ist, welche Datenleitung gewählt ist und was in deinem Paket steht.", visual: "check" },
    ],
  },
  en: {
    back: "Back to eSIM", eyebrow: "eSIM SETUP", title: "eSIM installation guide", lead: "Follow the steps for your phone. Menu names may vary by device and software version.", iphone: "iPhone", android: "Android", progress: "Step", of: "/", previous: "Previous", next: "Next", done: "I've completed the steps", restart: "Start over", account: "Go to my eSIMs", caution: "Your real QR code and any manual setup details appear with your eSIM in your account only after purchase and provisioning. There is no sample QR or activation code here.", connection: "Use Wi-Fi during installation. Check data roaming and the selected mobile data line against your plan details and travel needs.", note: "Installing an eSIM and starting the plan's validity are not necessarily the same. Check your own plan's activation conditions in your account.", help: "Need help with a step?", support: "Get help", complete: "You're ready. Check your connection in your phone settings.", steps: [
      { title: "Get ready", body: "Check your phone supports eSIM and is carrier-unlocked. Connect to Wi-Fi and open the eSIM setup details in your account.", visual: "wifi" },
      { title: "Open your real QR code", body: "After purchase and provisioning, find your own QR code in Account → My eSIMs. Display it on another screen or use the available manual details.", visual: "account" },
      { title: "Open eSIM settings", body: "Go to Settings → Cellular / Mobile Data → Add eSIM. Menu names may vary by iOS version.", android: "Go to Settings → Connections → SIM manager → Add eSIM. Menu names may vary by Android version.", visual: "settings" },
      { title: "Scan the QR code", body: "Scan your QR code with your phone's camera. If it is on the same phone, use its option to add from an image or enter details manually. Use only your real account details.", visual: "scan" },
      { title: "Add the eSIM", body: "Follow the on-screen confirmations to add the eSIM to your phone. Keep Wi-Fi connected until installation finishes.", visual: "add" },
      { title: "Choose the data line", body: "Select the new eSIM for mobile data. Enable data roaming where your plan and destination require it; check roaming charges on your other line.", visual: "signal" },
      { title: "Check your connection", body: "Test mobile data in your destination. If it does not connect, check that the line is enabled, your data line selection and your plan details.", visual: "check" },
    ],
  },
} as const;

const iconMap = { wifi: Wifi, account: Smartphone, settings: Settings2, scan: ScanLine, add: Smartphone, signal: Signal, check: Check };

export function EsimInstallationPage({ initialPlatform }: { initialPlatform: "ios" | "android" }) {
  const { locale } = useI18n();
  const c = GUIDE[locale];
  const navigate = useNavigate();
  const [platform, setPlatform] = useState(initialPlatform);
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  useEffect(() => { setPlatform(initialPlatform); setStep(0); setFinished(false); }, [initialPlatform]);
  const selected = c.steps[step];
  const changePlatform = (next: "ios" | "android") => {
    setPlatform(next); setStep(0); setFinished(false);
    void navigate({ to: "/esim/kurulum", search: { platform: next, brand: "" }, replace: true });
  };
  if (!selected) return null;
  const Illustration = iconMap[selected.visual];
  return <V2Shell service="esim">
    <main className="mx-auto max-w-5xl pb-16">
      <Button asChild variant="ghost" size="sm" className="mt-2 -ml-2 text-primary"><Link to="/esim" search={{ country: "" }}><ArrowLeft className="size-4" />{c.back}</Link></Button>
      <header className="mb-7 mt-5 lg:mb-10"><p className="text-xs font-bold uppercase tracking-widest text-primary">{c.eyebrow}</p><h1 className="mt-2 font-display text-3xl font-bold text-foreground lg:text-5xl">{c.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground lg:text-base">{c.lead}</p></header>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:max-w-sm" role="group" aria-label={c.title}>
        <Button variant={platform === "ios" ? "default" : "outline"} aria-pressed={platform === "ios"} onClick={() => changePlatform("ios")} className="min-h-12"><Apple className="size-5" />{c.iphone}</Button>
        <Button variant={platform === "android" ? "default" : "outline"} aria-pressed={platform === "android"} onClick={() => changePlatform("android")} className="min-h-12"><Smartphone className="size-5" />{c.android}</Button>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-14">
        <section aria-label={c.title}>
          <p className="text-sm font-semibold text-primary" aria-live="polite">{c.progress} {step + 1} {c.of} {c.steps.length}</p>
          <div role="progressbar" aria-label={c.progress} aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={c.steps.length} className="mt-3 flex gap-1.5">{c.steps.map((item, index) => <span key={item.title} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none ${index <= step ? "bg-primary" : "bg-border"}`} />)}</div>
          <div className="mt-8 min-h-52" key={`${locale}-${platform}-${step}`}>
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Illustration className="size-6" aria-hidden /></div>
            <h2 className="mt-5 font-display text-2xl font-bold text-foreground">{selected.title}</h2>
            <p className="mt-3 max-w-prose text-base leading-7 text-muted-foreground">{"android" in selected && platform === "android" ? selected.android : selected.body}</p>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => { setFinished(false); setStep((current) => Math.max(0, current - 1)); }} disabled={step === 0} className="min-h-12"><ChevronLeft className="size-4" />{c.previous}</Button>
            <Button onClick={() => { if (step === c.steps.length - 1) setFinished(true); else setStep((current) => current + 1); }} className="min-h-12 flex-1 sm:flex-none">{step === c.steps.length - 1 ? c.done : c.next}{step === c.steps.length - 1 ? <Check className="size-4" /> : <ChevronRight className="size-4" />}</Button>
          </div>
          {finished && <div role="status" className="mt-5 rounded-xl bg-primary-soft p-4 text-sm font-semibold text-primary"><Check className="mr-2 inline size-5" />{c.complete}<Button variant="link" onClick={() => { setStep(0); setFinished(false); }} className="mt-2 block h-auto p-0 text-primary">{c.restart}</Button></div>}
        </section>
        <aside className="space-y-4 lg:pt-2">
          <div className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-2xl bg-secondary p-8 text-center ring-1 ring-border lg:min-h-64" aria-hidden="true"><div className="relative grid size-28 place-items-center rounded-2xl border-4 border-foreground bg-card shadow-panel"><Illustration className="size-12 text-primary" /><span className="absolute -bottom-3 right-[-1rem] grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-5" /></span></div><span className="text-sm font-semibold text-foreground">{selected.title}</span></div>
          <div className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground"><Info className="mt-0.5 size-5 shrink-0 text-primary" /><p>{c.caution}</p></div>
          <p className="text-sm leading-6 text-muted-foreground">{c.connection}</p><p className="text-sm leading-6 text-muted-foreground">{c.note}</p>
          <div className="flex flex-wrap items-center gap-2 pt-2"><Button asChild variant="outline" size="sm"><Link to="/account/esims">{c.account}<ArrowRight className="size-4" /></Link></Button><Button asChild variant="ghost" size="sm"><Link to="/destek"><CircleHelp className="size-4" />{c.support}</Link></Button></div>
        </aside>
      </div>
    </main>
  </V2Shell>;
}