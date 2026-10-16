import { describe, expect, it } from "vitest";
import { createDraftHistory, DRAFT_HISTORY_LIMIT, pushDraftHistory, redoDraftHistory, undoDraftHistory } from "../draft-history";

describe("draft undo/redo", () => {
  it("undo returns the previous draft and redo restores the edit", () => {
    let h = pushDraftHistory(createDraftHistory<string>(), "a");
    const undone = undoDraftHistory(h, "b")!;
    expect(undone.value).toBe("a");
    h = undone.history;
    const redone = redoDraftHistory(h, "a")!;
    expect(redone.value).toBe("b");
  });

  it("a new edit clears redo", () => {
    const undone = undoDraftHistory(pushDraftHistory(createDraftHistory<string>(), "a"), "b")!;
    expect(pushDraftHistory(undone.history, "a").future).toEqual([]);
  });

  it("nothing to undo returns null", () => {
    expect(undoDraftHistory(createDraftHistory<string>(), "a")).toBeNull();
    expect(redoDraftHistory(createDraftHistory<string>(), "a")).toBeNull();
  });

  it("keeps at most 50 steps", () => {
    let h = createDraftHistory<number>();
    for (let i = 0; i < 60; i++) h = pushDraftHistory(h, i);
    expect(h.past.length).toBe(DRAFT_HISTORY_LIMIT);
    expect(h.past[0]).toBe(10);
  });
});
