import { afterEach, describe, expect, it, vi } from "vitest";
import { cardRevealDelay, observeViewport, REVEAL_DISTANCE_PX, REVEAL_DURATION_MS, RESOURCE_AHEAD_PX, withinEntry } from "./viewport-observer";

afterEach(() => vi.unstubAllGlobals());
describe("homepage reveal rules", () => {
  it("keeps movement and timing within the requested bounds", () => {
    expect(REVEAL_DISTANCE_PX).toBe(14);
    expect(REVEAL_DURATION_MS).toBe(500);
  });
  it("staggers card groups by 60ms and caps the total at 250ms", () => {
    expect([0,1,2,3,4,5,6].map(cardRevealDelay)).toEqual([0,60,120,180,240,250,250]);
  });
  it("prepares resources 400px ahead independently of visual entry", () => {
    expect(RESOURCE_AHEAD_PX).toBe(400);
    expect(withinEntry(900, 740, RESOURCE_AHEAD_PX)).toBe(true);
    expect(withinEntry(900, 740)).toBe(false);
    expect(withinEntry(740, 740)).toBe(true);
    expect(withinEntry(-900, 740)).toBe(true);
  });
  it("shows content immediately when observer initialization fails", () => {
    vi.stubGlobal("IntersectionObserver", class { constructor() { throw new Error("unsupported"); } });
    const show = vi.fn();
    observeViewport({} as Element, 24, show);
    expect(show).toHaveBeenCalledOnce();
  });
  it("shows content immediately without observer support", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const show = vi.fn();
    observeViewport({} as Element, 24, show);
    expect(show).toHaveBeenCalledOnce();
  });
});