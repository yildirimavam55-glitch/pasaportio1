import { useEffect, useState } from "react";
import type { DeviceRecord } from "./device-compatibility";
import { detectDeviceFromSignals, type DeviceDetection } from "./device-detection";

type DeviceNavigator = Navigator & {
  userAgentData?: { platform?: string; getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string; platform?: string; platformVersion?: string }> };
};

/** Browser hints are ephemeral; only unique curated model matches can verify compatibility. */
export function useBrowserDevice(devices: DeviceRecord[]) {
  const [detection, setDetection] = useState<DeviceDetection>({ kind: "unknown" });
  const [os, setOs] = useState("");
  useEffect(() => {
    if (!devices.length) return;
    let cancelled = false;
    const nav = navigator as DeviceNavigator;
    const inspect = async () => {
      const hints = await nav.userAgentData?.getHighEntropyValues?.(["model", "platform", "platformVersion"]).catch(() => ({})) ?? {};
      if (cancelled) return;
      const platform = hints.platform ?? nav.userAgentData?.platform ?? nav.platform;
      setOs(/iPhone|iPad|iPod/.test(nav.userAgent) ? "iOS" : /Android/.test(`${platform} ${nav.userAgent}`) ? "Android" : "");
      setDetection(detectDeviceFromSignals(devices, { model: hints.model, platform, userAgent: nav.userAgent, maxTouchPoints: nav.maxTouchPoints }));
    };
    void inspect();
    return () => { cancelled = true; };
  }, [devices]);
  return { detection, os };
}