import { describe, expect, it } from "vitest";
import { tripDays } from "../trip-planner.functions";

describe("tripDays", () => {
  it("counts inclusive days", () => {
    expect(tripDays("2026-07-01", "2026-07-07")).toBe(7);
    expect(tripDays("2026-07-01", "2026-07-01")).toBe(1);
  });
  it("falls back to 7 on invalid or reversed dates", () => {
    expect(tripDays("bad", "2026-07-01")).toBe(7);
    expect(tripDays("2026-07-10", "2026-07-01")).toBe(7);
  });
  it("clamps to 90 days", () => {
    expect(tripDays("2026-01-01", "2026-12-31")).toBe(90);
  });
});
