import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Apple, Download, Info, Smartphone, QrCode, Link2 } from "lucide-react";

import { AccountInstallationWalkthrough } from "@/components/design-v2/EsimInstallationPage";
import { ACCOUNT_V1_COPY } from "./v1-copy";
import { PURCHASE_COPY } from "./purchases-copy";
import { ACCOUNT_DEMO_COPY } from "./demo-copy";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Locale } from "@/domain/enums";
import { activationNote, type ActivationPolicy } from "@/domain/esim/activation";
import { ACCOUNT_COPY } from "./copy";
import { PANEL_COPY } from "./panel-copy";
import { normalizeStatus, type DeviceRecord } from "@/domain/esim/device-compatibility";
import { listDeviceCompatibility } from "@/lib/device-compatibility.functions";

function installString(info: unknown, key: string) {
  if (!info || typeof info !== "object" || Array.isArray(info)) return null;
  const value = (info as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const MANUAL_KEYS = ["smdp_address", "activation_code", "apn", "manual_instructions"];

/**
 * Real activation details only. Installation and activation are described
 * separately, and validity wording comes from the package's own policy.
 */
export function EsimInstallGuide({
  locale,
  esimId,
  qrPayload,
  installInfo,
  activationPolicy,
  expired,
  demo = false,
  initialMethod = "qr",
  embedded = false,
}: {
  locale: Locale;
  esimId: string;
  qrPayload: string | null;
  installInfo: unknown;
  activationPolicy?: string | null;
  expired?: boolean;
  demo?: boolean;
  initialMethod?: "qr" | "manual" | "guide";
  embedded?: boolean;
}) {
  const copy = ACCOUNT_COPY[locale];
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"iphone" | "android">("iphone");
  const [method, setMethod] = useState<string>(initialMethod === "guide" ? "qr" : initialMethod);
  const pc = PURCHASE_COPY[locale];
  const c = ACCOUNT_V1_COPY[locale];
  const note = activationNote((activationPolicy as ActivationPolicy) ?? null, locale);

  useEffect(() => {
    let active = true;
    if (!qrPayload || expired || demo) {
      setQrImage(null);
      return () => {
        active = false;
      };
    }
    // Browser-only: the QR library is loaded on demand so it never enters the server bundle.
    void import("qrcode")
      .then(({ default: QRCode }) => QRCode.toDataURL(qrPayload, { width: 640, margin: 2 }))
      .then((image) => {
        if (active) setQrImage(image);
      })
      .catch(() => {
        if (active) setQrImage(null);
      });
    return () => {
      active = false;
    };
  }, [qrPayload, expired, demo]);

  return (
    <div className="grid gap-4">
      <p className="flex gap-2 rounded-xl bg-secondary p-3 text-xs leading-5 text-muted-foreground">
        <Info className="size-4 shrink-0 text-primary" />
        <span>
          {copy.guide.installVsActivate}
          {note ? ` ${note}` : ""}
        </span>
      </p>

      <Tabs value={method} onValueChange={setMethod}>
        <TabsList className={`grid h-auto w-full grid-cols-3 ${embedded ? "hidden" : ""}`}>
          <TabsTrigger value="link" disabled className="min-h-12 flex-col gap-1 whitespace-normal text-xs"><Link2 className="size-4" /><span>{c.link} · {pc.soon}</span></TabsTrigger>
          <TabsTrigger value="qr" className="min-h-12 flex-col gap-1 whitespace-normal text-xs"><QrCode className="size-4" />{copy.esim.qr}</TabsTrigger>
          <TabsTrigger value="manual" className="min-h-12 flex-col gap-1 whitespace-normal text-xs"><Smartphone className="size-4" />{c.manual}</TabsTrigger>
        </TabsList>
        <TabsContent value="qr" className="pt-3">
      {demo ? <div className="mx-auto grid size-48 place-items-center rounded-lg border border-dashed border-border bg-secondary"><QrCode className="size-16 text-muted-foreground" /><span className="text-xs font-bold">DEMO</span></div> : expired ? (
        <p className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
          {copy.esim.expiredQr}
        </p>
      ) : qrImage ? (
        <img
          src={qrImage}
          alt={copy.esim.qr}
          width={640}
          height={640}
          className="mx-auto size-48 rounded-xl border border-border bg-card p-2 sm:size-56"
        />
      ) : (
        <p className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
          {copy.guide.noQr}
        </p>
      )}

      {qrImage && !expired && !demo && <Button asChild variant="outline" className="mt-3 min-h-11 w-full"><a href={qrImage} download={`pasaport-esim-${esimId}.png`}><Download />{locale === "tr" ? "QR'ı indir" : locale === "de" ? "QR herunterladen" : "Download QR"}</a></Button>}
        </TabsContent>
        <TabsContent value="manual" className="pt-3">
      {!expired && !demo && MANUAL_KEYS.some((key) => installString(installInfo, key)) ? (
        <section className="grid gap-2">
          <h3 className="text-xs font-bold uppercase text-muted-foreground">{copy.guide.manual}</h3>
          {MANUAL_KEYS.map((key) => {
            const value = installString(installInfo, key);
            return value ? (
              <div key={key} className="rounded-xl bg-secondary p-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  {key.replaceAll("_", " ")}
                </p>
                <p className="mt-1 break-all text-sm font-semibold">{value}</p>
              </div>
            ) : null;
          })}
        </section>
      ) : <p className="rounded-lg bg-secondary p-4 text-sm text-muted-foreground">{demo ? ACCOUNT_DEMO_COPY[locale].simulation : expired ? copy.esim.expiredQr : pc.noData}</p>}
        </TabsContent>
      </Tabs>
      <DevicePicker locale={locale} onPlatform={setPlatform} />
      <Tabs value={platform} onValueChange={(value) => { if (value === "iphone" || value === "android") setPlatform(value); }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="iphone" className="gap-1.5"><Apple className="size-4" />{copy.guide.iphone}</TabsTrigger>
          <TabsTrigger value="android" className="gap-1.5"><Smartphone className="size-4" />{copy.guide.android}</TabsTrigger>
        </TabsList>
        <AccountInstallationWalkthrough platform={platform === "iphone" ? "ios" : "android"} method={method === "manual" ? "manual" : "qr"} />
      </Tabs>
      {!demo && !expired && installString(installInfo, "roaming_instructions") && <p className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">{installString(installInfo, "roaming_instructions")}</p>}
    </div>
  );
}

/**
 * Brand → model from the shared curated device list. Only an exact model picked
 * from the list shows its stored status; otherwise no compatibility claim.
 */
function DevicePicker({ locale, onPlatform }: { locale: Locale; onPlatform: (p: "iphone" | "android") => void }) {
  const t = PANEL_COPY[locale];
  const { data: devices = [] } = useQuery({
    queryKey: ["device-compatibility"],
    queryFn: () => listDeviceCompatibility(),
    staleTime: 10 * 60 * 1000,
  });
  const [brand, setBrand] = useState("");
  const [modelId, setModelId] = useState("");
  const brands = useMemo(() => [...new Set(devices.map((d) => d.brand))].sort(), [devices]);
  const models = useMemo(
    () => devices.filter((d) => d.brand === brand).sort((a, b) => a.model.localeCompare(b.model)),
    [devices, brand],
  );
  const device: DeviceRecord | undefined = models.find((d) => d.id === modelId);
  const status = device ? normalizeStatus(device.status) : null;
  const selectClass =
    "min-h-11 w-full rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground";

  return (
    <section className="grid gap-2" aria-label={t.deviceTitle}>
      <h3 className="text-xs font-bold uppercase text-muted-foreground">{t.deviceTitle}</h3>
      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label={t.brand}
          className={selectClass}
          value={brand}
          onChange={(event) => {
            const next = event.target.value;
            setBrand(next);
            setModelId("");
            if (next) onPlatform(next === "Apple" ? "iphone" : "android");
          }}
        >
          <option value="">{t.chooseBrand}</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select
          aria-label={t.model}
          className={selectClass}
          value={modelId}
          disabled={!brand}
          onChange={(event) => setModelId(event.target.value)}
        >
          <option value="">{t.chooseModel}</option>
          {models.map((d) => (
            <option key={d.id} value={d.id}>{d.model}</option>
          ))}
        </select>
      </div>
      {device && status ? (
        <p className="rounded-xl bg-secondary p-3 text-xs leading-5 text-muted-foreground" role="status">
          {status === "COMPATIBLE" ? t.compatible : status === "NOT_COMPATIBLE" ? t.notCompatible : t.uncertain}
          {device.regionVariantWarning ? ` ${t.region}` : ""}
        </p>
      ) : brand ? (
        <p className="text-xs leading-5 text-muted-foreground">{t.noGuarantee}</p>
      ) : null}
    </section>
  );
}
