import { describe, expect, it } from "vitest";
import { isRecoveryToken, readRecoveryLinkState, validateNewPassword } from "./recovery-link";

const token = (amr: unknown) => `h.${btoa(JSON.stringify({ amr })).replace(/=+$/, "")}.s`;

describe("password recovery link", () => {
  it("flags an expired link", () => {
    expect(readRecoveryLinkState("#error=access_denied&error_code=otp_expired", "")).toBe("expired");
  });
  it("flags an invalid link", () => {
    expect(readRecoveryLinkState("", "?error=server_error")).toBe("error");
  });
  it("accepts a clean link as pending", () => {
    expect(readRecoveryLinkState("", "?flow=recovery")).toBe("pending");
  });
  it("requires at least 8 characters", () => {
    expect(validateNewPassword("1234567", "1234567")).toBe("tooShort");
  });
  it("requires matching passwords", () => {
    expect(validateNewPassword("12345678", "12345679")).toBe("mismatch");
  });
  it("only treats recovery sessions as recovery", () => {
    expect(isRecoveryToken(token([{ method: "recovery" }]))).toBe(true);
    expect(isRecoveryToken(token([{ method: "password" }]))).toBe(false);
  });
});
