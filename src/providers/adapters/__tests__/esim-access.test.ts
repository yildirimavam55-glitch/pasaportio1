import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
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
    vi.stubEnv("ESIM_ACCESS_SECRET_KEY", "test-only-secret");
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
    expect(options.headers["RT-RequestID"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(options.headers["RT-Timestamp"]).toMatch(/^\\d{13}$/);
    expect(options.headers["RT-Signature"]).toBe(createHmac("sha256", "test-only-secret")
      .update(options.headers["RT-Timestamp"] + options.headers["RT-RequestID"] + "test-only-code" + options.body)
      .digest("hex"));
    expect(JSON.stringify(options.headers)).not.toContain("test-only-secret");
    expect(JSON.parse(options.body).packageCode).toBe("ES_3_30");
  });

  it("rejects results for a different package code", async () => {
    vi.stubEnv("ESIM_ACCESS_ACCESS_CODE", "test-only-code");
    vi.stubEnv("ESIM_ACCESS_SECRET_KEY", "test-only-secret");
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
    vi.stubEnv("ESIM_ACCESS_SECRET_KEY", "test-only-secret");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      success: false, errorCode: "101003", obj: null,
    }), { status: 200 }));
    expect((await adapter().validateItem!("ES_3_30")).available).toBe(false);
  });
});

describe("eSIM Access catalogue authentication", () => {
  it("never contacts the supplier without the HMAC secret key", async () => {
    vi.stubEnv("ESIM_ACCESS_ACCESS_CODE", "test-only-code");
    vi.stubEnv("ESIM_ACCESS_SECRET_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const provider = adapter();
    expect(provider.hasCredential()).toBe(false);
    expect(await provider.fetchCatalogue()).toMatchObject({ complete: false, error: "CREDENTIAL_REQUIRED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches the catalogue without making an order or changing public prices", async () => {
    vi.stubEnv("ESIM_ACCESS_ACCESS_CODE", "test-only-code");
    vi.stubEnv("ESIM_ACCESS_SECRET_KEY", "test-only-secret");
    const rows = [
      { packageCode: "ES_3_30", price: 16000, currencyCode: "USD", volume: 3221225472,
        duration: 30, durationUnit: "DAY", dataType: 1, location: "ES",
        locationNetworkList: [{ locationName: "Spain", locationCode: "ES",
          locationLogo: "https://example.org/spain-flag.png",
          operatorList: [{ operatorName: "Sample Operator", networkType: "4G/5G" }] }] },
      { packageCode: "ES_DAY_PASS", dataType: 2, durationUnit: "DAY" },
    ];
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true, obj: { packageList: rows },
    }), { status: 200 }));
    vi.stubGlobal("fetch", mock);
    const provider = adapter();
    const data = await provider.fetchCatalogue();
    expect(data.complete).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.["externalId"]).toBe("ES_3_30");
    expect(data.items[0]?.["providerCost"]).toBe(1.6);
    expect(data.items[0]?.["coverage"]).toEqual(["ES"]);
    // Preserve supplier logo and network evidence in raw data; this is not a travel photo.
    expect((data.items[0]?.["locationNetworkList"] as Array<Record<string, unknown>>)[0]?.["locationLogo"])
      .toBe("https://example.org/spain-flag.png");
    expect(provider.placeEsimOrder).toBeUndefined();
    expect(mock).toHaveBeenCalledTimes(1);
    expect(String(mock.mock.calls[0]?.[0])).toContain("/api/v1/open/package/list");
  });
});
