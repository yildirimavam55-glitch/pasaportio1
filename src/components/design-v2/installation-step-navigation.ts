/** Clamp educational navigation without wrapping into a different step. */
export function installationStepState(step: number, count: number) {
  const last = Math.max(0, count - 1);
  const current = Math.min(last, Math.max(0, step));
  return { current, previous: Math.max(0, current - 1), next: Math.min(last, current + 1), previousDisabled: current === 0, nextDisabled: current === last };
}