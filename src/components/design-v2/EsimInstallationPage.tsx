import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Apple, ArrowLeft, ArrowRight, BatteryFull, Check, CircleHelp, Lightbulb, Link2, Plus, QrCode, Signal, Smartphone, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { useDeviceCheck } from "@/domain/esim/device-check-session";
import { V2Shell } from "./V2Shell";
import { localize } from "@/i18n/overlay";
import { DecorativeQr, InstallationPhone, useInstallationLabels, InstallationMethodSelector, InstallationSuccess, StepNavigation, TapIndicator, TravelUsageGuide, type InstallationMethod } from "./InstallationExperience";

type Platform = "ios" | "android";
type GuideStep = { label: string; title: string; ios: string; android: string; tip: string };

const GUIDE = localize({
  tr: {
    back: "Geri", guideTitle: "Kurulum rehberi", titleFor: (d: string) => `${d} için eSIM kurulumu`, lead: "Size uygun yöntemi seçin ve adımları takip edin.", iphone: "iOS (iPhone)", android: "Android", step: "Adım", tipLabel: "İpucu", previous: "Önceki", next: "Sonraki", verified: "eSIM uyumlu", recommended: "Önerilen", recommendationTitle: "En kolay yöntem: Hızlı Kurulum", recommendationBody: "Uyumlu cihazlarda kurulum bağlantısıyla eSIM'inizi birkaç adımda ekleyebilirsiniz. Alternatif olarak QR kodunu kullanabilirsiniz.",
    methodLabel: "Kurulum yöntemi", quick: "Hızlı Kurulum", qr: "QR Kod", quickIntro: "Tek dokunuşla kurulumu başlatın. Size ait gerçek bağlantı yalnızca hesabınızda görünür.", qrIntro: "QR kodunuzu başka bir ekranda açın ve telefonunuzla tarayın.",
    doneTitle: "Kurulum tamamlandı!", doneBody: "eSIM cihazınıza eklendi. Paketinizin aktivasyon koşullarını hesabınızdan kontrol edin.", account: "eSIM'lerime git", support: "Yardım Merkezi", restart: "Baştan başla", sample: "Örnek görsel · taranamaz",
    ui: { settings: "Ayarlar", cellular: "Hücresel", addEsim: "eSIM Ekle", dataLine: "Mobil Veri", roaming: "Veri Dolaşımı", connected: "Bağlı", line: "Seyahat eSIM", sim: "SIM yöneticisi", ready: "Hazır", install: "eSIM'i Yükle", installing: "eSIM yükleniyor...", confirm: "eSIM eklemeyi onayla" },
    quickSteps: [
      { label: "Bağlantıyı aç", title: "Hızlı Kurulum bağlantısını açın", ios: "Satın alma ve hazırlık tamamlandıktan sonra hesabınızdaki eSIM detayından size ait Hızlı Kurulum bağlantısını açın.", android: "Satın alma ve hazırlık tamamlandıktan sonra hesabınızdaki eSIM detayından size ait Hızlı Kurulum bağlantısını açın.", tip: "Gerçek kurulum bağlantısı yalnızca giriş yaptığınız hesabınızda görünür." },
      { label: "Yükle", title: "Kurulumu başlatın", ios: "Sistem penceresinde eSIM'i ekleme seçeneğine dokunun.", android: "Açılan sistem ekranında eSIM'i indirme veya ekleme seçeneğine dokunun.", tip: "Kurulum bitene kadar Wi-Fi bağlantınızı açık tutun." },
      { label: "Onayla", title: "Sistem onayını tamamlayın", ios: "Cihazınızın gösterdiği eSIM ekleme adımlarını kontrol edip onaylayın.", android: "Cihazınızın gösterdiği eSIM indirme adımlarını kontrol edip onaylayın.", tip: "Menü ve düğme adları cihaz ile yazılım sürümüne göre değişebilir." },
      { label: "Tamamlandı", title: "Tamamlandı", ios: "", android: "", tip: "" },
    ] as GuideStep[],
    qrSteps: [
      { label: "QR kodu aç", title: "QR kodu açın", ios: "Hesabınızdaki eSIM detayında size ait QR kodunu açın ve başka bir ekranda gösterin.", android: "Hesabınızdaki eSIM detayında size ait QR kodunu açın ve başka bir ekranda gösterin.", tip: "Gerçek QR kodunuz yalnızca hesabınızda görünür. Buradaki görsel örnektir." },
      { label: "eSIM ekle", title: "eSIM ekleyin", ios: "Ayarlar → Hücresel → eSIM Ekle → QR Kodu Kullan ile kodu tarayın.", android: "Ayarlar → Bağlantılar → SIM yöneticisi → eSIM ekle ile kodu tarayın.", tip: "Kurulum bitene kadar Wi-Fi bağlantınızı açık tutun." },
      { label: "Ayarlar", title: "Ayarları yapılandırın", ios: "Yeni hattı etiketleyin ve Mobil Veri için seyahat eSIM'inizi seçin. Ana hattınız arama için kalabilir.", android: "SIM yöneticisinde mobil veri için yeni eSIM'i seçin. Ana hattınız arama için kalabilir.", tip: "Menü adları cihaza ve yazılım sürümüne göre değişebilir." },
      { label: "Etkinleştir", title: "Etkinleştirin", ios: "Hedef ülkeye vardığınızda hattı açın; paket talimatları gerektiriyorsa bu hat için Veri Dolaşımı'nı etkinleştirin.", android: "Hedef ülkeye vardığınızda eSIM'i açın; paket talimatları gerektiriyorsa Veri dolaşımı'nı etkinleştirin.", tip: "Ana hattınızda istenmeyen kullanım oluşmaması için mobil veri seçiminizi kontrol edin." },
      { label: "Tamamlandı", title: "Tamamlandı", ios: "", android: "", tip: "" },
    ] as GuideStep[],
    travelTitle: "eSIM'iniz kuruldu. Şimdi ne yapmalısınız?", travelLead: "Seyahatte bağlantıyı kullanmadan önce bu kontrolleri tamamlayın.", travelSteps: ["Seyahat eSIM hattını açın.", "Mobil veri için seyahat eSIM'ini seçin.", "Paket talimatları gerektiriyorsa veri dolaşımını bu hat için açın.", "Bağlantıyı kontrol edin; gerekirse cihazı yeniden başlatın."],
  },
  de: {
    back: "Zurück", guideTitle: "Installationsanleitung", titleFor: (d: string) => `eSIM-Einrichtung für ${d}`, lead: "Wähle deine Methode und folge den Schritten.", iphone: "iOS (iPhone)", android: "Android", step: "Schritt", tipLabel: "Tipp", previous: "Zurück", next: "Weiter", verified: "eSIM-fähig", recommended: "Empfohlen", recommendationTitle: "Einfachste Methode: Schnellinstallation", recommendationBody: "Auf kompatiblen Geräten kannst du deine eSIM in wenigen Schritten über den Installationslink hinzufügen. Alternativ kannst du den QR-Code verwenden.",
    methodLabel: "Installationsmethode", quick: "Schnellinstallation", qr: "QR-Code", quickIntro: "Starte die Installation mit einem Tippen. Dein persönlicher Link ist nur in deinem Konto sichtbar.", qrIntro: "Öffne deinen QR-Code auf einem anderen Bildschirm und scanne ihn mit deinem Handy.",
    doneTitle: "Einrichtung abgeschlossen!", doneBody: "Die eSIM wurde deinem Gerät hinzugefügt. Prüfe die Aktivierungsbedingungen deines Pakets in deinem Konto.", account: "Zu meinen eSIMs", support: "Hilfe-Center", restart: "Von vorn beginnen", sample: "Beispielbild · nicht scanbar",
    ui: { settings: "Einstellungen", cellular: "Mobilfunk", addEsim: "eSIM hinzufügen", dataLine: "Mobile Daten", roaming: "Datenroaming", connected: "Verbunden", line: "Reise-eSIM", sim: "SIM-Manager", ready: "Bereit", install: "eSIM installieren", installing: "eSIM wird installiert...", confirm: "eSIM hinzufügen bestätigen" },
    quickSteps: [
      { label: "Link öffnen", title: "Schnellinstallations-Link öffnen", ios: "Öffne nach Kauf und Bereitstellung deinen persönlichen Schnellinstallations-Link in den eSIM-Details deines Kontos.", android: "Öffne nach Kauf und Bereitstellung deinen persönlichen Schnellinstallations-Link in den eSIM-Details deines Kontos.", tip: "Der echte Installations-Link ist nur in deinem angemeldeten Konto sichtbar." },
      { label: "Installieren", title: "Installation starten", ios: "Tippe im Systemfenster auf die Option zum Hinzufügen der eSIM.", android: "Tippe im Systemfenster auf die Option zum Herunterladen oder Hinzufügen der eSIM.", tip: "Bleibe bis zum Abschluss mit dem WLAN verbunden." },
      { label: "Bestätigen", title: "Systembestätigung abschließen", ios: "Prüfe und bestätige die Schritte zum Hinzufügen der eSIM auf deinem Gerät.", android: "Prüfe und bestätige die Schritte zum Herunterladen der eSIM auf deinem Gerät.", tip: "Menünamen können je nach Gerät und Softwareversion abweichen." },
      { label: "Fertig", title: "Fertig", ios: "", android: "", tip: "" },
    ] as GuideStep[],
    qrSteps: [
      { label: "QR-Code öffnen", title: "QR-Code öffnen", ios: "Öffne deinen eigenen QR-Code in den eSIM-Details deines Kontos und zeige ihn auf einem zweiten Bildschirm an.", android: "Öffne deinen eigenen QR-Code in den eSIM-Details deines Kontos und zeige ihn auf einem zweiten Bildschirm an.", tip: "Dein echter QR-Code erscheint nur in deinem Konto. Diese Abbildung ist ein Beispiel." },
      { label: "eSIM hinzufügen", title: "eSIM hinzufügen", ios: "Einstellungen → Mobilfunk → eSIM hinzufügen → QR-Code verwenden und den Code scannen.", android: "Einstellungen → Verbindungen → SIM-Manager → eSIM hinzufügen und den Code scannen.", tip: "Bleibe bis zum Abschluss mit dem WLAN verbunden." },
      { label: "Einstellungen", title: "Einstellungen anpassen", ios: "Benenne die neue Leitung und wähle deine Reise-eSIM für mobile Daten. Deine Hauptleitung kann für Anrufe bleiben.", android: "Wähle im SIM-Manager die neue eSIM für mobile Daten. Deine Hauptleitung kann für Anrufe bleiben.", tip: "Menünamen können je nach Gerät und Softwareversion abweichen." },
      { label: "Aktivieren", title: "Aktivieren", ios: "Schalte die Leitung am Ziel ein und aktiviere Datenroaming für diese Leitung, wenn die Pakethinweise es verlangen.", android: "Schalte die eSIM am Ziel ein und aktiviere Datenroaming, wenn die Pakethinweise es verlangen.", tip: "Prüfe deine Auswahl für mobile Daten, um unerwünschte Nutzung der Hauptleitung zu vermeiden." },
      { label: "Fertig", title: "Fertig", ios: "", android: "", tip: "" },
    ] as GuideStep[],
    travelTitle: "Deine eSIM ist installiert. Was kommt jetzt?", travelLead: "Prüfe diese Einstellungen, bevor du die Verbindung auf deiner Reise nutzt.", travelSteps: ["Schalte die Reise-eSIM ein.", "Wähle die Reise-eSIM für mobile Daten.", "Aktiviere Datenroaming für diese Leitung, wenn die Pakethinweise es verlangen.", "Prüfe die Verbindung und starte das Gerät bei Bedarf neu."],
  },
  en: {
    back: "Back", guideTitle: "Installation guide", titleFor: (d: string) => `eSIM setup for ${d}`, lead: "Choose the method that suits you and follow the steps.", iphone: "iOS (iPhone)", android: "Android", step: "Step", tipLabel: "Tip", previous: "Previous", next: "Next", verified: "eSIM compatible", recommended: "Recommended", recommendationTitle: "Easiest method: Quick Install", recommendationBody: "On compatible devices, add your eSIM in a few steps using the installation link. Alternatively, you can use the QR code.",
    methodLabel: "Installation method", quick: "Quick Install", qr: "QR Code", quickIntro: "Start installation with one tap. Your personal link only appears in your account.", qrIntro: "Open your QR code on another screen and scan it with your phone.",
    doneTitle: "Setup complete!", doneBody: "The eSIM has been added to your device. Check your plan's activation conditions in your account.", account: "Go to my eSIMs", support: "Help Center", restart: "Start over", sample: "Sample image · not scannable",
    ui: { settings: "Settings", cellular: "Cellular", addEsim: "Add eSIM", dataLine: "Mobile Data", roaming: "Data Roaming", connected: "Connected", line: "Travel eSIM", sim: "SIM manager", ready: "Ready", install: "Install eSIM", installing: "Installing eSIM...", confirm: "Confirm adding eSIM" },
    quickSteps: [
      { label: "Open link", title: "Open the Quick Install link", ios: "After purchase and preparation are complete, open your personal Quick Install link from the eSIM details in your account.", android: "After purchase and preparation are complete, open your personal Quick Install link from the eSIM details in your account.", tip: "Your real installation link only appears in your signed-in account." },
      { label: "Install", title: "Start installation", ios: "Tap the option to add the eSIM in the system prompt.", android: "Tap the option to download or add the eSIM in the system prompt.", tip: "Stay connected to Wi-Fi until installation finishes." },
      { label: "Confirm", title: "Complete system confirmation", ios: "Review and confirm the eSIM addition steps shown by your device.", android: "Review and confirm the eSIM download steps shown by your device.", tip: "Menu and button names may vary by device and software version." },
      { label: "Done", title: "Done", ios: "", android: "", tip: "" },
    ] as GuideStep[],
    qrSteps: [
      { label: "Open QR code", title: "Open the QR code", ios: "Open your own QR code from the eSIM details in your account and show it on another screen.", android: "Open your own QR code from the eSIM details in your account and show it on another screen.", tip: "Your real QR code only appears in your account. This image is a sample." },
      { label: "Add eSIM", title: "Add the eSIM", ios: "Settings → Cellular → Add eSIM → Use QR Code, then scan the code.", android: "Settings → Connections → SIM manager → Add eSIM, then scan the code.", tip: "Stay connected to Wi-Fi until installation finishes." },
      { label: "Settings", title: "Configure settings", ios: "Label the new line and choose your travel eSIM for Mobile Data. Your main line can stay for calls.", android: "In SIM manager, choose the new eSIM for mobile data. Your main line can stay for calls.", tip: "Menu names may vary by device and software version." },
      { label: "Activate", title: "Activate", ios: "At your destination, turn the line on and enable Data Roaming for it if your plan instructions require this.", android: "At your destination, turn the eSIM on and enable Data roaming if your plan instructions require this.", tip: "Check your mobile data selection to avoid unwanted use on your main line." },
      { label: "Done", title: "Done", ios: "", android: "", tip: "" },
    ] as GuideStep[],
    travelTitle: "Your eSIM is installed. What should you do next?", travelLead: "Complete these checks before using your connection while travelling.", travelSteps: ["Turn on the travel eSIM line.", "Choose the travel eSIM for mobile data.", "Enable data roaming for this line if your plan instructions require it.", "Check the connection and restart the device if needed."],
  },
} as const);

const MANUAL_GUIDE = localize({
  tr: { title:"Manuel kurulum", code:"Aktivasyon kodu", ios:"Ayarlar → Hücresel → eSIM Ekle → Ayrıntıları Elle Gir bölümünde hesabınızdaki SM-DP+ adresini ve aktivasyon kodunu girin.", android:"Ayarlar → Bağlantılar → SIM yöneticisi → eSIM ekle → Kodu elle gir bölümünde hesabınızdaki kurulum bilgilerini girin." },
  de: { title:"Manuelle Installation", code:"Aktivierungscode", ios:"Unter Einstellungen → Mobilfunk → eSIM hinzufügen → Details manuell eingeben trägst du die SM-DP+-Adresse und den Aktivierungscode aus deinem Konto ein.", android:"Unter Einstellungen → Verbindungen → SIM-Manager → eSIM hinzufügen → Code manuell eingeben trägst du die Installationsdaten aus deinem Konto ein." },
  en: { title:"Manual installation", code:"Activation code", ios:"In Settings → Cellular → Add eSIM → Enter Details Manually, enter the SM-DP+ address and activation code from your account.", android:"In Settings → Connections → SIM manager → Add eSIM → Enter code manually, enter the installation details from your account." },
});

type Guide = (typeof GUIDE)[keyof typeof GUIDE];

function Toggle({ on }: { on: boolean }) { return <span className={`relative inline-flex h-4 w-8 shrink-0 items-center rounded-full ${on ? "bg-primary" : "bg-border"}`}><span className={`absolute size-3.5 rounded-full bg-card shadow transition-all ${on ? "left-[calc(100%-1rem)]" : "left-0.5"}`} /></span>; }
function Row({ label, right, highlight }: { label: string; right?: ReactNode; highlight?: boolean }) {
  return <div className={`installation-row ${highlight ? "bg-primary-soft text-primary" : "text-foreground"}`}><span>{label}</span>{right}</div>;
}

function PhoneScreen({ platform, method, step, c }: { platform: Platform; method: InstallationMethod | "manual"; step: number; c: Guide }) {
  const labels = useInstallationLabels();
  const { locale } = useI18n();
  if (method === "manual" && step === 0) return <div className="installation-stack"><p className="font-bold">{MANUAL_GUIDE[locale].title}</p><Row label="SM-DP+" right={<span aria-hidden="true">••••••</span>} /><Row label={MANUAL_GUIDE[locale].code} right={<span aria-hidden="true">••••••</span>} /><p className="text-muted-foreground">{c.sample}</p></div>;
  if (method === "quick") {
    if (step === 0) return <div className="installation-stack"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Link2 className="size-6" /></span><p className="font-bold">{labels.link}</p><div className="installation-action install-tap-target bg-primary text-primary-foreground">{labels.link}<TapIndicator className="bottom-3 end-3" /></div></div>;
    if (step === 1) return <div className="installation-stack rounded-xl bg-card p-3"><Smartphone className="size-8 shrink-0 text-primary" /><p className="font-bold">{c.ui.install}</p><div className="installation-action install-tap-target bg-primary text-primary-foreground">{c.ui.addEsim}<TapIndicator className="bottom-3 end-3" /></div></div>;
    if (step === 2) return <div className="installation-stack rounded-xl bg-card p-3"><p className="font-bold">{c.ui.confirm}</p><div className="h-1.5 w-full rounded-full bg-muted"><span className="v2-progress block h-full rounded-full bg-primary" /></div><p className="text-muted-foreground">{c.ui.installing}</p></div>;
    return <InstallationSuccess label={c.ui.ready} />;
  }
  if (step === 0) return <div className="installation-stack"><div className="installation-qr-wrap"><DecorativeQr /><span className="installation-scanline bg-primary" /></div><p className="text-muted-foreground">{c.sample}</p></div>;
  if (step === 1) return <div className="installation-stack"><p className="font-bold">{platform === "ios" ? c.ui.cellular : c.ui.sim}</p><div className="install-tap-target relative w-full"><Row label={c.ui.addEsim} highlight right={<Plus className="size-4 shrink-0" />} /><TapIndicator className="bottom-3 end-3" /></div></div>;
  if (step === 2) return <div className="installation-stack"><p className="font-bold">{c.ui.settings}</p><Row label={c.ui.dataLine} right={<span className="font-bold text-primary">{c.ui.line}</span>} highlight /><Row label={c.ui.line} right={<Toggle on />} /></div>;
  if (step === 3) return <div className="installation-stack"><p className="font-bold">{c.ui.settings}</p><Row label={c.ui.roaming} right={<Toggle on />} highlight /><div className="installation-stack rounded-xl bg-primary-soft p-3 text-primary"><Signal className="size-7 shrink-0" /><span className="font-bold">{c.ui.connected}</span></div></div>;
  return <InstallationSuccess label={c.ui.ready} />;
}

function PhoneVisual({ platform, method, step, c }: { platform: Platform; method: InstallationMethod | "manual"; step: number; c: Guide }) {
  return <InstallationPhone android={platform === "android"} phase={`${platform}-${method}-${step}`}><PhoneScreen platform={platform} method={method} step={step} c={c}/></InstallationPhone>;
}

/** Account education reuses the public phone scenes without quick links or activation claims. */
export function AccountInstallationWalkthrough({ platform, method = "qr" }: { platform: Platform; method?: "qr" | "manual" }) {
  const { locale } = useI18n();
  const c = GUIDE[locale];
  const [step, setStep] = useState(0);
  const steps = c.qrSteps.slice(0, 3).map((item, index) => method === "manual" && index === 0 ? { ...item, title:MANUAL_GUIDE[locale].title, ios:MANUAL_GUIDE[locale].ios, android:MANUAL_GUIDE[locale].android } : item);
  const current = steps[step] ?? steps[0];
  useEffect(() => { setStep(0); }, [platform, method]);
  if (!current) return null;
  return <div data-account-walkthrough className="grid gap-4">
    <div className="grid place-items-center rounded-lg bg-secondary py-5">
      <PhoneVisual platform={platform} method={method} step={step} c={c} />
      <p className="mt-3 text-xs text-muted-foreground">{c.sample}</p>
    </div>
    <div aria-live="polite">
      <p className="text-xs font-semibold text-primary">{c.step} {step + 1} / {steps.length}</p>
      <h3 className="mt-1 text-base font-bold">{current.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{platform === 'ios' ? current.ios : current.android}</p>
    </div>
    <StepNavigation previous={c.previous} next={c.next} steps={steps} current={step} onSelect={setStep} stepLabel={c.step} />
  </div>;
}

export function EsimInstallationPage({ initialPlatform }: { initialPlatform: Platform }) {
  const { locale } = useI18n();
  const c = GUIDE[locale];
  const labels = useInstallationLabels();
  const navigate = useNavigate();
  const { deviceModel, compatibilityResult } = useDeviceCheck();
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [method, setMethod] = useState<InstallationMethod>("quick");
  const [step, setStep] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [manualNavigation, setManualNavigation] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const steps = method === "quick" ? c.quickSteps : c.qrSteps;
  const last = steps.length - 1;
  const current = steps[step] ?? steps[0];
  const isDone = step === last;

  useEffect(() => { setPlatform(initialPlatform); setStep(0); }, [initialPlatform]);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (reducedMotion || manualNavigation) return;
    const timer = window.setTimeout(() => setStep((value) => value >= last ? 0 : value + 1), isDone ? 4000 : 3000);
    return () => window.clearTimeout(timer);
  }, [isDone, last, method, platform, reducedMotion, manualNavigation, step, timerKey]);
  if (!current) return null;

  const deviceKnown = compatibilityResult === "COMPATIBLE" && deviceModel;
  const deviceName = deviceKnown ? deviceModel : platform === "ios" ? "iPhone" : "Android";
  const body = platform === "ios" ? current.ios : current.android;
  const selectMethod = (next: InstallationMethod) => { setMethod(next); setStep(0); setTimerKey((key) => key + 1); };
  const setManualStep = (next: number) => { setManualNavigation(true); setStep(Math.min(last, Math.max(0, next))); setTimerKey((key) => key + 1); };
  const changePlatform = (next: Platform) => { setPlatform(next); setStep(0); setTimerKey((key) => key + 1); void navigate({ to: "/esim/kurulum", search: { platform: next, brand: "" }, replace: true }); };

  return <V2Shell service="esim"><main className="mx-auto max-w-6xl pb-24 lg:pb-16">
    <Button asChild variant="ghost" size="sm" className="mt-2 -ml-2 text-primary"><Link to="/esim" search={{ country: "" }}><ArrowLeft className="size-4 rtl:rotate-180"/>{c.back}</Link></Button>
    <header className="mt-3 flex items-start justify-between gap-4 lg:mt-5"><div className="min-w-0"><h1 className="font-display text-2xl font-bold text-foreground lg:text-4xl"><span className="lg:hidden">{c.guideTitle}</span><span className="hidden lg:inline">{c.titleFor(deviceName)}</span></h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground lg:text-base">{c.lead}</p></div>{deviceKnown && <div className="hidden shrink-0 items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 shadow-soft sm:flex"><span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary"><Smartphone className="size-5"/></span><span className="text-xs"><strong className="block text-sm">{deviceModel}</strong><span className="inline-flex items-center gap-1 font-semibold text-primary"><Check className="size-3"/>{c.verified}</span></span></div>}</header>
    <div className="mt-5 grid gap-3 sm:max-w-xl"><div className="rounded-xl bg-primary-soft px-3 py-2.5 ring-1 ring-primary/15"><div className="flex min-w-0 items-center gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Link2 className="size-3.5"/></span><strong className="min-w-0 text-sm text-foreground">{c.recommendationTitle}</strong></div><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.recommendationBody}</p></div><InstallationMethodSelector value={method} onChange={selectMethod} quickLabel={labels.quickTab} qrLabel={labels.qrTab} ariaLabel={c.methodLabel} recommendedLabel={c.recommended}/><p className="text-sm leading-relaxed text-muted-foreground">{method === "quick" ? c.quickIntro : c.qrIntro}</p><div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1" role="group" aria-label={c.guideTitle}>{(["ios", "android"] as const).map((item) => <Button key={item} type="button" variant={platform === item ? "default" : "ghost"} onClick={() => changePlatform(item)} className="min-h-11 rounded-xl"><span>{item === "ios" ? <Apple className="size-4"/> : <Smartphone className="size-4"/>}</span>{item === "ios" ? c.iphone : c.android}</Button>)}</div></div>

    <p className="mt-5 text-center text-xs font-semibold text-muted-foreground lg:hidden" aria-live="polite">{c.step} {step + 1} / {steps.length}</p><h2 className="mt-1 text-center font-display text-xl font-bold lg:hidden">{isDone ? c.doneTitle : current.title}</h2>
    <div className="mt-4 grid gap-5 lg:mt-8 lg:grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)] lg:gap-7"><div className="relative rounded-3xl bg-secondary py-6 lg:py-8"><div className="flex items-center justify-center"><PhoneVisual platform={platform} method={method} step={step} c={c}/></div><div className="mx-auto mt-4 w-full px-3"><StepNavigation previous={c.previous} next={c.next} steps={steps} current={step} onSelect={setManualStep} stepLabel={c.step}/></div></div><section key={`${locale}-${platform}-${method}-${step}`} className="flex flex-col justify-center gap-5 rounded-3xl lg:border lg:border-border lg:bg-card lg:p-7 lg:shadow-soft motion-safe:animate-in motion-safe:fade-in">{isDone ? <div className="text-center lg:text-start" role="status"><h2 className="font-display text-2xl font-bold lg:text-3xl">{c.doneTitle}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground lg:mx-0 lg:text-base">{c.doneBody}</p><div className="mt-6 flex flex-col gap-2.5 sm:flex-row"><Button asChild size="lg" className="min-h-12 flex-1"><Link to="/account/esims">{c.account}<ArrowRight className="size-4 rtl:rotate-180"/></Link></Button><Button asChild size="lg" variant="outline" className="min-h-12 flex-1"><Link to="/destek"><CircleHelp className="size-4"/>{c.support}</Link></Button></div></div> : <><div><h2 className="hidden font-display text-3xl font-bold lg:block">{step + 1}. {current.title}</h2><p className="text-center text-sm leading-6 text-muted-foreground lg:mt-3 lg:text-start lg:text-lg lg:leading-7">{body}</p></div><div className="flex gap-3 rounded-xl bg-secondary p-3.5"><Lightbulb className="mt-0.5 size-5 shrink-0 text-cta"/><p className="text-sm"><strong className="block">{c.tipLabel}</strong><span className="text-muted-foreground">{current.tip}</span></p></div></>}</section></div>
    <TravelUsageGuide title={c.travelTitle} lead={c.travelLead} steps={c.travelSteps}/>
  </main></V2Shell>;
}
