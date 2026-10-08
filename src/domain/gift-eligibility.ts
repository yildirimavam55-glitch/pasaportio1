/** Public banner is already server-filtered for status/start/limits. Fail closed locally too. */
export function canShowGift(data: { code: string | null; endsAt: string } | null | undefined, verified: boolean, now: number) {
  return Boolean(verified && data && /^[A-Z0-9_-]{3,32}$/.test(data.code ?? "") && Number.isFinite(Date.parse(data.endsAt)) && Date.parse(data.endsAt) > now);
}