import { describe, expect, it } from 'vitest';
import { installationStepState } from './installation-step-navigation';
describe('shared installation step navigation', () => {
  it('disables the left arrow at step 1 of 5', () => {
    expect(installationStepState(0, 5)).toEqual({current:0,previous:0,next:1,previousDisabled:true,nextDisabled:false});
  });
  it('moves both ways from step 3 of 5', () => {
    expect(installationStepState(2, 5)).toEqual({current:2,previous:1,next:3,previousDisabled:false,nextDisabled:false});
  });
  it('disables the right arrow at step 5 instead of restarting', () => {
    expect(installationStepState(4, 5)).toEqual({current:4,previous:3,next:4,previousDisabled:false,nextDisabled:true});
  });
  it('uses the same boundary rules for the account three-step guide', () => {
    expect(installationStepState(2, 3).nextDisabled).toBe(true);
    expect(installationStepState(2, 3).next).toBe(2);
  });
});