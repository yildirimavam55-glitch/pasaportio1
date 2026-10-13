import { refundWindow } from '@/domain/refunds/refund-policy';
import { COUNTRIES } from '@/domain/geo/countries';
import type { CustomerEsimRecord } from '@/lib/customer-account.functions';
/** Identity fallback only; never infers package coverage or eligibility. */
export function accountPhotoIso(esim: CustomerEsimRecord) {
 if (esim.productInfo?.destinationIso) return esim.productInfo.destinationIso;
 const label = esim.destinationLabel?.trim().toLocaleLowerCase();
 return label ? COUNTRIES.find(c => Object.values(c.name).some(n => n.toLocaleLowerCase() === label))?.iso : undefined;
}
/** Informational presentation only. Only the existing server verdict can enable the request label. */
export function refundPresentation(purchaseAt: string | null, now: Date, state?: { eligibility: string; canRequest: boolean; windowOpen: boolean; isDemo: boolean } | null) {
 const window = refundWindow(purchaseAt, now);
 return { ...window, verifiedEligible: Boolean(window.open && state?.windowOpen && state.canRequest && !state.isDemo && state.eligibility === 'LIKELY_ELIGIBLE') };
}
