import { afterEach, describe, expect, it, vi } from "vitest";
import { createEsimAccessAdapter, esimAccessGb, esimAccessMoney, isImportableEsimAccessPackage, normalizeEsimAccessPackage } from "../esim-access.server";
import type { AdapterContext } from "../types";

const adapter = () => createEsimAccessAdapter({
  providerCode: "ESIM_ACCESS",
  baseUrl: null,
  credentialSecretName: null,
  config: {} as AdapterContext["config"],
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("eSIM Access normalization", () => {
  it("reads prices in 1/10000 of the currency", () => {
    expect(esimAccessMoney(16000)).toBe(1.6);
  });
  it("sells 3 binary GB as 3 GB", () => {
    expect(esimAccessGb(3221225472)).toBe(3);
  });
  it("never imports daily-pass plans", () => {
    expect(isImportableEsimAccessPackage({ dataType: 2, durationUnit: "DAY" })).toBe(false);
    expect(isImportableEsimAccessPackage({ dataType: 1, durationUnit: "DAY" })).toBe(true);
  });
  it("keeps the supplier cost and coverage", () => {
    const n = normalizeEsimAccessPackage({ packageCode: "CKH002", name: "Spain 3GB 30Days", price: 16000, currencyCode: "USD", volume: 3221225472, duration: 30, location: "ES", locationNetworkList: [{ locationCode: "ES", operatorList: [{ operatorName: "Orange" }] }] });
    expect(n["providerCost"]).toBe(1.6);
    expect(n["coverage"]).toEqual(["ES"]);
    expect(n["unlimited"]).toBe(false);
  });
});


describe("eSIM Access read-only checkout validation", () => {
  const matchingPackage = {
    packageCode: "ES_3_30", price: 16000, currencyCode: "USD",
    dataType: 1, duration: 30, durationUnit: "DAY", volume: 3221225472,
    location: "ES",
  };

  it("queries the exact package code with a server-side access code, without ordering", async () => {
    vi.stubEnv("ESIM_ACCESS_ACCESS_CODE", "test-only-code");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true, obj: { packageList: [matchingPackage] },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = adapter();
    const outcome = await provider.validateItem!("ES_3_30");
    expect(outcome).toEqual({ available: true, providerCost: 1.6, currency: "USD" });
    expect(provider.placeEsimOrder).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.esimaccess.com/api/v1/open/package/list");
    expect(options.headers["RT-AccessCode"]).toBe("test-only-code");
    expect(JSON.parse(options.body).packageCode).toBe("ES_3_30");
  });

  it("rejects results for a different package code", async () => {
    vi.stubEnv("ESIM_ACCESS_ACCESS_CODE", "test-only-code");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true, obj: { packageList: [matchingPackage] },
    }), { status: 200 })));
    expect(await adapter().validateItem!("TR_1_7")).toEqual({
      available: false, providerCost: null, currency: null,
    });
  });

  it("fails closed without credentials or when the supplier refuses the request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await adapter().validateItem!("ES_3_30")).toEqual({
      available: false, providerCost: null, currency: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv("ESIM_ACCESS_ACCESS_CODE", "test-only-code");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      success: false, errorCode: "101003", obj: null,
    }), { status: 200 }));
    expect((await adapter().validateItem!("ES_3_30")).available).toBe(false);
  });
});
