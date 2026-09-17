import { describe, expect, it } from "vitest";
import { normalizeStatus, searchDevices, type DeviceRecord } from "../device-compatibility";

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

  it("falls back to UNCERTAIN for unknown status values", () => {
    expect(normalizeStatus("WHATEVER")).toBe("UNCERTAIN");
  });
});
