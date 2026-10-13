import type { CustomerEsimRecord } from '@/lib/customer-account.functions';
import type { DemoEsim } from '@/domain/esim/account-demo';

/** Presentation adapter only: no installation credentials, purchase identity or capabilities. */
export function demoEsimRecord(d: DemoEsim): CustomerEsimRecord {
  return {
    id: d.id, orderItemId: null, travelerLabel: null, destinationLabel: null,
    packageLabel: `${d.iso} eSIM · ${d.total} GB`, status: d.active ? 'ACTIVE' : 'READY',
    totalDataMb: Math.round(d.total * 1024), remainingDataMb: Math.round(d.remaining * 1024),
    expiresAt: d.expiresAt, topupSupported: false, installInfo: null,
    hasQr: false, hasInstallInfo: false, hasIccid: false, providerCapabilities: [],
    productInfo: { dataGb: d.total, unlimitedData: false, validityDays: 30,
      coverageCount: 1, coverageIsos: [d.iso], destinationIso: d.iso,
      activationPolicy: null, packageKind: 'COUNTRY' },
    createdAt: d.purchaseAt, updatedAt: d.purchaseAt,
  };
}