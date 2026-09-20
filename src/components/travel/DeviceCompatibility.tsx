import { useMemo, useState } from "react";
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
  DEVICE_BRANDS,
  searchDevices,
  type CompatibilityStatus,
  type DeviceRecord,
} from "@/domain/esim/device-compatibility";
import { useDeviceCheck } from "@/domain/esim/device-check-session";
import { noopAnalyticsSink } from "@/domain/analytics";
import type { Locale } from "@/domain/enums";

const COPY = {
  tr: {
    sectionTitle: "Telefonun eSIM uyumlu mu?",
    sectionLead: "Satın almadan önce birkaç saniyede kontrol et.",
    check: "Telefonumu kontrol et",
    recheck: "Uyumluluğu kontrol et",
    change: "Değiştir",
    dontKnow: "Modelini bilmiyor musun?",
    howTo: "Nasıl kontrol edilir?",
    sheetTitle: "Telefonum eSIM uyumlu mu?",
    sheetLead: "Markanı seç ya da doğrudan model ara.",
    searchPlaceholder: "Telefon modelini ara",
    brand: "Marka",
    model: "Model",
    noResult: "Bu aramaya uygun model bulunamadı.",
    compatible: "Bu model eSIM destekliyor.",
    uncertain: "Bu modelin eSIM desteği bölge veya cihaz varyantına göre değişebilir.",
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
    sheetLead: "Marke wählen oder direkt nach dem Modell suchen.",
    searchPlaceholder: "Handymodell suchen",
    brand: "Marke",
    model: "Modell",
    noResult: "Zu dieser Suche wurde kein Modell gefunden.",
    compatible: "Dieses Modell unterstützt eSIM.",
    uncertain: "Die eSIM-Unterstützung kann je nach Region oder Gerätevariante abweichen.",
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
    sheetLead: "Pick your brand or search for the model directly.",
    searchPlaceholder: "Search your phone model",
    brand: "Brand",
    model: "Model",
    noResult: "No model matches this search.",
    compatible: "This model supports eSIM.",
    uncertain: "eSIM support for this model can differ by region or device variant.",
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
} satisfies Record<Locale, Record<string, string>>;

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

function DeviceCheckSheet({ surface, trigger }: { surface: string; trigger: React.ReactNode }) {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DeviceRecord | null>(null);
  const { setResult } = useDeviceCheck();

  const { data: devices = [], isPending } = useQuery({
    queryKey: ["device-compatibility"],
    queryFn: () => listDeviceCompatibility(),
    staleTime: 10 * 60 * 1000,
    enabled: open,
  });

  const results = useMemo(
    () => searchDevices(devices, query, query ? undefined : (brand ?? undefined)).slice(0, 40),
    [devices, query, brand],
  );

  const reset = () => {
    setSelected(null);
    setQuery("");
    setBrand(null);
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
        className="compatibility-sheet max-h-[88svh] overflow-y-auto rounded-t-2xl pb-28 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[86vh] sm:w-[min(42rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
      >
        <span
          className="mx-auto mb-1 block h-1 w-10 shrink-0 rounded-full bg-border sm:hidden"
          aria-hidden="true"
        />
        <SheetHeader className="px-4 sm:px-6">
          <SheetTitle className="font-display text-xl">{copy.sheetTitle}</SheetTitle>
          <SheetDescription>{copy.sheetLead}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4 sm:px-6">
          {selected ? (
            <ResultPanel
              device={selected}
              copy={copy}
              onAgain={() => setSelected(null)}
              onClose={() => setOpen(false)}
            />
          ) : (
            <>
              <label className="flex min-h-13 items-center gap-2 rounded-xl border border-border bg-secondary/60 px-3">
                <span className="icon-slot-sm text-muted-foreground">
                  <Search aria-hidden="true" />
                </span>
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    void noopAnalyticsSink.track({
                      name: "device_searched",
                      queryLength: event.target.value.length,
                    });
                  }}
                  placeholder={copy.searchPlaceholder}
                  aria-label={copy.searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>

              {!query && (
                <div>
                  <span className="mb-1.5 block text-sm font-semibold">{copy.brand}</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {DEVICE_BRANDS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        aria-pressed={brand === item}
                        onClick={() => setBrand(brand === item ? null : item)}
                        className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition ${brand === item ? "border-primary bg-accent-soft text-primary" : "border-border bg-card hover:border-primary/50"}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="mb-1.5 block text-sm font-semibold">{copy.model}</span>
                {isPending ? (
                  <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" /> …
                  </p>
                ) : results.length ? (
                  <ul className="space-y-1.5">
                    {results.map((device) => (
                      <li key={device.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(device);
                            setResult(device.model, device.status);
                            void noopAnalyticsSink.track({
                              name: "compatibility_result_viewed",
                              result: device.status,
                              brand: device.brand,
                            });
                          }}
                          className="flex min-h-13 w-full items-center gap-2 rounded-xl border border-border bg-card px-3 text-left text-sm font-semibold hover:border-primary/60"
                        >
                          <span className="icon-slot-sm text-primary">
                            <Smartphone aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{device.model}</span>
                          <ChevronRight
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-4 text-sm text-muted-foreground">{copy.noResult}</p>
                )}
              </div>
            </>
          )}

          <Accordion
            type="single"
            collapsible
            className="rounded-xl border border-border bg-card px-4"
          >
            <AccordionItem value="manual" className="border-none">
              <AccordionTrigger className="text-left text-sm font-semibold">
                {copy.manualTitle}
              </AccordionTrigger>
              <AccordionContent className="space-y-1.5 text-sm text-muted-foreground">
                <p>{copy.manualIphone}</p>
                <p>{copy.manualAndroid}</p>
                <p>{copy.manualDial}</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex gap-2 rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
            <span className="icon-slot-sm self-start text-primary">
              <Info aria-hidden="true" />
            </span>
            <span>
              <strong className="block text-foreground">{copy.disclaimerTitle}</strong>
              {copy.disclaimer}
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ResultPanel({
  device,
  copy,
  onAgain,
  onClose,
}: {
  device: DeviceRecord;
  copy: Copy;
  onAgain: () => void;
  onClose: () => void;
}) {
  const message =
    device.status === "COMPATIBLE"
      ? copy.compatible
      : device.status === "NOT_COMPATIBLE"
        ? copy.notCompatible
        : copy.uncertain;
  const tone =
    device.status === "COMPATIBLE"
      ? "bg-primary-soft"
      : device.status === "NOT_COMPATIBLE"
        ? "bg-destructive/10"
        : "bg-cta-soft";

  return (
    <div className={`rounded-xl p-4 ${tone}`}>
      <div className="flex items-start gap-2">
        <StatusIcon status={device.status} />
        <div className="min-w-0">
          <strong className="block">
            {device.model} — {statusLabel(copy, device.status)}
          </strong>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          {device.notes && <p className="mt-1 text-sm text-muted-foreground">{device.notes}</p>}
          {device.regionVariantWarning && (
            <p className="mt-1 text-sm text-muted-foreground">{copy.regionNote}</p>
          )}
        </div>
      </div>
      <div className="mt-4">
        {device.status === "COMPATIBLE" ? (
          <Button variant="cta" className="w-full sm:w-auto" onClick={onClose}>
            {copy.ctaCompatible}
          </Button>
        ) : device.status === "NOT_COMPATIBLE" ? (
          <Button variant="outline" className="w-full sm:w-auto" onClick={onAgain}>
            {copy.ctaNot}
          </Button>
        ) : (
          <Button variant="outline" className="w-full sm:w-auto" onClick={onAgain}>
            {copy.ctaUncertain}
          </Button>
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
          <Button variant="ghost" size="icon" className="size-8 shrink-0 text-primary" aria-label={copy.check}>
            <ChevronRight />
          </Button>
        }
      />
    </div>
  );
}
