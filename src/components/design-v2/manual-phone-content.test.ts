import { describe, expect, it } from 'vitest';
import { MANUAL_DEMO } from './manual-phone-content';
describe('educational manual credentials',()=>{
 it('uses a reserved non-resolving address',()=>expect(MANUAL_DEMO.address).toBe('demo.esim.invalid'));
 it('uses explicitly nonvalid demo credentials',()=>expect(MANUAL_DEMO.code).toBe('DEMO-NOT-VALID'));
 it('keeps Samsung LPA combined in one line',()=>{expect(MANUAL_DEMO.lpa).toBe('LPA:1$demo.esim.invalid$DEMO-NOT-VALID');expect(MANUAL_DEMO.lpa).not.toMatch(/[\r\n]/);});
});