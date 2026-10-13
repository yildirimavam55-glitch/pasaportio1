import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  HelpCircle,
  Info,
  LoaderCircle,
  Pencil,
  Search,
  Smartphone,
  TriangleAlert,
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
  checkedDeviceStatus,
  searchDevices,
  type CompatibilityStatus,
  type DeviceRecord,
} from "@/domain/esim/device-compatibility";
import { useDeviceCheck } from "@/domain/esim/device-check-session";
import { resolveCheckerPrefill, checkerDetectionForViewport, type DeviceDetection } from "@/domain/esim/device-detection";
import { noopAnalyticsSink } from "@/domain/analytics";
import type { Locale } from "@/domain/enums";
import { localize } from "@/i18n/overlay";
import { useBrowserDevice } from "@/domain/esim/use-browser-device";
import { V2PickerSheet } from "@/components/design-v2/V2PickerSheet";
import compatibilityPhones from "@/assets/compatibility-phone-trio.png";

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
    productLead: "Birkaç saniyede öğren.",
    compactCheck: "Kontrol et",
    changeDevice: "Cihazı değiştir",
    detectedIphone: "iPhone algılandı — modeli kontrol et",
    detectedAndroid: "Android cihaz algılandı — modeli kontrol et",
    detectedSamsung: "Samsung cihaz algılandı — modeli kontrol et",
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
    productLead: "In Sekunden prüfen.",
    compactCheck: "Gerät prüfen",
    changeDevice: "Gerät ändern",
    detectedIphone: "iPhone erkannt – Modell prüfen",
    detectedAndroid: "Android-Gerät erkannt – Modell prüfen",
    detectedSamsung: "Samsung-Gerät erkannt – Modell wählen",
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
    productLead: "Check in seconds.",
    compactCheck: "Check device",
    changeDevice: "Change device",
    detectedIphone: "iPhone detected — check the model",
    detectedAndroid: "Android device detected — check the model",
    detectedSamsung: "Samsung device detected — check the model",
  },
} satisfies Record<Locale, Record<string, string>>);

type Copy = (typeof COPY)["tr"];

const HERO_DEVICE_COPY = localize({
  tr: { title: "Telefonun eSIM uyumlu mu?", brand: "Marka seç", model: "Model seç", search: "Model ara", unknown: "Doğrulanamadı", ok: "Uyumlu", no: "Uyumlu değil", missing: "Kesin model algılanamadı; modelini seç.", caution: "Operatör kilidi ve bölgesel model farklılıklarını kontrol et." },
  de: { title: "Ist dein Handy eSIM-fähig?", brand: "Marke wählen", model: "Modell wählen", search: "Modell suchen", unknown: "Nicht bestätigt", ok: "Kompatibel", no: "Nicht kompatibel", missing: "Genaues Modell nicht erkannt; wähle dein Modell.", caution: "Prüfe SIM-Lock und regionale Modellvarianten." },
  en: { title: "Is your phone eSIM compatible?", brand: "Choose brand", model: "Choose model", search: "Search model", unknown: "Not verified", ok: "Compatible", no: "Not compatible", missing: "Exact model not detected; choose your model.", caution: "Check carrier lock and regional model variants." },
  ar: { title: "هل هاتفك متوافق مع eSIM؟", brand: "اختر العلامة", model: "اختر الطراز", search: "ابحث عن الطراز", unknown: "لم يتم التحقق", ok: "متوافق", no: "غير متوافق", missing: "لم يُكتشف الطراز الدقيق؛ اختر طراز هاتفك.", caution: "تحقق من قفل شركة الاتصالات واختلافات الطراز الإقليمية." },
});

const HERO_RESULT_COPY = localize({
  tr: { ok: "Telefonun eSIM destekliyor.", no: "Telefonun eSIM desteklemiyor.", unknown: "Bu modelin eSIM desteğini doğrulayamadık.", change: "Cihazı değiştir" },
  de: { ok: "Dein Handy unterstützt eSIM.", no: "Dein Handy unterstützt keine eSIM.", unknown: "Wir konnten die eSIM-Unterstützung dieses Modells nicht bestätigen.", change: "Gerät ändern" },
  en: { ok: "Your phone supports eSIM.", no: "Your phone does not support eSIM.", unknown: "We could not verify this model’s eSIM support.", change: "Change device" },
  ar: { ok: "هاتفك يدعم eSIM.", no: "هاتفك لا يدعم eSIM.", unknown: "لم نتمكن من التحقق من دعم هذا الطراز لـ eSIM.", change: "تغيير الجهاز" },
});

/** Same catalogue, strict detection and manually persisted check as the account/product checker. */
export function HeroDeviceCompatibility({ compact = false }: { compact?: boolean }) {
  const { uiLocale, locale } = useI18n();
  const c = HERO_DEVICE_COPY[uiLocale as keyof typeof HERO_DEVICE_COPY] ?? HERO_DEVICE_COPY[locale];
  const outcomeCopy = HERO_RESULT_COPY[uiLocale as keyof typeof HERO_RESULT_COPY] ?? HERO_RESULT_COPY[locale];
  const { data: devices = [], isPending } = useQuery({ queryKey: ["device-compatibility"], queryFn: () => listDeviceCompatibility(), staleTime: 10 * 60 * 1000 });
   const { detection, mobile: isMobile, diagnostics } = useBrowserDevice(devices);
  const saved = useDeviceCheck();
  const [override, setOverride] = useState<{ brand: string; device: DeviceRecord | null } | null>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(false);
  const [query, setQuery] = useState("");
  const prefill = resolveCheckerPrefill(devices, saved.compatibilityChecked ? { model: saved.deviceModel, ...(saved.deviceBrand ? { brand: saved.deviceBrand } : {}) } : null, checkerDetectionForViewport(detection, isMobile));
  const brand = override?.brand ?? prefill.brand ?? "";
  const device = override ? override.device : prefill.device;
  const brands = useMemo(() => [...new Set(devices.map((d) => d.brand))].sort(), [devices]);
  const models = useMemo(() => searchDevices(devices, query, brand || undefined), [devices, query, brand]);
  const result = checkedDeviceStatus(device, isPending);
    const shortTitle = ({ tr: "eSIM uyumluluğu", de: "eSIM-Kompatibilität", en: "eSIM compatibility", ar: "توافق eSIM" } as Record<string, string>)[uiLocale] ?? "eSIM compatibility";
    const compactTitle = ({ tr: "Telefonum eSIM destekliyor mu?", de: "Unterstützt mein Handy eSIM?", en: "Does my phone support eSIM?", ar: "هل يدعم هاتفي eSIM؟" } as Record<string, string>)[uiLocale] ?? c.title;
    const modelLabel = ({ tr: "Modelini seç", de: "Modell wählen", en: "Select your model", ar: "اختر طراز هاتفك" } as Record<string, string>)[uiLocale] ?? c.model;
    return <div className={`hero-device-check bg-card text-card-foreground ${compact ? "hero-device-inline" : "shadow-panel"}`} data-testid="hero-device-check">
     <Smartphone className="hero-device-icon" aria-hidden="true" />
     <h2 className="text-sm font-semibold">{compact ? compactTitle : shortTitle}</h2>
     <div className="hero-device-selectors grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {brand && !editingBrand && <Button variant="outline" aria-label={`${c.brand}: ${brand}`} onClick={() => setEditingBrand(true)} className="h-11 min-w-0 justify-between bg-card px-2 lg:hidden"><span className="rounded bg-muted px-1 py-1 text-xs font-bold">{brand}</span><Pencil className="size-4 shrink-0" /></Button>}
      <select aria-label={c.brand} value={brand} data-known-brand={Boolean(brand) || undefined} onChange={(e) => { setOverride({ brand: e.target.value, device: null }); saved.reset(); setQuery(""); setEditingBrand(false); }} className={`${brand && !editingBrand ? "hidden lg:block" : ""} h-11 min-w-0 rounded-lg border border-input bg-card px-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring`}>
        <option value="">{c.brand}</option>{brands.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
      <V2PickerSheet open={modelOpen} onOpenChange={(open) => { setModelOpen(open); if (!open) setQuery(""); }} title={modelLabel} searchLabel={c.search} query={query} onQueryChange={setQuery} {...(device ? { selectedId: device.id } : {})} emptyLabel={isPending ? "…" : c.unknown} items={models.map((d) => ({ id: d.id, label: d.model, ...(d.regionVariantWarning || d.notes ? { detail: [d.regionVariantWarning ? c.caution : "", d.notes ?? ""].filter(Boolean).join(" ") } : {}) }))} onSelect={(id) => { const d = devices.find((item) => item.id === id); if (!d) return; setOverride({ brand: d.brand, device: d }); saved.setResult(d.model, d.status, d.brand); setModelOpen(false); setQuery(""); }}>
        <Button variant="outline" disabled={!brand || isPending} title={device?.model ?? modelLabel} className="h-11 min-w-0 justify-between bg-card px-2 font-normal"><span className="truncate">{device?.model ?? (compact ? modelLabel : c.model)}</span><ChevronRight className="size-4 shrink-0 rotate-90" /></Button>
      </V2PickerSheet>
    </div>
      <div aria-live="polite" className="hero-device-result" data-has-result={Boolean(device && result) || undefined}>
        {device && result && <div className="hero-device-outcome" data-status={result}>
          {result === "COMPATIBLE" ? <CheckCircle2 aria-hidden="true" /> : result === "NOT_COMPATIBLE" ? <TriangleAlert aria-hidden="true" /> : <CircleHelp aria-hidden="true" />}
          <div className="min-w-0"><strong>{result === "COMPATIBLE" ? outcomeCopy.ok : result === "NOT_COMPATIBLE" ? outcomeCopy.no : outcomeCopy.unknown}</strong><p>{device.brand} · {device.model}</p>
          {(device.regionVariantWarning || device.notes) && <p className="hero-device-warning">{device.regionVariantWarning && c.caution} {device.notes}</p>}
          </div>
        </div>}
      </div>
      <DeviceDiagnostics diagnostics={diagnostics} detection={detection} prefill={prefill} />
  </div>;
}

/** Preview-only (?devicedebug=1 on preview/localhost hosts): shows the raw browser values locally; nothing is stored or sent. */
function DeviceDiagnostics({ diagnostics, detection, prefill }: { diagnostics: ReturnType<typeof useBrowserDevice>["diagnostics"]; detection: DeviceDetection; prefill: { brand: string | null; device: DeviceRecord | null } }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const host = window.location.hostname;
    const previewHost = host === "localhost" || host.startsWith("id-preview--") || host.endsWith(".lovableproject.com");
    setEnabled(previewHost && new URLSearchParams(window.location.search).has("devicedebug"));
  }, []);
  if (!enabled || !diagnostics) return null;
  const rows: [string, string][] = [
    ["User-Agent", diagnostics.userAgent ?? "—"],
    ["Client Hints", diagnostics.clientHints ? "yes" : "no"],
    ["UA-CH mobile", String(diagnostics.uaMobile)],
    ["UA-CH model", diagnostics.model ?? "—"],
    ["platform", diagnostics.platform ?? "—"],
    ["maxTouchPoints", String(diagnostics.maxTouchPoints ?? "—")],
    ["secure (HTTPS)", String(diagnostics.secure)],
    ["treated as mobile", String(diagnostics.mobile)],
    ["detection", detection.kind === "exact" ? `exact: ${detection.device.brand} ${detection.device.model}` : detection.kind === "partial" ? `partial: ${detection.family}` : "unknown"],
    ["selected brand / model", `${prefill.brand ?? "—"} / ${prefill.device?.model ?? "—"}`],
  ];
  return <dl className="mt-2 grid gap-1 rounded-md border border-dashed border-border bg-muted p-2 text-[11px] break-all" data-testid="device-diagnostics">
    {rows.map(([k, v]) => <div key={k}><dt className="inline font-semibold">{k}: </dt><dd className="inline">{v}</dd></div>)}
  </dl>;
}

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

export function DeviceCheckSheet({ surface, trigger, detection }: { surface: string; trigger: ReactNode; detection?: DeviceDetection }) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const x = EXTRA[locale];
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [brandQuery, setBrandQuery] = useState("");
  const [pending, setPending] = useState<DeviceRecord | null>(null);
  const [selected, setSelected] = useState<DeviceRecord | null>(null);
  const { setResult, reset: resetResult, compatibilityChecked, deviceModel, deviceBrand } = useDeviceCheck();
  const prefilled = useRef(false);

  const { data: devices = [], isPending } = useQuery({
    queryKey: ["device-compatibility"],
    queryFn: () => listDeviceCompatibility(),
    staleTime: 10 * 60 * 1000,
    enabled: open,
  });

  // Apply prefill once per opening; later user choices are never overwritten.
  useEffect(() => {
    if (!open || prefilled.current || devices.length === 0) return;
    prefilled.current = true;
    const manual = compatibilityChecked && deviceModel ? { model: deviceModel, ...(deviceBrand ? { brand: deviceBrand } : {}) } : null;
    const prefill = resolveCheckerPrefill(devices, manual, detection ?? { kind: "unknown" });
    if (prefill.brand) { setBrand(prefill.brand); setListOpen(!prefill.device); }
    if (prefill.device) setPending(prefill.device);
  }, [open, devices, detection, compatibilityChecked, deviceModel, deviceBrand]);

  const brands = useMemo(() => orderBrands(devices), [devices]);
  const results = useMemo(
    () => brand ? searchDevices(devices, query, brand) : [],
    [devices, query, brand],
  );

  const reset = () => {
    prefilled.current = false;
    setSelected(null);
    setPending(null);
    setQuery("");
    setBrand(null);
    setBrandQuery("");
    setListOpen(false);
  };

  const runCheck = () => {
    if (!pending) return;
    // Regional variants cannot be confirmed from the catalogue alone — never show a green claim.
    const checked = pending.regionVariantWarning ? { ...pending, status: "UNCERTAIN" as const } : pending;
    setSelected(checked);
    setResult(checked.model, checked.status, checked.brand);
    void noopAnalyticsSink.track({ name: "compatibility_result_viewed", result: checked.status, brand: checked.brand });
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
          <div className="rounded-2xl border border-border bg-card p-3 shadow-soft sm:p-4">
            {!selected && (<>
            <p className="mb-1.5 block text-sm font-semibold" id="device-brand-label">{brand ? x.brandSelect : HOME_CARD[locale].brandStep}</p>
            {brand ? (
              <button type="button" data-testid="device-brand-chosen" onClick={() => { setBrand(null); setPending(null); setQuery(""); setBrandQuery(""); setListOpen(false); resetResult(); }} className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-primary bg-primary-soft px-3 text-start text-sm font-semibold sm:max-w-xs">
                <span className="flex min-w-0 items-center gap-2"><BrandMark name={brand} /><span className="truncate">{brand}</span></span>
                <Pencil className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            ) : (
              <div role="group" aria-labelledby="device-brand-label">
                <span className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3">
                  <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <input value={brandQuery} onChange={(event) => setBrandQuery(event.target.value)} aria-label={HOME_CARD[locale].brandSearch} placeholder={HOME_CARD[locale].brandSearch} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                </span>
                {isPending ? <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> …</p> : (
                  <ul className="mt-2 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto overscroll-contain sm:grid-cols-3">
                    {brands.filter((item) => item.toLowerCase().includes(brandQuery.trim().toLowerCase())).map((item) => (
                      <li key={item}><button type="button" onClick={() => { setBrand(item); setPending(null); setSelected(null); setQuery(""); setListOpen(true); resetResult(); }} className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-border bg-card px-2.5 text-start text-sm font-semibold transition-colors hover:border-primary hover:bg-primary-soft"><BrandMark name={item} /><span className="min-w-0 truncate">{item}</span></button></li>
                    ))}
                  </ul>
                )}
              </div>
            )}


            <p className="mb-1.5 mt-3 block text-sm font-semibold" id="device-model-label">{x.modelSelect}</p>
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
            </>)}

            {selected && <div><ResultPanel device={selected} copy={copy} onAgain={() => { setSelected(null); setPending(null); setListOpen(true); }} /></div>}
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
    <div role="status" className={`min-w-0 rounded-xl p-3 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 ${tone}`}>
      <div className="flex min-w-0 items-start gap-2.5">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full ${iconTone}`}><Icon className="size-[18px]" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <strong className="block break-words font-display text-[15px] leading-snug">{title}</strong>
          <p className="mt-0.5 break-words text-[13px] leading-snug text-muted-foreground">{message}</p>
          {!ok && <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{device.model} — {statusLabel(copy, device.status)}</p>}
          {device.notes && <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{device.notes}</p>}
          {device.regionVariantWarning && <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{copy.regionNote}</p>}
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            {ok ? (
              <Link to="/esim/kurulum" search={{ platform: device.brand === "Apple" ? "ios" : "android", brand: device.brand }} className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-1 whitespace-normal break-words text-sm font-bold text-cta underline-offset-4 hover:underline">
                <span className="min-w-0">{copy.guide}</span><ChevronRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            ) : null}
            <button type="button" onClick={onAgain} className="inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground">
              {ok ? copy.changeDevice : not ? copy.ctaNot : copy.ctaUncertain}
            </button>
          </div>
        </div>
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

/** Desktop-only homepage utility card; the checker and persisted result remain shared. */
export function DesktopDeviceCompatibilityBanner({ title }: { title?: string } = {}) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const { compatibilityChecked, deviceModel, compatibilityResult } = useDeviceCheck();

  return (
    <section className="grid h-[92px] grid-cols-[3.75rem_minmax(0,1fr)_auto] items-center gap-5 rounded-2xl border border-border bg-card px-6">
      <div className="flex items-center justify-center" aria-hidden="true">
        <span className="relative grid h-14 w-9 place-items-center rounded-[0.7rem] border-2 border-foreground/75 bg-background">
          <span className="absolute top-1 h-0.5 w-3 rounded-full bg-foreground/60" />
          <span className="grid size-5 place-items-center rounded border border-primary/50 bg-primary-soft text-[7px] font-black tracking-tight text-primary">eSIM</span>
        </span>
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-xl font-bold leading-tight text-foreground">{title || copy.sectionTitle}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{copy.sectionLead}</p>
        {compatibilityChecked && compatibilityResult && (
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <StatusIcon status={compatibilityResult} />
            <span className="truncate">{deviceModel} — {statusLabel(copy, compatibilityResult)}</span>
          </p>
        )}
      </div>
      <DeviceCheckSheet
        surface="homepage-desktop"
        trigger={
          <Button variant="outline" size="sm" className="h-11 shrink-0 rounded-full border-primary/25 bg-background px-5 text-primary hover:bg-primary-soft">
            {compatibilityChecked ? copy.change : copy.recheck}
            <ChevronRight className="rtl:rotate-180" />
          </Button>
        }
      />
    </section>
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

function partialDetectionLabel(copy: Copy, detection: DeviceDetection) {
  if (detection.kind !== "partial") return copy.sectionLead;
  if (detection.family === "iphone") return copy.detectedIphone;
  if (detection.family === "samsung") return copy.detectedSamsung;
  return copy.detectedAndroid;
}

/** Compact product-page state card with strict, catalogue-backed browser detection. */
export function DeviceCompatibilityProductCard() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const { compatibilityChecked, deviceModel, compatibilityResult } = useDeviceCheck();
  const { data: devices = [] } = useQuery({
    queryKey: ["device-compatibility"],
    queryFn: () => listDeviceCompatibility(),
    staleTime: 10 * 60 * 1000,
  });
  const { detection: detected } = useBrowserDevice(devices);

  const manualVerified = Boolean(compatibilityChecked && compatibilityResult && compatibilityResult !== "UNCERTAIN");
  const automaticDevice = !compatibilityChecked && detected.kind === "exact" && detected.device.status !== "UNCERTAIN" ? detected.device : null;
  const result = manualVerified ? compatibilityResult : automaticDevice?.status ?? null;
  const verified = result === "COMPATIBLE" || result === "NOT_COMPATIBLE";
  const title = verified ? (result === "COMPATIBLE" ? copy.checked : copy.checkedNot) : copy.sectionTitle;
  const lead = manualVerified ? deviceModel : automaticDevice?.model ?? (detected.kind === "partial" ? partialDetectionLabel(copy, detected) : copy.productLead);
  const action = verified ? (result === "NOT_COMPATIBLE" ? copy.ctaNot : copy.changeDevice) : copy.compactCheck;

  return (
    <div data-testid="product-compatibility-card" className={`grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-full px-3 py-1.5 ring-1 sm:gap-3 sm:px-4 ${verified ? "bg-primary-soft ring-primary/10" : "bg-card ring-border"}`}>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-background text-primary ring-1 ring-border/60">
        {verified ? <StatusIcon status={result} /> : <Smartphone className="size-4" aria-hidden="true" />}
      </span>
      <span className="min-w-0"><strong className="block text-xs leading-4 text-foreground sm:text-sm">{title}</strong><span className="block text-[11px] leading-4 text-muted-foreground sm:text-xs">{lead}</span></span>
      <DeviceCheckSheet surface="v2-country" detection={detected} trigger={<Button type="button" size="sm" className="h-auto min-h-9 max-w-[7.5rem] shrink-0 whitespace-normal rounded-full px-2.5 py-1 text-center text-[11px] leading-tight sm:max-w-none sm:px-3 sm:text-xs">{action}<ChevronRight className="size-3.5 shrink-0" /></Button>} />
    </div>
  );
}

const BRAND_PRIORITY = ["Apple", "Samsung", "Google", "Xiaomi", "POCO", "Redmi", "Oppo", "OnePlus", "Motorola", "Honor", "Huawei"];

/** Popular brands first (only those present in the curated catalogue), then the rest alphabetically. */
export function orderBrands(devices: Pick<DeviceRecord, "brand">[]): string[] {
  const unique = [...new Set(devices.map((device) => device.brand))];
  const rank = (brand: string) => { const i = BRAND_PRIORITY.findIndex((b) => b.toLowerCase() === brand.toLowerCase()); return i < 0 ? BRAND_PRIORITY.length : i; };
  return unique.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** Neutral monogram — never a manufacturer logo or another model's photo. */
function BrandMark({ name }: { name: string }) {
  return <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-black text-primary">{name.slice(0, 1).toUpperCase()}</span>;
}

const HOME_CARD = localize({
  tr: { title: "Telefonunu kontrol et", lead: "Telefonunun eSIM uyumlu olup olmadığını kolayca öğren.", fallback: "Telefonunuz eSIM uyumlu mu? Kontrol edin.", detected: (b: string) => `${b} cihaz algılandı.`, pickModel: "eSIM uyumluluğunu kontrol etmek için modelinizi seçin.", badge: "Cihaz algılandı", action: "Kontrol et", brandStep: "Telefon markanı seç", brandSearch: "Marka ara" },
  de: { title: "Prüfe dein Handy", lead: "Finde ganz einfach heraus, ob dein Handy eSIM-fähig ist.", fallback: "Ist dein Handy eSIM-fähig? Jetzt prüfen.", detected: (b: string) => `${b}-Gerät erkannt.`, pickModel: "Wähle dein Modell, um die eSIM-Kompatibilität zu prüfen.", badge: "Gerät erkannt", action: "Prüfen", brandStep: "Wähle die Marke deines Handys", brandSearch: "Marke suchen" },
  en: { title: "Check your phone", lead: "Easily find out whether your phone supports eSIM.", fallback: "Is your phone eSIM compatible? Check it.", detected: (b: string) => `${b} device detected.`, pickModel: "Select your model to check eSIM compatibility.", badge: "Device detected", action: "Check", brandStep: "Choose your phone brand", brandSearch: "Search brand" },
  ar: { title: "تحقق من هاتفك", lead: "اعرف بسهولة ما إذا كان هاتفك يدعم eSIM.", fallback: "هل هاتفك متوافق مع eSIM؟ تحقّق الآن.", detected: (b: string) => `تم اكتشاف جهاز ${b}.`, pickModel: "اختر طراز هاتفك للتحقق من توافق eSIM.", badge: "تم اكتشاف الجهاز", action: "تحقق", brandStep: "اختر علامة هاتفك", brandSearch: "ابحث عن العلامة" },
} as const);

const COMPACT_PHONE_COPY = {
  tr: { title: "Telefonunu kontrol et", lead: "eSIM uyumluluğunu kontrol et", detected: (b: string) => `${b} algılandı · Model seç` },
  de: { title: "Prüfe dein Handy", lead: "eSIM-Kompatibilität prüfen", detected: (b: string) => `${b} erkannt · Modell wählen` },
  en: { title: "Check your phone", lead: "Check eSIM compatibility", detected: (b: string) => `${b} detected · Choose model` },
  fr: { title: "Vérifie ton téléphone", lead: "Vérifier la compatibilité eSIM", detected: (b: string) => `${b} détecté · Choisir le modèle` },
  es: { title: "Comprueba tu móvil", lead: "Comprobar compatibilidad eSIM", detected: (b: string) => `${b} detectado · Elige modelo` },
  it: { title: "Controlla il telefono", lead: "Verifica compatibilità eSIM", detected: (b: string) => `${b} rilevato · Scegli modello` },
  pt: { title: "Verifica o telemóvel", lead: "Verificar compatibilidade eSIM", detected: (b: string) => `${b} detetado · Escolhe o modelo` },
  nl: { title: "Check je telefoon", lead: "Controleer eSIM-compatibiliteit", detected: (b: string) => `${b} herkend · Kies model` },
  pl: { title: "Sprawdź telefon", lead: "Sprawdź zgodność z eSIM", detected: (b: string) => `${b} wykryty · Wybierz model` },
  ru: { title: "Проверь телефон", lead: "Проверить поддержку eSIM", detected: (b: string) => `${b} обнаружен · Выбери модель` },
  ar: { title: "تحقق من هاتفك", lead: "تحقق من توافق eSIM", detected: (b: string) => `${b} مكتشف · اختر الطراز` },
  ja: { title: "スマホをチェック", lead: "eSIM対応を確認", detected: (b: string) => `${b}を検出 · 機種を選択` },
  ko: { title: "휴대폰 확인", lead: "eSIM 호환성 확인", detected: (b: string) => `${b} 감지됨 · 모델 선택` },
  zh: { title: "检查你的手机", lead: "检查 eSIM 兼容性", detected: (b: string) => `检测到 ${b} · 选择型号` },
} as const;

/** Homepage card after the destination rails; opens the shared checker (bottom sheet on mobile, modal on desktop). */
export function HomeCompatibilityCard() {
  const { locale, uiLocale } = useI18n();
  const h = COMPACT_PHONE_COPY[uiLocale];
  const cardRef = useRef<HTMLElement>(null);
  // Move only the floating support control, and only while it would cover this card.
  useEffect(() => {
    let frame = 0;
    let widget: HTMLElement | null = null;
    let offset = 0;
    const update = () => {
      frame = 0;
      widget = document.querySelector<HTMLElement>('[data-whatsapp-widget].fixed');
      const card = cardRef.current?.getBoundingClientRect();
      if (!widget || !card) return;
      const box = widget.getBoundingClientRect();
      const top = box.top + offset;
      const bottom = box.bottom + offset;
      const intersects = window.innerWidth < 1024 && card.bottom > top && card.top < bottom && card.right > box.left && card.left < box.right;
      offset = intersects ? bottom - card.top + 12 : 0;
      widget.style.setProperty('--phone-card-offset', `${-offset}px`);
      widget.toggleAttribute('data-phone-card-avoid', offset > 0);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    if (cardRef.current) observer.observe(cardRef.current);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      widget?.style.removeProperty('--phone-card-offset');
      widget?.removeAttribute('data-phone-card-avoid');
    };
  }, []);
  const copy = COPY[locale];
  const { compatibilityChecked, deviceModel, compatibilityResult } = useDeviceCheck();
  const { data: devices = [] } = useQuery({ queryKey: ["device-compatibility"], queryFn: () => listDeviceCompatibility(), staleTime: 10 * 60 * 1000 });
  const { detection, mobile } = useBrowserDevice(devices);
  // Desktop browsers never claim a phone model; only mobile hints are shown.
  const shown = checkerDetectionForViewport(detection, mobile);
  const detectedBrand = shown.kind === "exact" ? (shown.device.brand === "Apple" ? "iPhone" : shown.device.brand) : shown.kind === "partial" ? (shown.family === "iphone" ? "iPhone" : shown.family === "samsung" ? "Samsung" : "Android") : null;
  const lead = compatibilityChecked && compatibilityResult ? `${deviceModel} · ${statusLabel(copy, compatibilityResult)}` : detectedBrand ? h.detected(detectedBrand) : h.lead;
  return (
    <section ref={cardRef} id="device-compatibility" data-testid="home-compatibility-card" className="mx-auto w-full max-w-[1200px] scroll-mt-24 py-5 sm:py-6">
      <DeviceCheckSheet surface="homepage-card" detection={shown} trigger={
        <Button type="button" variant="outline" className="home-phone-card grid h-auto min-h-22 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 whitespace-normal rounded-2xl border-border bg-card px-3 py-3 text-start shadow-soft hover:border-primary/40 hover:bg-card sm:gap-4 sm:px-5">
          <span aria-hidden="true" className="grid h-16 w-14 shrink-0 place-items-center sm:w-24">
            <img src={compatibilityPhones} alt="" loading="lazy" decoding="async" width={768} height={768} className="h-full w-full object-contain" />
          </span>
          <span className="min-w-0">
            <strong className="block font-display text-base font-bold leading-5 text-foreground sm:text-lg">{h.title}</strong>
            <span className="mt-1 block text-xs font-normal leading-4 text-muted-foreground sm:text-sm sm:leading-5">{lead}</span>
          </span>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <ChevronRight className="size-6 rtl:rotate-180" aria-hidden="true" />
          </span>
        </Button>
      } />
    </section>
  );
}
