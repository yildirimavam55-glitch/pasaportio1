import { describe,it,expect } from 'vitest';
import { refundPresentation } from './v1-presentation';
describe('account refund information',()=>{
 it('shows 14 days from purchase and closes at exactly 14 days',()=>{
  expect(refundPresentation('2026-10-01T10:00:00Z',new Date('2026-10-01T10:00:00Z')).daysLeft).toBe(14);
  expect(refundPresentation('2026-10-01T10:00:00Z',new Date('2026-10-15T10:00:00Z')).open).toBe(false);
 });
 it('does not infer eligibility from missing activation or usage evidence',()=>{
  expect(refundPresentation('2026-10-01T10:00:00Z',new Date('2026-10-03T10:00:00Z')).verifiedEligible).toBe(false);
 });
 it('shows 11 days left after three days without promising eligibility',()=>{
  const result=refundPresentation('2026-10-01T10:00:00Z',new Date('2026-10-04T10:00:00Z'));
  expect(result.daysLeft).toBe(11);
  expect(result.verifiedEligible).toBe(false);
 });
 it('cannot enable a refund without a verified purchase date',()=>{
  expect(refundPresentation(null,new Date('2026-10-04T10:00:00Z'),{windowOpen:true,canRequest:true,isDemo:false,eligibility:'LIKELY_ELIGIBLE'}).verifiedEligible).toBe(false);
 });
 it('requires the real server verified unused and never-activated verdict',()=>{
  const state={windowOpen:true,canRequest:true,isDemo:false,eligibility:'LIKELY_ELIGIBLE'};
  expect(refundPresentation('2026-10-01T10:00:00Z',new Date('2026-10-03T10:00:00Z'),state).verifiedEligible).toBe(true);
  expect(refundPresentation('2026-10-01T10:00:00Z',new Date('2026-10-03T10:00:00Z'),{...state,eligibility:'REVIEW_REQUIRED'}).verifiedEligible).toBe(false);
  expect(refundPresentation('2026-10-01T10:00:00Z',new Date('2026-10-03T10:00:00Z'),{...state,isDemo:true}).verifiedEligible).toBe(false);
 });
});
