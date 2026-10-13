import { describe, expect, it } from "vitest";
import { esimCategory } from "../purchase-categories";

const base = { totalMb: 1000, remainingMb: 500, expiresAt: null };
const now = new Date("2026-10-13T00:00:00Z");

describe("esimCategory", () => {
  it("active status is active", () => expect(esimCategory({ ...base, status: "ACTIVE" }, { now })).toBe("active"));
  it("ready is pending installation", () => expect(esimCategory({ ...base, status: "READY" }, { now })).toBe("pending"));
  it("expired is used", () => expect(esimCategory({ ...base, status: "ACTIVE", expiresAt: "2026-10-01T00:00:00Z" }, { now })).toBe("used"));
  it("open refund wins over active", () => expect(esimCategory({ ...base, status: "ACTIVE" }, { refundOpen: true, now })).toBe("refunding"));
  it("refunded is never used", () => expect(esimCategory({ ...base, status: "REFUNDED" }, { now })).toBe("refunded"));
});
