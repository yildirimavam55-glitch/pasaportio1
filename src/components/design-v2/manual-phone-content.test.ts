import { describe, expect, it } from 'vitest';
import { MANUAL_DEMO } from './manual-phone-content';
describe('educational manual credentials',()=>{
 it('uses the reserved non-resolving address',()=>expect(MANUAL_DEMO.address).toBe('example.invalid'));
 it('uses the requested demo activation code',()=>expect(MANUAL_DEMO.code).toBe('DEMO123456'));
 it('keeps the requested Samsung LPA combined in one line',()=>{expect(MANUAL_DEMO.lpa).toBe('LPA:1$example.invalid$DEMO123456');expect(MANUAL_DEMO.lpa).not.toMatch(/[\r\n]/);});
});