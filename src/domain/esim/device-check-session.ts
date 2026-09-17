import { useCallback, useEffect, useState } from "react";
import { EMPTY_DEVICE_CHECK, normalizeStatus, type CompatibilityStatus, type DeviceCheckState } from "./device-compatibility";

const STORAGE_KEY = "travely.device-check.v1";
const listeners = new Set<(state: DeviceCheckState) => void>();
let current: DeviceCheckState = EMPTY_DEVICE_CHECK;
let hydrated = false;

function read(): DeviceCheckState {
  if (typeof window === "undefined") return EMPTY_DEVICE_CHECK;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DEVICE_CHECK;
    const parsed = JSON.parse(raw) as Partial<DeviceCheckState>;
    if (!parsed || typeof parsed.deviceModel !== "string" || !parsed.compatibilityResult) return EMPTY_DEVICE_CHECK;
    return {
      compatibilityChecked: true,
      deviceModel: parsed.deviceModel,
      compatibilityResult: normalizeStatus(parsed.compatibilityResult),
    };
  } catch {
    return EMPTY_DEVICE_CHECK;
  }
}

function publish(next: DeviceCheckState) {
  current = next;
  if (typeof window !== "undefined") {
    try {
      if (next.compatibilityChecked) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — state stays in memory for this session */
    }
  }
  listeners.forEach((listener) => listener(next));
}

/** Remembers the checked device for the session only (checkout readiness state). */
export function useDeviceCheck() {
  const [state, setState] = useState<DeviceCheckState>(current);

  useEffect(() => {
    if (!hydrated) {
      hydrated = true;
      current = read();
    }
    setState(current);
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const setResult = useCallback((deviceModel: string, compatibilityResult: CompatibilityStatus) => {
    publish({ compatibilityChecked: true, deviceModel, compatibilityResult });
  }, []);
  const reset = useCallback(() => publish(EMPTY_DEVICE_CHECK), []);

  return { ...state, setResult, reset };
}
