import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Apple, ArrowLeft, ArrowRight, BatteryFull, Check, ChevronLeft, ChevronRight, CircleHelp, Lightbulb, Plus, Signal, Smartphone, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { useDeviceCheck } from "@/domain/esim/device-check-session";
import { V2Shell } from "./V2Shell";

type Platform = "ios" | "android";
type Step = { label: string; title: string; ios: string; android: string; tip: string };

const GUIDE = {
  tr: {
    back: "Geri", guideTitle: "Kurulum rehberi", titleFor: (d: string) => `${d} için eSIM kurulumu`, lead: "Aşağıdaki adımları takip ederek eSIM'inizi kolayca kurabilirsiniz.", iphone: "iOS (iPhone)", android: "Android", step: "Adım", tipLabel: "İpucu", previous: "Önceki", next: "Sonraki", verified: "eSIM uyumlu",
    doneTitle: "Kurulum tamamlandı!", doneBody: "Kurulum adımlarını tamamladınız. eSIM'inizi paketinizin aktivasyon koşullarına göre kullanabilirsiniz.", account: "eSIM'lerime git", support: "Yardım Merkezi", restart: "Baştan başla", sample: "Örnek görsel · taranamaz",
    ui: { settings: "Ayarlar", cellular: "Hücresel", addEsim: "eSIM Ekle", dataLine: "Mobil Veri", roaming: "Veri Dolaşımı", connected: "Bağlı", line: "Seyahat eSIM", sim: "SIM yöneticisi", ready: "Hazır" },
    steps: [
      { label: "QR kodu aç", title: "QR kodu açın", ios: "Satın aldıktan sonra hesabınızdaki eSIM'lerim bölümünde size ait QR kodunu açın ve başka bir ekranda gösterin.", android: "Satın aldıktan sonra hesabınızdaki eSIM'lerim bölümünde size ait QR kodunu açın ve başka bir ekranda gösterin.", tip: "Gerçek QR kodunuz yalnızca hesabınızda görünür. Buradaki görsel örnektir." },
      { label: "eSIM ekle", title: "eSIM ekleyin", ios: "Ayarlar → Hücresel → eSIM Ekle → QR Kodu Kullan ile kodu tarayın.", android: "Ayarlar → Bağlantılar → SIM yöneticisi → eSIM ekle ile kodu tarayın.", tip: "Kurulum bitene kadar Wi-Fi bağlantınızı açık tutun." },
      { label: "Ayarlar", title: "Ayarları yapılandırın", ios: "Yeni hattı etiketleyin ve Mobil Veri için seyahat eSIM'inizi seçin. Ana hattınız arama için kalabilir.", android: "SIM yöneticisinde mobil veri için yeni eSIM'i seçin. Ana hattınız arama için kalabilir.", tip: "Menü adları cihaza ve yazılım sürümüne göre değişebilir." },
      { label: "Etkinleştir", title: "Etkinleştirin", ios: "Hedef ülkeye vardığınızda hattı açın ve bu hat için Veri Dolaşımı'nı etkinleştirin.", android: "Hedef ülkeye vardığınızda eSIM'i açın ve Mobil ağlar bölümünden Veri dolaşımı'nı etkinleştirin.", tip: "Ana hattınızda dolaşım ücreti oluşmaması için veri dolaşımını yalnızca eSIM'de açın." },
      { label: "Tamamlandı", title: "Tamamlandı", ios: "", android: "", tip: "" },
    ] as Step[],
  },
  de: {
    back: "Zurück", guideTitle: "Installationsanleitung", titleFor: (d: string) => `eSIM-Einrichtung für ${d}`, lead: "Folge den Schritten unten, um deine eSIM einfach einzurichten.", iphone: "iOS (iPhone)", android: "Android", step: "Schritt", tipLabel: "Tipp", previous: "Zurück", next: "Weiter", verified: "eSIM-fähig",
    doneTitle: "Einrichtung abgeschlossen!", doneBody: "Du hast alle Einrichtungsschritte abgeschlossen. Nutze deine eSIM gemäß den Aktivierungsbedingungen deines Pakets.", account: "Zu meinen eSIMs", support: "Hilfe-Center", restart: "Von vorn beginnen", sample: "Beispielbild · nicht scanbar",
    ui: { settings: "Einstellungen", cellular: "Mobilfunk", addEsim: "eSIM hinzufügen", dataLine: "Mobile Daten", roaming: "Datenroaming", connected: "Verbunden", line: "Reise-eSIM", sim: "SIM-Manager", ready: "Bereit" },
    steps: [
      { label: "QR-Code öffnen", title: "QR-Code öffnen", ios: "Öffne nach dem Kauf deinen eigenen QR-Code unter Meine eSIMs in deinem Konto und zeige ihn auf einem zweiten Bildschirm an.", android: "Öffne nach dem Kauf deinen eigenen QR-Code unter Meine eSIMs in deinem Konto und zeige ihn auf einem zweiten Bildschirm an.", tip: "Dein echter QR-Code erscheint nur in deinem Konto. Diese Abbildung ist ein Beispiel." },
      { label: "eSIM hinzufügen", title: "eSIM hinzufügen", ios: "Einstellungen → Mobilfunk → eSIM hinzufügen → QR-Code verwenden und den Code scannen.", android: "Einstellungen → Verbindungen → SIM-Manager → eSIM hinzufügen und den Code scannen.", tip: "Bleibe bis zum Abschluss mit dem WLAN verbunden." },
      { label: "Einstellungen", title: "Einstellungen anpassen", ios: "Benenne die neue Leitung und wähle deine Reise-eSIM für mobile Daten. Deine Hauptleitung kann für Anrufe bleiben.", android: "Wähle im SIM-Manager die neue eSIM für mobile Daten. Deine Hauptleitung kann für Anrufe bleiben.", tip: "Menünamen können je nach Gerät und Softwareversion abweichen." },
      { label: "Aktivieren", title: "Aktivieren", ios: "Schalte die Leitung im Zielland ein und aktiviere Datenroaming für diese Leitung.", android: "Schalte die eSIM im Zielland ein und aktiviere Datenroaming unter Mobile Netzwerke.", tip: "Aktiviere Datenroaming nur für die eSIM, um Kosten auf der Hauptleitung zu vermeiden." },
      { label: "Fertig", title: "Fertig", ios: "", android: "", tip: "" },
    ] as Step[],
  },
  en: {
    back: "Back", guideTitle: "Installation guide", titleFor: (d: string) => `eSIM setup for ${d}`, lead: "Follow the steps below to set up your eSIM easily.", iphone: "iOS (iPhone)", android: "Android", step: "Step", tipLabel: "Tip", previous: "Previous", next: "Next", verified: "eSIM compatible",
    doneTitle: "Setup complete!", doneBody: "You've completed the setup steps. Use your eSIM according to your plan's activation conditions.", account: "Go to my eSIMs", support: "Help Center", restart: "Start over", sample: "Sample image · not scannable",
    ui: { settings: "Settings", cellular: "Cellular", addEsim: "Add eSIM", dataLine: "Mobile Data", roaming: "Data Roaming", connected: "Connected", line: "Travel eSIM", sim: "SIM manager", ready: "Ready" },
    steps: [
      { label: "Open QR code", title: "Open the QR code", ios: "After purchase, open your own QR code under My eSIMs in your account and show it on another screen.", android: "After purchase, open your own QR code under My eSIMs in your account and show it on another screen.", tip: "Your real QR code only appears in your account. This image is a sample." },
      { label: "Add eSIM", title: "Add the eSIM", ios: "Settings → Cellular → Add eSIM → Use QR Code, then scan the code.", android: "Settings → Connections → SIM manager → Add eSIM, then scan the code.", tip: "Stay connected to Wi-Fi until installation finishes." },
      { label: "Settings", title: "Configure settings", ios: "Label the new line and choose your travel eSIM for Mobile Data. Your main line can stay for calls.", android: "In SIM manager, choose the new eSIM for mobile data. Your main line can stay for calls.", tip: "Menu names may vary by device and software version." },
      { label: "Activate", title: "Activate", ios: "When you arrive, turn the line on and enable Data Roaming for this line.", android: "When you arrive, turn the eSIM on and enable Data roaming under Mobile networks.", tip: "Enable data roaming only on the eSIM to avoid charges on your main line." },
      { label: "Done", title: "Done", ios: "", android: "", tip: "" },
    ] as Step[],
  },
} as const;

type Guide = (typeof GUIDE)["tr"];
const LAST = 4;

/* ---------- Phone illustrations (generic, own artwork) ---------- */

function DecorativeQr() {
  // Deterministic decorative pattern — NOT an encoded QR code.
  const cells = Array.from({ length: 81 }, (_, i) => ((i * 37 + (i % 7) * 11) % 5) < 2);
  const finder = (r: number, c: number) => (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
  return (
    <div className="grid size-24 grid-cols-9 gap-[2px] rounded-md bg-card p-1.5" aria-hidden="true">
      {cells.map((on, i) => {
        const r = Math.floor(i / 9), c = i % 9;
        return <span key={i} className={`rounded-[1px] ${finder(r, c) ? "bg-foreground" : on ? "bg-foreground/80" : "bg-transparent"}`} />;
      })}
    </div>
  );
}

function Tap({ className = "" }: { className?: string }) {
  return <span className={`pointer-events-none absolute size-7 rounded-full border-2 border-cta bg-cta/25 motion-safe:animate-pulse ${className}`} aria-hidden="true" />;
}

function Toggle({ on, android }: { on: boolean; android?: boolean }) {
  return <span className={`relative inline-flex shrink-0 items-center rounded-full transition-colors duration-500 ${android ? "h-4 w-8" : "h-4.5 w-8"} ${on ? "bg-primary" : "bg-border"}`}><span className={`absolute size-3.5 rounded-full bg-card shadow transition-all duration-500 ${on ? "left-[calc(100%-1rem)]" : "left-0.5"}`} /></span>;
}

function Row({ label, right, highlight, android }: { label: string; right?: ReactNode; highlight?: boolean; android?: boolean }) {
  return <div className={`flex items-center justify-between gap-2 px-2.5 py-2 text-[10px] font-semibold ${android ? "rounded-xl" : ""} ${highlight ? "bg-primary-soft text-primary" : "text-foreground"}`}><span className="truncate">{label}</span>{right ?? <ChevronRight className="size-3 text-muted-foreground" />}</div>;
}

function PhoneScreen({ platform, step, c }: { platform: Platform; step: number; c: Guide }) {
  const a = platform === "android";
  const group = a ? "space-y-1.5" : "divide-y divide-border overflow-hidden rounded-xl bg-card";
  const header = <p className={`px-1 font-bold text-foreground ${a ? "text-base" : "text-center text-[11px]"}`}>{step === 1 ? (a ? c.ui.sim : c.ui.cellular) : c.ui.settings}</p>;

  if (step === 0) {
    return <div className="relative flex h-full flex-col items-center justify-center gap-3 bg-foreground/90">
      <div className={`relative p-2 ${a ? "rounded-2xl ring-2 ring-primary-soft" : ""}`}>
        {!a && ["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-l-2 border-b-2", "right-0 bottom-0 border-r-2 border-b-2"].map((p) => <span key={p} className={`absolute size-4 border-cta ${p}`} />)}
        <DecorativeQr />
        <span className="absolute inset-x-2 top-2 h-0.5 bg-cta/80 motion-safe:animate-[scan_2.4s_ease-in-out_infinite]" />
      </div>
      <span className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold ${a ? "rounded-full bg-primary text-primary-foreground" : "rounded-lg bg-cta text-cta-foreground"}`}><Plus className="size-3" />{c.ui.addEsim}</span>
      <span className="text-[8px] font-semibold uppercase tracking-wider text-background/70">{c.sample}</span>
    </div>;
  }
  if (step === 1) {
    return <div className={`relative h-full space-y-2 p-2.5 ${a ? "bg-card" : "bg-secondary"}`}>
      {header}
      <div className={group}><Row android={a} label={a ? "SIM 1" : c.ui.dataLine} right={<span className="text-[9px] text-muted-foreground">SIM 1</span>} /><Row android={a} label={c.ui.addEsim} highlight right={<Plus className="size-3" />} /></div>
      <Tap className={a ? "right-6 top-[5.4rem]" : "right-6 top-[5.1rem]"} />
    </div>;
  }
  if (step === 2) {
    return <div className={`h-full space-y-2 p-2.5 ${a ? "bg-card" : "bg-secondary"}`}>
      {header}
      <div className={group}><Row android={a} label={c.ui.dataLine} right={<span className="text-[9px] font-bold text-primary">{c.ui.line}</span>} highlight /><Row android={a} label={c.ui.line} right={<Toggle on android={a} />} /><Row android={a} label="SIM 1" right={<Toggle on={false} android={a} />} /></div>
    </div>;
  }
  if (step === 3) {
    return <div className={`relative h-full space-y-3 p-2.5 ${a ? "bg-card" : "bg-secondary"}`}>
      {header}
      <div className={group}><Row android={a} label={c.ui.roaming} right={<Toggle on android={a} />} highlight /></div>
      <div className="mx-auto mt-4 flex w-fit flex-col items-center gap-1.5 rounded-2xl bg-primary-soft px-4 py-3 text-primary motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:duration-500">
        <Signal className="size-7" />
        <span className="text-[10px] font-bold">{c.ui.line} · {c.ui.connected}</span>
      </div>
    </div>;
  }
  return <div className="flex h-full flex-col items-center justify-center gap-2 bg-card">
    <span className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-500"><Check className="size-9" strokeWidth={3} /></span>
    <span className="text-[11px] font-bold text-foreground">{c.ui.ready}</span>
  </div>;
}

function PhoneVisual({ platform, step, c }: { platform: Platform; step: number; c: Guide }) {
  const a = platform === "android";
  return <div className={`relative mx-auto h-[300px] w-[150px] border-[6px] border-foreground bg-foreground shadow-panel lg:h-[340px] lg:w-[170px] ${a ? "rounded-[1.4rem]" : "rounded-[2.4rem]"}`} aria-hidden="true">
    <div className={`relative flex h-full flex-col overflow-hidden bg-card ${a ? "rounded-[1rem]" : "rounded-[1.9rem]"}`}>
      <div className="flex h-6 shrink-0 items-center justify-between px-3 text-[8px] font-bold text-foreground">
        <span>{a ? "12:30" : "9:41"}</span>
        {a ? <span className="size-2 rounded-full bg-foreground" /> : <span className="h-3.5 w-12 rounded-full bg-foreground" />}
        <span className="flex items-center gap-0.5"><Wifi className="size-2.5" /><BatteryFull className="size-3" /></span>
      </div>
      <div key={`${platform}-${step}`} className="min-h-0 flex-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3 motion-safe:duration-300">
        <PhoneScreen platform={platform} step={step} c={c} />
      </div>
      {a ? <div className="flex h-5 shrink-0 items-center justify-center gap-5 text-foreground/60"><span className="size-1.5 rotate-45 border-b border-l border-current" /><span className="size-2 rounded-full border border-current" /><span className="size-1.5 border border-current" /></div>
        : <div className="flex h-4 shrink-0 items-center justify-center"><span className="h-1 w-12 rounded-full bg-foreground/70" /></div>}
    </div>
  </div>;
}

/* ---------- Page ---------- */

export function EsimInstallationPage({ initialPlatform }: { initialPlatform: Platform }) {
  const { locale } = useI18n();
  const c = GUIDE[locale];
  const navigate = useNavigate();
  const { deviceModel, compatibilityResult } = useDeviceCheck();
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [step, setStep] = useState(0);
  useEffect(() => { setPlatform(initialPlatform); setStep(0); }, [initialPlatform]);

  const deviceKnown = compatibilityResult === "COMPATIBLE" && deviceModel;
  const deviceName = deviceKnown ? deviceModel : platform === "ios" ? "iPhone" : "Android";
  const current = c.steps[step];
  if (!current) return null;
  const body = platform === "ios" ? current.ios : current.android;
  const isDone = step === LAST;

  const changePlatform = (next: Platform) => {
    setPlatform(next); setStep(0);
    void navigate({ to: "/esim/kurulum", search: { platform: next, brand: "" }, replace: true });
  };
  const go = (delta: number) => setStep((s) => Math.min(LAST, Math.max(0, s + delta)));

  const tabs = <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 sm:max-w-md" role="group" aria-label={c.guideTitle}>
    {(["ios", "android"] as const).map((p) => <button key={p} type="button" aria-pressed={platform === p} onClick={() => changePlatform(p)} className={`flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors ${platform === p ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground hover:bg-card"}`}>{p === "ios" ? <Apple className="size-4" /> : <Smartphone className="size-4" />}{p === "ios" ? c.iphone : c.android}</button>)}
  </div>;

  const tip = !isDone && <div className="flex gap-3 rounded-xl bg-secondary p-3.5"><Lightbulb className="mt-0.5 size-5 shrink-0 text-cta" aria-hidden="true" /><p className="text-sm"><strong className="block text-foreground">{c.tipLabel}</strong><span className="text-muted-foreground">{current.tip}</span></p></div>;

  const done = <div className="text-center lg:text-left" role="status">
    <span className="mx-auto grid size-20 place-items-center rounded-full bg-primary text-primary-foreground motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-500 lg:mx-0"><Check className="size-11" strokeWidth={3} /></span>
    <h2 className="mt-5 font-display text-2xl font-bold text-foreground lg:text-3xl">{c.doneTitle}</h2>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground lg:mx-0 lg:text-base">{c.doneBody}</p>
    <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
      <Button asChild size="lg" className="min-h-12 flex-1"><Link to="/account/esims">{c.account}<ArrowRight className="size-4" /></Link></Button>
      <Button asChild size="lg" variant="outline" className="min-h-12 flex-1"><Link to="/destek"><CircleHelp className="size-4" />{c.support}</Link></Button>
    </div>
    <Button variant="link" onClick={() => setStep(0)} className="mt-2 text-primary">{c.restart}</Button>
  </div>;

  const nav = !isDone && <div className="flex gap-3">
    <Button variant="outline" size="lg" onClick={() => go(-1)} disabled={step === 0} className="min-h-12 lg:flex-1" aria-label={c.previous}><ChevronLeft className="size-4" /><span className="hidden lg:inline">{c.previous}</span></Button>
    <Button variant="cta" size="lg" onClick={() => go(1)} className="min-h-12 flex-1">{c.next}<ArrowRight className="size-4" /></Button>
  </div>;

  return <V2Shell service="esim">
    <main className="mx-auto max-w-6xl pb-24 lg:pb-16">
      <Button asChild variant="ghost" size="sm" className="mt-2 -ml-2 text-primary"><Link to="/esim" search={{ country: "" }}><ArrowLeft className="size-4" />{c.back}</Link></Button>

      <header className="mt-3 flex items-start justify-between gap-4 lg:mt-5">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-foreground lg:text-4xl"><span className="lg:hidden">{c.guideTitle}</span><span className="hidden lg:inline">{c.titleFor(deviceName)}</span></h1>
          <p className="mt-2 hidden max-w-2xl text-base text-muted-foreground lg:block">{c.lead}</p>
        </div>
        {deviceKnown && <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 shadow-soft">
          <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary"><Smartphone className="size-5" aria-hidden="true" /></span>
          <span className="text-xs"><strong className="block text-sm text-foreground">{deviceModel}</strong><span className="inline-flex items-center gap-1 font-semibold text-primary"><Check className="size-3" />{c.verified}</span></span>
        </div>}
      </header>

      <div className="mt-5">{tabs}</div>

      {/* Desktop progress */}
      <ol className="mt-8 hidden grid-cols-5 lg:grid" aria-label={c.guideTitle}>
        {c.steps.map((s, i) => <li key={s.label} className="relative flex flex-col items-center gap-2 text-center">
          {i > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 transition-colors duration-500 ${i <= step ? "bg-primary" : "bg-border"}`} aria-hidden="true" />}
          <button type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined} className={`relative z-10 grid size-9 place-items-center rounded-full border-2 text-sm font-bold transition-colors duration-300 ${i === step ? "border-primary bg-primary text-primary-foreground" : i < step ? "border-primary bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground"}`}>{i < step ? <Check className="size-4" /> : i + 1}</button>
          <span className={`text-sm ${i === step ? "font-bold text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
        </li>)}
      </ol>

      {/* Mobile progress */}
      <p className="mt-5 text-center text-xs font-semibold text-muted-foreground lg:hidden" aria-live="polite">{c.step} {step + 1} / {c.steps.length}</p>
      <h2 className="mt-1 text-center font-display text-xl font-bold text-foreground lg:hidden">{isDone ? "" : current.title}</h2>

      <div className="mt-4 grid gap-5 lg:mt-8 lg:grid-cols-[2fr_3fr] lg:gap-8">
        <div className={`relative flex items-center justify-center rounded-3xl bg-secondary py-6 lg:py-10 ${isDone ? "hidden lg:flex" : ""}`}>
          <PhoneVisual platform={platform} step={step} c={c} />
          {!isDone && <>
            <button type="button" onClick={() => go(-1)} disabled={step === 0} aria-label={c.previous} className="absolute left-3 grid size-9 place-items-center rounded-full border border-border bg-card text-foreground disabled:opacity-40 lg:hidden"><ChevronLeft className="size-4" /></button>
            <button type="button" onClick={() => go(1)} aria-label={c.next} className="absolute right-3 grid size-9 place-items-center rounded-full border border-border bg-card text-foreground lg:hidden"><ChevronRight className="size-4" /></button>
          </>}
        </div>

        <section key={`${locale}-${platform}-${step}`} className="flex flex-col justify-center gap-5 rounded-3xl lg:border lg:border-border lg:bg-card lg:p-8 lg:shadow-soft motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
          {isDone ? done : <>
            <div>
              <h2 className="hidden font-display text-3xl font-bold text-foreground lg:block">{step + 1}. {current.title}</h2>
              <p className="text-center text-sm leading-6 text-muted-foreground lg:mt-3 lg:text-left lg:text-lg lg:leading-7 lg:text-foreground/80">{body}</p>
            </div>
            {tip}
            {nav}
          </>}
        </section>
      </div>

      <div className="mt-5 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">{c.steps.map((s, i) => <span key={s.label} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-5 bg-primary" : "w-1.5 bg-border"}`} />)}</div>
    </main>
  </V2Shell>;
}
