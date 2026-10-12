/** Allowed admin transitions for customer account deletion requests. */
const TRANSITIONS: Record<string, readonly string[]> = {
  REQUESTED: ["IN_REVIEW", "REJECTED"],
  IN_REVIEW: ["COMPLETED", "REJECTED"],
};

export function deletionTransitionAllowed(from: string, to: string): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}
