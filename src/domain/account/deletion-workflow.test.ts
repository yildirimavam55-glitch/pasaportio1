import { describe, expect, it } from "vitest";
import { deletionTransitionAllowed } from "./deletion-workflow";

describe("account deletion workflow", () => {
  it("must be reviewed before completion", () => {
    expect(deletionTransitionAllowed("REQUESTED", "COMPLETED")).toBe(false);
    expect(deletionTransitionAllowed("REQUESTED", "IN_REVIEW")).toBe(true);
    expect(deletionTransitionAllowed("IN_REVIEW", "COMPLETED")).toBe(true);
  });
  it("closed requests cannot change", () => {
    expect(deletionTransitionAllowed("COMPLETED", "REJECTED")).toBe(false);
    expect(deletionTransitionAllowed("REJECTED", "COMPLETED")).toBe(false);
  });
});
