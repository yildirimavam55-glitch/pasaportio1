/** Pure helpers for the password-recovery link. Never log or return token values. */
export type RecoveryLinkState = "error" | "expired" | "pending";

/** Reads only the error markers from the recovery URL (hash or query). */
export function readRecoveryLinkState(hash: string, search: string): RecoveryLinkState {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const query = new URLSearchParams(search.replace(/^\?/, ""));
  const code = params.get("error_code") ?? query.get("error_code") ?? "";
  const error = params.get("error") ?? query.get("error") ?? "";
  if (code === "otp_expired" || /expired/i.test(params.get("error_description") ?? query.get("error_description") ?? "")) return "expired";
  if (code || error) return "error";
  return "pending";
}

export const MIN_PASSWORD_LENGTH = 8;

export function validateNewPassword(next: string, repeat: string): "tooShort" | "mismatch" | null {
  if (next.length < MIN_PASSWORD_LENGTH) return "tooShort";
  if (next !== repeat) return "mismatch";
  return null;
}

/** True when the access token was issued by a recovery/OTP link (amr claim). */
export function isRecoveryToken(accessToken: string | undefined): boolean {
  if (!accessToken) return false;
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return false;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { amr?: Array<{ method?: string }> };
    return (json.amr ?? []).some((entry) => entry.method === "recovery" || entry.method === "otp");
  } catch {
    return false;
  }
}
