export const INSTALLATION_AUTOPLAY_MS = 3000;

export function scheduleInstallationAdvance(advance: () => void) {
  const timer = setTimeout(advance, INSTALLATION_AUTOPLAY_MS);
  return () => clearTimeout(timer);
}