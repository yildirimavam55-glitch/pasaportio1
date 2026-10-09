import { isPreviewHost } from '@/security/headers';
import { assessEligibility, refundWindow, type ActivationHistoryState } from '@/domain/refunds/refund-policy';

export function accountDemoAllowed(host: string, requested: boolean) {
  return requested && (isPreviewHost(host) || /^preview--[a-z0-9-]+\.lovable\.app$/i.test(host));
}
export type DemoEsim = { id: string; iso: 'TR' | 'DE'; total: number; used: number; remaining: number; active: boolean; purchaseAt: string; activatedAt: string | null; expiresAt: string | null; nickname: 'phone' | 'partner' | 'work'; activation: ActivationHistoryState };
export function createAccountDemo(now: Date): DemoEsim[] {
  const day = (offset: number) => new Date(now.getTime() + offset * 86_400_000).toISOString();
  return [
    { id: 'demo-4821', iso: 'TR', total: 10, used: 9.3, remaining: .7, active: true, purchaseAt: day(-3), activatedAt: day(-2), expiresAt: day(28), nickname: 'phone', activation: 'ACTIVATED' },
    { id: 'demo-5930', iso: 'TR', total: 10, used: 1.8, remaining: 8.2, active: true, purchaseAt: day(-3), activatedAt: day(-2), expiresAt: day(28), nickname: 'partner', activation: 'ACTIVATED' },
    { id: 'demo-6174', iso: 'DE', total: 5, used: 0, remaining: 5, active: false, purchaseAt: day(-3), activatedAt: null, expiresAt: null, nickname: 'work', activation: 'NEVER_ACTIVATED' },
  ];
}
export function demoUsage(esim: Pick<DemoEsim, 'total' | 'used' | 'remaining'>) {
  const usedPercent = Math.min(100, Math.max(0, esim.used / esim.total * 100));
  return { usedPercent, remainingPercent: Math.round(esim.remaining / esim.total * 100), low: esim.remaining / esim.total < .1 };
}
export function demoRefund(esim: DemoEsim, now: Date, pending: boolean) {
  const window = refundWindow(esim.purchaseAt, now);
  return { ...window, ...assessEligibility({ hasOrderItem: false, isDemo: true, paymentStatus: null, windowOpen: window.open, usage: 'DEMO', hasOpenRequest: pending, activation: esim.activation }) };
}