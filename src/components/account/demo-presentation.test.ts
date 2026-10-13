import { describe, expect, it } from 'vitest';
import { createAccountDemo, accountDemoAllowed, accountDemoPresentationAllowed } from '@/domain/esim/account-demo';
import { demoEsimRecord } from './demo-presentation';
describe('account demo presentation boundary', () => {
  it('never gives demo cards installation credentials or purchase capabilities', () => {
    for (const item of createAccountDemo(new Date('2026-10-13T08:59:00Z')).map(demoEsimRecord)) {
      expect(item.installInfo).toBeNull();
      expect(item.orderItemId).toBeNull();
      expect(item.hasQr).toBe(false);
      expect(item.hasInstallInfo).toBe(false);
      expect(item.hasIccid).toBe(false);
      expect(item.topupSupported).toBe(false);
      expect(item.providerCapabilities).toEqual([]);
    }
  });
  it('keeps production closed even when a demo is explicitly requested', () => {
    expect(accountDemoAllowed('pasaportio1.lovable.app', true)).toBe(false);
    expect(accountDemoAllowed('pasaport.io', true)).toBe(false);
    expect(accountDemoAllowed('id-preview--0f8d131d-7438-424e-bdeb-40a342b1acf3.lovable.app', false)).toBe(false);
  });
  it('allows only opted-in preview hosts, never live domains', () => {
    const host = 'id-preview--0f8d131d-7438-424e-bdeb-40a342b1acf3.lovable.app';
    expect(accountDemoPresentationAllowed(host, true, null)).toBe(true);
    expect(accountDemoPresentationAllowed(host, true, 'https://lovable.dev')).toBe(true);
    expect(accountDemoPresentationAllowed(host, false, 'https://lovable.dev')).toBe(false);
    expect(accountDemoPresentationAllowed('pasaport.io', true, 'https://lovable.dev')).toBe(false);
  });
});