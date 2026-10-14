import { describe, expect, it } from 'vitest';
import { EDUCATION_FLOWS, educationScene } from './educational-installation';
describe('platform-specific educational flows', () => {
 it('copies the full Android email code before settings and one-field paste', () => expect(EDUCATION_FLOWS.android.manual).toEqual(['email-inbox','email','email-copy-lpa','email-copied-lpa','switch-settings','settings','connections','sims','add','manual','lpa','review','installed']));
 it('pastes the iPhone address before returning to mail for the separate code', () => expect(EDUCATION_FLOWS.ios.manual).toEqual(['email-inbox','email','email-copy-address','email-copied-address','switch-settings','settings','cellular','add','scanner','manual','address-pasted','email-return','email-copy-code','email-copied-code','return-manual','details','review','installed']));
 it('uses separate Android QR settings', () => expect(EDUCATION_FLOWS.android.qr).toEqual(['settings','connections','sims','add','scanner','review','installed']));
 it('uses separate iPhone QR settings', () => expect(EDUCATION_FLOWS.ios.qr).toEqual(['settings','cellular','add','scanner','review','installed']));
 it('shows only an educational Apple link sequence', () => expect(EDUCATION_FLOWS.ios.quick).toEqual(['link','add','review','installed']));
 it('never simulates unsupported Android direct installation', () => expect(EDUCATION_FLOWS.android.quick).toEqual(['unsupported','alternatives']));
 it('keeps the last step at the installation boundary', () => expect(educationScene('ios','manual',99)).toBe('installed'));
});