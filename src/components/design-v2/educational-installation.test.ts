import { describe, expect, it } from 'vitest';
import { EDUCATION_FLOWS, educationScene } from './educational-installation';
describe('platform-specific educational flows', () => {
 it('follows Samsung settings and complete LPA entry', () => expect(EDUCATION_FLOWS.android.manual).toEqual(['settings','connections','sims','add','manual','lpa','review','installed']));
 it('follows iPhone scanner to separate manual details', () => expect(EDUCATION_FLOWS.ios.manual).toEqual(['settings','cellular','add','scanner','manual','details','review','installed']));
 it('uses separate Android QR settings', () => expect(EDUCATION_FLOWS.android.qr).toEqual(['settings','connections','sims','add','scanner','review','installed']));
 it('uses separate iPhone QR settings', () => expect(EDUCATION_FLOWS.ios.qr).toEqual(['settings','cellular','add','scanner','review','installed']));
 it('shows only an educational Apple link sequence', () => expect(EDUCATION_FLOWS.ios.quick).toEqual(['link','add','review','installed']));
 it('never simulates unsupported Android direct installation', () => expect(EDUCATION_FLOWS.android.quick).toEqual(['unsupported','alternatives']));
 it('keeps the last step at the installation boundary', () => expect(educationScene('ios','manual',99)).toBe('installed'));
});