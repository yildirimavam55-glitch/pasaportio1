import { describe, expect, it } from "vitest";
import { needsLowBalanceAlert } from "@/domain/providers/sync-engine";
import { redactSensitive } from "@/lib/admin-guard";

describe("needsLowBalanceAlert", () => {
  it("fires once when balance is at or below threshold and no open alert exists", () => {
    expect(needsLowBalanceAlert(0, 100, false)).toBe(true);
    expect(needsLowBalanceAlert(100, 100, false)).toBe(true);
    expect(needsLowBalanceAlert(99.99, 100, false)).toBe(true);
  });

  it("never duplicates while an OPEN alert already exists", () => {
    expect(needsLowBalanceAlert(0, 100, true)).toBe(false);
  });

  it("stays quiet above threshold", () => {
    expect(needsLowBalanceAlert(250, 100, false)).toBe(false);
  });

  it("unknown balance or undefined threshold never alerts", () => {
    expect(needsLowBalanceAlert(null, 100, false)).toBe(false);
    expect(needsLowBalanceAlert(undefined, 100, false)).toBe(false);
    expect(needsLowBalanceAlert(0, null, false)).toBe(false);
    expect(needsLowBalanceAlert(0, undefined, false)).toBe(false);
  });
});

describe("redactSensitive", () => {
  it("redacts secret-like keys at any depth", () => {
    const input = {
      name: "eSIM Go",
      config: { api_key: "sk-123", base_url: "https://api", nested: { credentialSecretNames: ["ESIM_GO_API_KEY"] } },
    };
    const output = redactSensitive(input) as Record<string, any>;
    expect(output["name"]).toBe("eSIM Go");
    expect(output["config"].base_url).toBe("https://api");
    expect(output["config"].api_key).toBe("[redacted]");
    expect(output["config"].nested.credentialSecretNames).toBe("[redacted]");
  });

  it("redacts activation credentials and bearer tokens", () => {
    const output = redactSensitive({ qrPayload: "LPA:1$...", authorization: "Bearer x", password: "p", note: "ok" }) as Record<string, any>;
    expect(output["qrPayload"]).toBe("[redacted]");
    expect(output["authorization"]).toBe("[redacted]");
    expect(output["password"]).toBe("[redacted]");
    expect(output["note"]).toBe("ok");
  });

  it("passes through plain values and nulls", () => {
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive({ count: 3, items: ["a", "b"] })).toEqual({ count: 3, items: ["a", "b"] });
  });
});
