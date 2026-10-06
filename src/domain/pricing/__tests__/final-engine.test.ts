import { describe, expect, it } from "vitest";
import { costFallback, suggestPrice, below99 } from "../final-engine";

describe("approved pricing engine", () => {
  it("cost ≤ €20: ×2, next .99, min €3.99", () => {
    expect(costFallback(1.22).price).toBe(3.99);
    expect(costFallback(2.21).price).toBe(4.99);
    expect(costFallback(4.04).price).toBe(8.99);
    expect(costFallback(15).price).toBe(30.99);
  });
  it("cost €20–50: +€20", () => expect(costFallback(25).price).toBe(45.99));
  it("cost €50–100: +€30", () => expect(costFallback(60).price).toBe(90.99));
  it("cost >€100: + max(€40, 20%)", () => {
    expect(costFallback(110).price).toBe(150.99);
    expect(costFallback(200).price).toBe(240.99);
    expect(costFallback(300).price).toBe(360.99);
    expect(costFallback(472).price).toBe(566.99);
  });
  it("Airalo exact: .99 below", () => {
    expect(below99(4.5)).toBe(3.99);
    expect(below99(10.5)).toBe(9.99);
    expect(below99(22)).toBe(21.99);
  });
  it("Airalo below cost → manual review", () => expect(suggestPrice(30, 22).status).toBe("MANUAL_REVIEW"));
  it("Airalo < 20% markup → manual review", () => expect(suggestPrice(9, 10.5).rule).toBe("LOW_PROFIT"));
});
