import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  HelpCircle,
  Info,
  LoaderCircle,
  Search,
  Smartphone,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/i18n";
import { listDeviceCompatibility } from "@/lib/device-compatibility.functions";
import {
  searchDevices,
  type CompatibilityStatus,
  type DeviceRecord,
} from "@/domain/esim/device-compatibility";
import { useDeviceCheck } from "@/domain/esim/device-check-session";
import { noopAnalyticsSink } from "@/domain/analytics";
import type { Locale } from "@/domain/enums";
import { localize } from "@/i18n/overlay";

const COPY = localize({
  tr: {
    sectionTitle: "Telefonun eSIM uyumlu mu?",
    sectionLead: "Satın almadan önce birkaç saniyede kontrol et.",
    check: "Telefonumu kontrol et",
    recheck: "Uyumluluğu kontrol et",
    change: "Değiştir",
    dontKnow: "Modelini bilmiyor musun?",
    howTo: "Nasıl kontrol edilir?",
    sheetTitle: "Telefonum eSIM uyumlu mu?",
    sheetLead: "Markanı seç, ardından modelini ara.",
    searchPlaceholder: "Telefon modelini ara",
    modelPlaceholder: "Model ara...",
    chooseBrand: "Marka seç",
    guide: "Kurulum rehberini görüntüle",
    brand: "Marka",
    model: "Model",
    noResult: "Bu model kayıtlarımızda yok; eSIM uyumunu doğrulayamadık. Cihazından veya üreticiden kontrol et.",
    compatible: "Bu model eSIM destekliyor.",
    uncertain: "Bu model için eSIM desteğini doğrulayamadık. Cihaz ayarlarından veya üretici bilgilerinden kontrol edebilirsiniz.",
    notCompatible: "Bu model için eSIM desteği bulunamadı.",
    ctaCompatible: "Paketimi seç",
    ctaUncertain: "Telefonda kontrol et",
    ctaNot: "Başka cihaz kontrol et",
    statusCompatible: "Uyumlu",
    statusUncertain: "Kontrol gerekli",
    statusNot: "Uyumsuz",
    manualTitle: "Telefonda nasıl kontrol edilir?",
    manualIphone: "iPhone: Ayarlar → Genel → Hakkında bölümünde EID satırını ara.",
    manualAndroid:
      "Android: Ayarlar → Telefon hakkında / SIM yöneticisi bölümünde eSIM ya da EID satırını ara.",
    manualDial: "*#06# tuşlayıp EID görünüyorsa cihaz genellikle eSIM destekler.",
    disclaimerTitle: "Kısa not",
    disclaimer:
      "Cihaz eSIM desteği ile operatör veya bölge kısıtlamaları farklı konulardır. Bazı bölgesel model varyantlarında eSIM kapalı olabilir.",
    regionNote: "Bu modelde bölgesel varyant farkı olabilir.",
    checked: "eSIM uyumlu",
    checkedUncertain: "Kontrol gerekli",
    checkedNot: "eSIM desteği bulunamadı",
    productPrompt: "Telefonun eSIM destekliyor mu?",
  },
  de: {
    sectionTitle: "Ist dein Handy eSIM-fähig?",
    sectionLead: "Prüfe es in wenigen Sekunden vor dem Kauf.",
    check: "Mein Handy prüfen",
    recheck: "Kompatibilität prüfen",
    change: "Ändern",
    dontKnow: "Modell unbekannt?",
    howTo: "Wie prüfe ich das?",
    sheetTitle: "Ist mein Handy eSIM-fähig?",
    sheetLead: "Wähle zuerst die Marke, dann dein Modell.",
    searchPlaceholder: "Handymodell suchen",
    modelPlaceholder: "Modell suchen...",
    chooseBrand: "Marke wählen",
    guide: "Installationsanleitung ansehen",
    brand: "Marke",
    model: "Modell",
    noResult: "Dieses Modell ist nicht in unserer Liste. Wir können die eSIM-Unterstützung nicht bestätigen; prüfe Gerät oder Herstellerangaben.",
    compatible: "Dieses Modell unterstützt eSIM.",
    uncertain: "Wir konnten die eSIM-Unterstützung für dieses Modell nicht bestätigen. Prüfe die Geräteeinstellungen oder Herstellerangaben.",
    notCompatible: "Für dieses Modell wurde keine eSIM-Unterstützung gefunden.",
    ctaCompatible: "Paket auswählen",
    ctaUncertain: "Am Gerät prüfen",
    ctaNot: "Anderes Gerät prüfen",
    statusCompatible: "Kompatibel",
    statusUncertain: "Prüfen",
    statusNot: "Nicht kompatibel",
    manualTitle: "Wie prüfe ich es am Gerät?",
    manualIphone: "iPhone: Einstellungen → Allgemein → Info und dort nach EID suchen.",
    manualAndroid:
      "Android: Einstellungen → Über das Telefon / SIM-Manager und dort nach eSIM oder EID suchen.",
    manualDial:
      "Wird nach Eingabe von *#06# eine EID angezeigt, ist das Gerät in der Regel eSIM-fähig.",
    disclaimerTitle: "Kurzer Hinweis",
    disclaimer:
      "Geräte-eSIM-Unterstützung und Anbieter- oder Regionsbeschränkungen sind zwei verschiedene Dinge. Bei einzelnen regionalen Varianten kann eSIM deaktiviert sein.",
    regionNote: "Bei diesem Modell können regionale Varianten abweichen.",
    checked: "eSIM-fähig",
    checkedUncertain: "Prüfen",
    checkedNot: "Keine eSIM-Unterstützung",
    productPrompt: "Unterstützt dein Handy eSIM?",
  },
  en: {
    sectionTitle: "Is your phone eSIM compatible?",
    sectionLead: "Check it in a few seconds before you buy.",
    check: "Check my phone",
    recheck: "Check compatibility",
    change: "Change",
    dontKnow: "Don't know your model?",
    howTo: "How do I check?",
    sheetTitle: "Is my phone eSIM compatible?",
    sheetLead: "Choose your brand, then search for your model.",
    searchPlaceholder: "Search your phone model",
    modelPlaceholder: "Search model...",
    chooseBrand: "Choose brand",
    guide: "View installation guide",
    brand: "Brand",
    model: "Model",
    noResult: "This model isn't in our list. We can't confirm eSIM support; check your device or manufacturer information.",
    compatible: "This model supports eSIM.",
    uncertain: "We could not verify eSIM support for this model. Check your device settings or manufacturer information.",
    notCompatible: "No eSIM support found for this model.",
    ctaCompatible: "Choose my package",
    ctaUncertain: "Check on the device",
    ctaNot: "Check another device",
    statusCompatible: "Compatible",
    statusUncertain: "Check device",
    statusNot: "Not compatible",
    manualTitle: "How to check on the device",
    manualIphone: "iPhone: Settings → General → About and look for the EID line.",
    manualAndroid: "Android: Settings → About phone / SIM manager and look for eSIM or EID.",
    manualDial:
      "If an EID is shown after dialling *#06#, the device generally has eSIM capability.",
    disclaimerTitle: "Short note",
    disclaimer:
      "Device eSIM support and carrier or regional restrictions are separate topics. Some regional variants may ship with eSIM disabled.",
    regionNote: "Regional variants of this model may differ.",
    checked: "eSIM compatible",
    checkedUncertain: "Check device",
    checkedNot: "No eSIM support",
    productPrompt: "Does your phone support eSIM?",
  },
} satisfies Record<Locale, Record<string, string>>);

type Copy = (typeof COPY)["tr"];

function statusLabel(copy: Copy, status: CompatibilityStatus) {
  if (status === "COMPATIBLE") return copy.statusCompatible;
  if (status === "NOT_COMPATIBLE") return copy.statusNot;
  return copy.statusUncertain;
}

function StatusIcon({ status }: { status: CompatibilityStatus }) {
  if (status === "COMPATIBLE")
    return <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />;
  if (status === "NOT_COMPATIBLE")
    return <XCircle className="size-5 shrink-0 text-destructive" aria-hidden="true" />;
  return <CircleHelp className="size-5 shrink-0 text-cta" aria-hidden="true" />;
}

const EXTRA = localize({
  tr: { eyebrow: "CİHAZ UYUMLULUĞU", title: "Cihazınız eSIM ile uyumlu mu?", lead: "Marka ve modelinizi seçerek kolayca kontrol edin.", brandSelect: "Marka seçin", modelSelect: "Model seçin", checkCta: "Uyumluluğu kontrol et", okTitle: "Bu cihaz eSIM ile uyumlu ✓", okBody: (m: string) => `${m} cihazınız eSIM kullanımı için uygundur.`, notTitle: "Bu cihaz eSIM desteklemiyor", unknownTitle: "eSIM desteği doğrulanamadı", badge: "eSIM uyumlu" },
  de: { eyebrow: "GERÄTEKOMPATIBILITÄT", title: "Ist dein Gerät eSIM-fähig?", lead: "Wähle Marke und Modell und prüfe es ganz einfach.", brandSelect: "Marke wählen", modelSelect: "Modell wählen", checkCta: "Kompatibilität prüfen", okTitle: "Dieses Gerät ist eSIM-fähig ✓", okBody: (m: string) => `Dein ${m} ist für die eSIM-Nutzung geeignet.`, notTitle: "Dieses Gerät unterstützt keine eSIM", unknownTitle: "eSIM-Unterstützung nicht bestätigt", badge: "eSIM-fähig" },
  en: { eyebrow: "DEVICE COMPATIBILITY", title: "Is your device eSIM compatible?", lead: "Pick your brand and model to check in seconds.", brandSelect: "Select brand", modelSelect: "Select model", checkCta: "Check compatibility", okTitle: "This device is eSIM compatible ✓", okBody: (m: string) => `Your ${m} can use an eSIM.`, notTitle: "This device doesn't support eSIM", unknownTitle: "eSIM support not verified", badge: "eSIM compatible" },
} as const);

/** Generic, non-branded phone illustration (no manufacturer imagery). */
function CheckerPhone({ badge }: { badge: string }) {
  return (
    <div className="relative hidden h-36 w-32 shrink-0 sm:block" aria-hidden="true">
      <div className="absolute right-2 top-0 h-40 w-[5.5rem] rounded-[1.4rem] border-[4px] border-foreground/85 bg-gradient-to-b from-primary-soft to-card shadow-panel">
        <span className="mx-auto mt-1.5 block h-2 w-8 rounded-full bg-foreground/85" />
        <span className="mx-auto mt-8 grid size-9 place-items-center rounded-xl bg-card text-primary shadow-soft"><Smartphone className="size-5" /></span>
      </div>
      <span className="absolute -left-3 bottom-3 flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[11px] font-bold shadow-panel"><CheckCircle2 className="size-4 text-primary" />{badge}</span>
    </div>
  );
}

export function DeviceCheckSheet({ surface, trigger }: { surface: string; trigger: ReactNode }) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const x = EXTRA[locale];
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [pending, setPending] = useState<DeviceRecord | null>(null);
  const [selected, setSelected] = useState<DeviceRecord | null>(null);
  const { setResult, reset: resetResult } = useDeviceCheck();

  const { data: devices = [], isPending } = useQuery({
    queryKey: ["device-compatibility"],
    queryFn: () => listDeviceCompatibility(),
    staleTime: 10 * 60 * 1000,
    enabled: open,
  });

  const brands = useMemo(() => [...new Set(devices.map((device) => device.brand))].sort(), [devices]);
  const results = useMemo(
    () => brand ? searchDevices(devices, query, brand) : [],
    [devices, query, brand],
  );

  const reset = () => {
    setSelected(null);
    setPending(null);
    setQuery("");
    setBrand(null);
    setListOpen(false);
  };

  const runCheck = () => {
    if (!pending) return;
    setSelected(pending);
    setResult(pending.model, pending.status);
    void noopAnalyticsSink.track({ name: "compatibility_result_viewed", result: pending.status, brand: pending.brand });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void noopAnalyticsSink.track({ name: "compatibility_checker_opened", surface });
        else reset();
      }}
    >
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        overlayClassName="compatibility-backdrop"
        closeClassName="right-3 top-3 sm:right-4 sm:top-4"
        className="compatibility-sheet max-h-[88svh] overflow-y-auto rounded-t-2xl pb-28 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[86vh] sm:w-[min(40rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:pb-6"
      >
        <span className="mx-auto mb-1 block h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden="true" />
        <SheetHeader className="flex-row items-start justify-between gap-4 space-y-0 px-4 text-left sm:px-6">
          <div className="min-w-0 pr-8 sm:pr-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{x.eyebrow}</p>
            <SheetTitle className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">{x.title}</SheetTitle>
            <SheetDescription className="mt-2">{x.lead}</SheetDescription>
          </div>
          <CheckerPhone badge={x.badge} />
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4 pt-2 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <label htmlFor="device-brand" className="mb-1.5 block text-sm font-semibold">{x.brandSelect}</label>
            <select
              id="device-brand"
              value={brand ?? ""}
              onChange={(event) => { setBrand(event.target.value || null); setPending(null); setSelected(null); setQuery(""); setListOpen(Boolean(event.target.value)); resetResult(); }}
              className="min-h-12 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
            >
              <option value="">{x.brandSelect}</option>
              {brands.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>

            <p className="mb-1.5 mt-4 block text-sm font-semibold" id="device-model-label">{x.modelSelect}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="relative min-w-0 flex-1">
                <button
                  type="button"
                  disabled={!brand}
                  aria-haspopup="listbox"
                  aria-expanded={listOpen}
                  aria-labelledby="device-model-label"
                  onClick={() => setListOpen((v) => !v)}
                  className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border bg-card px-3 text-left text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${listOpen ? "border-primary" : "border-border"}`}
                >
                  <span className={`truncate ${pending ? "text-foreground" : "text-muted-foreground"}`}>{pending?.model ?? x.modelSelect}</span>
                  <ChevronRight className={`size-4 shrink-0 text-muted-foreground transition-transform ${listOpen ? "-rotate-90" : "rotate-90"}`} aria-hidden="true" />
                </button>
                {brand && listOpen && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-panel motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1">
                    <span className="flex min-h-11 items-center gap-2 border-b border-border px-3">
                      <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                      <input autoFocus value={query} aria-label={copy.modelPlaceholder} onChange={(event) => { setQuery(event.target.value); void noopAnalyticsSink.track({ name: "device_searched", queryLength: event.target.value.length }); }} placeholder={copy.modelPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                    </span>
                    {isPending ? (
                      <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> …</p>
                    ) : results.length ? (
                      <ul role="listbox" aria-label={`${brand} ${copy.model}`} className="max-h-60 overflow-y-auto overscroll-contain py-1">
                        {results.map((device) => (
                          <li key={device.id} role="option" aria-selected={pending?.id === device.id}>
                            <button type="button" onClick={() => { setPending(device); setSelected(null); setListOpen(false); }} className={`flex min-h-11 w-full items-center justify-between px-3 text-left text-sm transition-colors hover:bg-primary-soft ${pending?.id === device.id ? "bg-primary-soft font-semibold" : ""}`}>
                              <span className="truncate">{device.model}</span>
                              {pending?.id === device.id && <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div role="status" className="flex gap-2 p-4 text-sm text-muted-foreground"><CircleHelp className="size-5 shrink-0 text-cta" aria-hidden="true" /><p><strong className="block text-foreground">{copy.statusUncertain}</strong>{copy.noResult}</p></div>
                    )}
                  </div>
                )}
              </div>
              <Button size="lg" className="min-h-12 w-full sm:w-auto" disabled={!pending} onClick={runCheck}>{x.checkCta}<ArrowRightIcon /></Button>
            </div>

            {selected && <div className="mt-4"><ResultPanel device={selected} copy={copy} onAgain={() => { setSelected(null); setPending(null); setListOpen(true); }} /></div>}
          </div>

          <Accordion type="single" collapsible className="rounded-xl border border-border bg-card px-4">
            <AccordionItem value="manual" className="border-none">
              <AccordionTrigger className="text-left text-sm font-semibold">{copy.manualTitle}</AccordionTrigger>
              <AccordionContent className="space-y-1.5 text-sm text-muted-foreground">
                <p>{copy.manualIphone}</p>
                <p>{copy.manualAndroid}</p>
                <p>{copy.manualDial}</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex gap-2 rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
            <span className="icon-slot-sm self-start text-primary"><Info aria-hidden="true" /></span>
            <span><strong className="block text-foreground">{copy.disclaimerTitle}</strong>{copy.disclaimer}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ArrowRightIcon() {
  return <ChevronRight className="size-4" aria-hidden="true" />;
}

function ResultPanel({ device, copy, onAgain }: { device: DeviceRecord; copy: Copy; onAgain: () => void }) {
  const { locale } = useI18n();
  const x = EXTRA[locale];
  const ok = device.status === "COMPATIBLE";
  const not = device.status === "NOT_COMPATIBLE";
  const title = ok ? x.okTitle : not ? x.notTitle : x.unknownTitle;
  const message = ok ? x.okBody(device.model) : not ? copy.notCompatible : copy.uncertain;
  const tone = ok ? "bg-primary-soft" : not ? "bg-destructive/10" : "bg-cta-soft";
  const Icon = ok ? CheckCircle2 : not ? XCircle : CircleHelp;
  const iconTone = ok ? "bg-primary text-primary-foreground" : not ? "bg-destructive text-destructive-foreground" : "bg-cta text-cta-foreground";

  return (
    <div role="status" className={`rounded-xl p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 ${tone}`}>
      <div className="flex items-start gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full ${iconTone}`}><Icon className="size-6" aria-hidden="true" /></span>
        <div className="min-w-0">
          <strong className="block font-display text-base sm:text-lg">{title}</strong>
          <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
          {!ok && <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{device.model} — {statusLabel(copy, device.status)}</p>}
          {device.notes && <p className="mt-1 text-sm text-muted-foreground">{device.notes}</p>}
          {device.regionVariantWarning && <p className="mt-1 text-sm text-muted-foreground">{copy.regionNote}</p>}
        </div>
      </div>
      <div className="mt-4">
        {ok ? (
          <Button asChild variant="cta" size="lg" className="min-h-12 w-full"><Link to="/esim/kurulum" search={{ platform: device.brand === "Apple" ? "ios" : "android", brand: device.brand }}>{copy.guide}<ChevronRight className="size-4" /></Link></Button>
        ) : (
          <Button variant="outline" className="w-full sm:w-auto" onClick={onAgain}>{not ? copy.ctaNot : copy.ctaUncertain}</Button>
        )}
      </div>
    </div>
  );
}

/** Compact homepage/finder section. */
export function DeviceCompatibilitySection() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const { compatibilityChecked, deviceModel, compatibilityResult } = useDeviceCheck();

  return (
    <section className="mx-auto mt-4 max-w-finder px-3 sm:mt-7 sm:px-6">
      <div className="rounded-2xl border border-accent/60 bg-lavender-soft p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-6">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold sm:text-2xl">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-card text-primary shadow-soft">
              <Smartphone aria-hidden="true" />
            </span>
            <span className="leading-tight">{copy.sectionTitle}</span>
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{copy.sectionLead}</p>
          {compatibilityChecked && compatibilityResult && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
              <StatusIcon status={compatibilityResult} />
              {deviceModel} — {statusLabel(copy, compatibilityResult)}
            </p>
          )}
        </div>
        <div className="mt-3 sm:mt-0 sm:shrink-0">
          <DeviceCheckSheet
            surface="finder"
            trigger={
              <Button variant="default" size="lg" className="w-full sm:w-auto">
                {compatibilityChecked ? copy.change : copy.check}
                <ChevronRight />
              </Button>
            }
          />
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <HelpCircle className="size-3.5" aria-hidden="true" />
            {copy.dontKnow} {copy.howTo}
          </p>
        </div>
      </div>
    </section>
  );
}

/** Reuses the existing device checker in compact educational surfaces. */
export function DeviceCompatibilityPrompt() {
  const { locale } = useI18n();
  const copy = COPY[locale];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-soft sm:flex sm:justify-between sm:px-4 lg:h-full lg:w-full lg:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary lg:size-12 lg:rounded-xl">
          <Smartphone className="size-4.5 lg:size-6" aria-hidden="true" />
        </span>
        <span className="min-w-0 text-sm font-semibold leading-5 text-balance">
          {copy.productPrompt}
        </span>
      </div>
      <DeviceCheckSheet
        surface="how-it-works"
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 whitespace-nowrap px-1.5 text-xs text-primary sm:px-3 sm:text-sm"
          >
            {copy.recheck}
            <ChevronRight />
          </Button>
        }
      />
    </div>
  );
}

/** Compact product-page version shown next to the purchase CTA. */
export function DeviceCompatibilityInline() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const { compatibilityChecked, deviceModel, compatibilityResult } = useDeviceCheck();

  if (compatibilityChecked && compatibilityResult) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
        <StatusIcon status={compatibilityResult} />
        <strong className="min-w-0 flex-1 truncate">
          {deviceModel} —{" "}
          {compatibilityResult === "COMPATIBLE"
            ? copy.checked
            : compatibilityResult === "NOT_COMPATIBLE"
              ? copy.checkedNot
              : copy.checkedUncertain}
        </strong>
        <DeviceCheckSheet
          surface="packages"
          trigger={
            <Button variant="ghost" size="sm">
              {copy.change}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-12 items-center gap-2 rounded-xl border border-accent/60 bg-lavender-soft px-3 py-2 text-sm">
      <Smartphone className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-semibold">{copy.recheck}</span>
      <DeviceCheckSheet
        surface="packages"
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-primary"
            aria-label={copy.check}
          >
            <ChevronRight />
          </Button>
        }
      />
    </div>
  );
}
