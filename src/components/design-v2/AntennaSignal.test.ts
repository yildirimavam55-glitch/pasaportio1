import { describe, expect, it } from "vitest";
import { antennaCrop } from "./AntennaSignal";

describe("desktop source crop", () => {
 for (const width of [1280, 1440, 1920]) {
  it(`keeps 50px above the antenna tip at ${width}px without empty bands`, () => {
   const scale = width / 1672;
   const position = antennaCrop(width, 420, 1672, 941);
   const top = (420 - 941 * scale) * position;
   expect(153 / 768 * 941 * scale + top).toBeCloseTo(50);
   expect(top).toBeLessThanOrEqual(0);
   expect(top + 941 * scale).toBeGreaterThanOrEqual(420);
  });
 }
});