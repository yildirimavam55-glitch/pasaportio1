import { useEffect, useState } from "react";
import { Apple, Download, Info, PlayCircle, Smartphone } from "lucide-react";

import { CLink as Link } from "@/components/design-v2/v2-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Locale } from "@/domain/enums";
import { activationNote, type ActivationPolicy } from "@/domain/esim/activation";
import { ACCOUNT_COPY } from "./copy";

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
}: {
  locale: Locale;
  esimId: string;
  qrPayload: string | null;
  installInfo: unknown;
  activationPolicy?: string | null;
  expired?: boolean;
}) {
  const copy = ACCOUNT_COPY[locale];
  const [qrImage, setQrImage] = useState<string | null>(null);
  const quickLink = installString(installInfo, "universal_link") ?? installString(installInfo, "lpa_link");
  const note = activationNote((activationPolicy as ActivationPolicy) ?? null, locale);

  useEffect(() => {
    let active = true;
    if (!qrPayload || expired) {
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
  }, [qrPayload, expired]);

  return (
    <div className="grid gap-4">
      <p className="flex gap-2 rounded-xl bg-secondary p-3 text-xs leading-5 text-muted-foreground">
        <Info className="size-4 shrink-0 text-primary" />
        <span>
          {copy.guide.installVsActivate}
          {note ? ` ${note}` : ""}
        </span>
      </p>

      {expired ? (
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

      {quickLink && !expired && (
        <Button asChild variant="cta" className="min-h-11">
          <a href={quickLink}>{copy.guide.quick}</a>
        </Button>
      )}

      <Tabs defaultValue="iphone">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="iphone" className="gap-1.5">
            <Apple className="size-4" />
            {copy.guide.iphone}
          </TabsTrigger>
          <TabsTrigger value="android" className="gap-1.5">
            <Smartphone className="size-4" />
            {copy.guide.android}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="iphone">
          <Steps items={copy.guide.iphoneSteps} />
        </TabsContent>
        <TabsContent value="android">
          <Steps items={copy.guide.androidSteps} />
        </TabsContent>
      </Tabs>

      {MANUAL_KEYS.some((key) => installString(installInfo, key)) && (
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
      )}

      {qrImage && !expired && (
        <Button asChild variant="outline" className="min-h-11">
          <a href={qrImage} download={`travely-esim-${esimId}.png`}>
            <Download />
            {locale === "tr" ? "QR'ı indir" : locale === "de" ? "QR herunterladen" : "Download QR"}
          </a>
        </Button>
      )}
    </div>
  );
}

function Steps({ items }: { items: readonly string[] }) {
  return (
    <ol className="mt-3 grid gap-3">
      {items.map((step, index) => (
        <li key={step} className="flex gap-3 text-sm leading-6">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {index + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}
