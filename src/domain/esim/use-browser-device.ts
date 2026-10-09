import { useEffect, useState } from "react";
import type { DeviceRecord } from "./device-compatibility";
import { detectDeviceFromSignals, isMobileBrowser, type BrowserDeviceSignals, type DeviceDetection } from "./device-detection";

type DeviceNavigator = Navigator & {
  userAgentData?: { mobile?: boolean; platform?: string; getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string; platform?: string; platformVersion?: string }> };
};

export type BrowserDeviceDiagnostics = BrowserDeviceSignals & { clientHints: boolean; uaMobile: boolean | null; secure: boolean; mobile: boolean };

/** Browser hints are ephemeral and never stored or sent anywhere; only unique curated model matches can verify compatibility. */
export function useBrowserDevice(devices: DeviceRecord[]) {
  const [detection, setDetection] = useState<DeviceDetection>({ kind: "unknown" });
  const [os, setOs] = useState("");
  const [mobile, setMobile] = useState(false);
  const [ready, setReady] = useState(false);
  const [diagnostics, setDiagnostics] = useState<BrowserDeviceDiagnostics | null>(null);
  useEffect(() => {
    if (!devices.length) return;
    let cancelled = false;
    const nav = navigator as DeviceNavigator;
    const inspect = async () => {
      const hints: { model?: string; platform?: string } = await nav.userAgentData?.getHighEntropyValues?.(["model", "platform", "platformVersion"]).catch(() => ({})) ?? {};
      if (cancelled) return;
      const platform = hints.platform ?? nav.userAgentData?.platform ?? nav.platform;
      const signals: BrowserDeviceSignals = { ...(hints.model ? { model: hints.model } : {}), platform, userAgent: nav.userAgent, maxTouchPoints: nav.maxTouchPoints };
      const isMobile = isMobileBrowser(signals, nav.userAgentData?.mobile);
      setOs(/iPhone|iPad|iPod/.test(nav.userAgent) ? "iOS" : /Android/.test(`${platform} ${nav.userAgent}`) ? "Android" : "");
      setMobile(isMobile);
      setDetection(detectDeviceFromSignals(devices, signals));
      setDiagnostics({ ...signals, clientHints: Boolean(nav.userAgentData), uaMobile: nav.userAgentData?.mobile ?? null, secure: window.isSecureContext, mobile: isMobile });
      setReady(true);
    };
    void inspect();
    return () => { cancelled = true; };
  }, [devices]);
  return { detection, os, mobile, ready, diagnostics };
}
