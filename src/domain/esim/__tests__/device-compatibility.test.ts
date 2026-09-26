import { describe, expect, it } from "vitest";
import { normalizeStatus, searchDevices, type DeviceRecord } from "../device-compatibility";
import { detectDeviceFromSignals } from "../device-detection";

const base: Omit<DeviceRecord, "id" | "brand" | "model" | "aliases"> = {
  family: null,
  status: "COMPATIBLE",
  notes: null,
  regionVariantWarning: false,
  active: true,
  lastReviewed: "2026-01-01",
};

const devices: DeviceRecord[] = [
  { ...base, id: "1", brand: "Apple", model: "iPhone 15", aliases: ["15"] },
  { ...base, id: "2", brand: "Samsung", model: "Galaxy S24", aliases: ["s24"] },
  { ...base, id: "3", brand: "Google", model: "Pixel 9", aliases: ["pixel9"] },
];

describe("device compatibility search", () => {
  it("matches by model", () => {
    expect(searchDevices(devices, "iphone 15").map((d) => d.id)).toEqual(["1"]);
  });

  it("matches by alias", () => {
    expect(searchDevices(devices, "s24").map((d) => d.id)).toEqual(["2"]);
  });

  it("scopes to a brand when no query is given", () => {
    expect(searchDevices(devices, "", "Google").map((d) => d.id)).toEqual(["3"]);
  });

  it("does not mix brands when searching for a model within a chosen brand", () => {
    expect(searchDevices(devices, "galaxy", "Apple")).toEqual([]);
    expect(searchDevices(devices, "15", "Apple").map((d) => d.id)).toEqual(["1"]);
  });

  it("falls back to UNCERTAIN for unknown status values", () => {
    expect(normalizeStatus("WHATEVER")).toBe("UNCERTAIN");
  });
});

describe("safe browser device detection", () => {
  it("matches one exact Android model identifier from browser data", () => {
    const result = detectDeviceFromSignals(devices, { model: "s24", userAgent: "Android" });
    expect(result.kind).toBe("exact");
    if (result.kind === "exact") expect(result.device.id).toBe("2");
  });

  it("keeps Android and Samsung family-only signals partial", () => {
    expect(detectDeviceFromSignals(devices, { userAgent: "Android 14" })).toEqual({ kind: "partial", family: "android" });
    expect(detectDeviceFromSignals(devices, { userAgent: "Samsung Android" })).toEqual({ kind: "partial", family: "samsung" });
  });

  it("never guesses an iPhone model from Safari signals", () => {
    expect(detectDeviceFromSignals(devices, { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", platform: "iPhone", maxTouchPoints: 5 })).toEqual({ kind: "partial", family: "iphone" });
  });

  it("returns unknown when no useful device signal exists", () => {
    expect(detectDeviceFromSignals(devices, { userAgent: "Mozilla/5.0 (X11; Linux x86_64)" })).toEqual({ kind: "unknown" });
  });

  it("rejects ambiguous exact aliases", () => {
    const duplicate = { ...devices[1], id: "4", model: "Galaxy S24 regional" } as DeviceRecord;
    expect(detectDeviceFromSignals([...devices, duplicate], { model: "s24", userAgent: "Android" }).kind).toBe("partial");
  });
});
