import { describe, expect, it } from 'vitest';
import { accountDemoAllowed, createAccountDemo, demoRefund, demoUsage } from '../account-demo';
import { assessActivationHistory, assessEligibility, refundWindow } from '@/domain/refunds/refund-policy';

const now = new Date('2026-10-09T08:57:00Z');
const packages = createAccountDemo(now);
describe('isolated account demo', () => {
  it('never allows fixtures on the published site, even with the query flag', () => {
    expect(accountDemoAllowed('pasaport2.lovable.app', true)).toBe(false);
    expect(accountDemoAllowed('localhost', true)).toBe(true);
    expect(accountDemoAllowed('localhost', false)).toBe(false);
    expect(accountDemoAllowed('preview--fake.example.org', true)).toBe(false);
  });
  it('first package has 9.3 GB used, .7 GB remaining, 93% used and low alert', () => {
    const first = packages[0];
    expect(first).toMatchObject({ total: 10, used: 9.3, remaining: .7 });
    if (!first) throw new Error('fixture missing');
    expect(demoUsage(first)).toMatchObject({ usedPercent: 93, remainingPercent: 7, low: true });
  });
  it('second package has 18% used and 82% remaining without low alert', () => {
    const second = packages[1];
    if (!second) throw new Error('fixture missing');
    expect(demoUsage(second)).toMatchObject({ usedPercent: 18, remainingPercent: 82, low: false });
  });
  it('warning is strictly below 10%, not at 10%', () => {
    expect(demoUsage({ total: 10, used: 9, remaining: 1 }).low).toBe(false);
  });
  it('ready Germany fixture has 5 GB and no invented expiry or activation', () => {
    expect(packages[2]).toMatchObject({ iso: 'DE', total: 5, used: 0, remaining: 5, activatedAt: null, expiresAt: null });
  });
});
describe('standard activation-history refunds', () => {
  it('1. active packages are blocked', () => {
    for (const p of packages.filter(p => p.active)) expect(demoRefund(p, now, false)).toMatchObject({ canRequest: false, eligibility: 'NOT_ELIGIBLE_ACTIVATED' });
  });
  it('2. previously activated and expired remains blocked', () => {
    const activation = assessActivationHistory('EXPIRED', { activated_at: '2026-10-07T00:00:00Z' });
    expect(activation).toBe('ACTIVATED');
    expect(assessEligibility({ hasOrderItem: true, isDemo: false, paymentStatus: 'PAID', usage: 'VERIFIED_UNUSED', windowOpen: true, hasOpenRequest: false, activation }).canRequest).toBe(false);
  });
  it('3. never activated purchased 3 days ago has 11 days to request', () => {
    const third = packages[2];
    if (!third) throw new Error('fixture missing');
    expect(demoRefund(third, now, false)).toMatchObject({ canRequest: true, daysLeft: 11 });
  });
  it('4. never activated older than 14 days is blocked', () => {
    const third = packages[2];
    if (!third) throw new Error('fixture missing');
    expect(demoRefund({ ...third, purchaseAt: '2026-09-24T08:57:00Z' }, now, false)).toMatchObject({ canRequest: false, eligibility: 'NOT_ELIGIBLE_EXPIRED' });
    expect(refundWindow('2026-09-25T08:57:00Z', now).open).toBe(false);
  });
  it('5. pending refund prevents duplicates', () => {
    const third = packages[2];
    if (!third) throw new Error('fixture missing');
    expect(demoRefund(third, now, true)).toMatchObject({ canRequest: false, eligibility: 'OPEN_REQUEST' });
  });
  it('unknown history never assumes READY means never activated', () => {
    expect(assessActivationHistory('READY', {})).toBe('UNKNOWN');
    expect(assessActivationHistory('READY', { provider_activation: { verified: true, ever_activated: false }, activation_history: [{ event: 'ACTIVATED' }] })).toBe('ACTIVATED');
    expect(assessActivationHistory('READY', { provider_activation: { verified: true, ever_activated: false } })).toBe('NEVER_ACTIVATED');
  });
  it('completed refund prevents a new request', () => {
    expect(assessEligibility({ hasOrderItem: true, isDemo: false, paymentStatus: 'PAID', usage: 'VERIFIED_UNUSED', windowOpen: true, hasOpenRequest: false, hasCompletedRequest: true, activation: 'NEVER_ACTIVATED' })).toMatchObject({ canRequest: false, eligibility: 'COMPLETED_REQUEST' });
  });
});