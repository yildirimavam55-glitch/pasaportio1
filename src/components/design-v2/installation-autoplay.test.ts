import { afterEach, expect, it, vi } from 'vitest';
import { scheduleInstallationAdvance } from './installation-autoplay';

afterEach(() => vi.useRealTimers());
it('advances after three seconds, not before', () => {
  vi.useFakeTimers();
  const advance = vi.fn();
  scheduleInstallationAdvance(advance);
  vi.advanceTimersByTime(2999);
  expect(advance).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(advance).toHaveBeenCalledTimes(1);
});
it('cancels automatic advancement when paused or unmounted', () => {
  vi.useFakeTimers();
  const advance = vi.fn();
  const cancel = scheduleInstallationAdvance(advance);
  cancel();
  vi.advanceTimersByTime(3000);
  expect(advance).not.toHaveBeenCalled();
});