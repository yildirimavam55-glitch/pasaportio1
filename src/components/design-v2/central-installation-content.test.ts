import { describe, expect, it } from 'vitest';
import { detectedGuidePlatform, METHOD_SCENES, providerInstallValue } from './central-installation-content';
describe('central installation safety rules', () => {
 it('defaults an iPhone to iOS without claiming model compatibility',()=>expect(detectedGuidePlatform({userAgent:'Mozilla iPhone OS 17_4'})).toBe('ios'));
 it('defaults Android to Android',()=>expect(detectedGuidePlatform({userAgent:'Mozilla Android 14'})).toBe('android'));
 it('leaves desktop or ambiguous detection for manual selection',()=>expect(detectedGuidePlatform({userAgent:'Mozilla Windows NT 10.0'})).toBeNull());
 it('includes all five QR stages',()=>expect(METHOD_SCENES.qr).toEqual(['settings','add','scan','confirm','line']));
 it('includes all six manual stages',()=>expect(METHOD_SCENES.manual).toEqual(['add','manual','address','code','confirmation','confirm']));
 it('never invents missing APN values',()=>expect(providerInstallValue({},'apn')).toBeNull());
 it('uses only the provider supplied APN',()=>expect(providerInstallValue({apn:' travel.apn '},'apn')).toBe('travel.apn'));
 it('never invents a missing confirmation code',()=>expect(providerInstallValue(null,'confirmation_code')).toBeNull());
});