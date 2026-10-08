import { describe, it, expect } from "vitest";
import { canShowGift } from "./gift-eligibility";
const now = Date.parse("2026-10-08T10:33:00Z");
const active = { code: "TRAVEL26", endsAt: "2026-10-10T10:33:00Z" };
describe("whole gift eligibility", () => {
  it("shows a verified running coded campaign", () => expect(canShowGift(active, true, now)).toBe(true));
  it("hides while unverified/loading", () => expect(canShowGift(active, false, now)).toBe(false));
  it("removes gift when server returns no active started campaign", () => expect(canShowGift(null, true, now)).toBe(false));
  it("hides at expiry boundary", () => expect(canShowGift({ ...active, endsAt: new Date(now).toISOString() }, true, now)).toBe(false));
  it("hides without a valid coupon", () => expect(canShowGift({ ...active, code: "" }, true, now)).toBe(false));
});