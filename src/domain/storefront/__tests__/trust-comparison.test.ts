import { describe, expect, it } from "vitest";
import { comparisonScale, verifiedComparison, publicReview, reviewAutoplay, trustPreviewHost, type ComparisonEntry } from "../trust-comparison";
const rows: ComparisonEntry[] = ["roaming", "other", "pasaport"].map((kind,i) => ({kind: kind as ComparisonEntry["kind"],price:[21.99,16.99,10.99][i] ?? 0,currency:"EUR",destination:"IT",allowance:"1 GB",validity:"7 days",provider:kind,sourceUrl:"https://example.com/source",checkedAt:"2026-10-08"}));
describe("trust evidence gates",()=>{
 it("calculates all bars using the same maximum",()=>expect(comparisonScale([21.99,16.99,10.99])).toEqual([1,16.99/21.99,10.99/21.99]));
 it("hides unapproved prices",()=>expect(verifiedComparison(rows,false)).toBeNull());
 it("requires sources",()=>expect(verifiedComparison(rows.map(e=>({...e,sourceUrl:""})),true)).toBeNull());
 it("rejects incomparable allowances",()=>expect(verifiedComparison(rows.map((e,i)=>({...e,allowance:i===1?"2 GB":e.allowance})),true)).toBeNull());
 it("accepts approved comparable sourced entries",()=>expect(verifiedComparison(rows,true)).toEqual(rows));
 it("never shows samples publicly",()=>expect(publicReview({visible:true,reviewType:"DEMO",verified:true,published:true,reviewStatus:"PUBLISHED"})).toBe(false));
 it("requires genuine published verification",()=>expect(publicReview({visible:true,reviewType:"REAL",verified:false,published:true,reviewStatus:"PUBLISHED"})).toBe(false));
 it("does not classify the published site as preview",()=>expect(trustPreviewHost("pasaport2.lovable.app")).toBe(false));
 const play={enough:true,paused:false,hover:false,focused:false,visible:true,tab:true,reduced:false};
 it("allows eligible autoplay",()=>expect(reviewAutoplay(play)).toBe(true));
 it.each(["paused","hover","focused","reduced"] as const)("stops when %s",key=>expect(reviewAutoplay({...play,[key]:true})).toBe(false));
 it.each(["enough","visible","tab"] as const)("stops without %s",key=>expect(reviewAutoplay({...play,[key]:false})).toBe(false));
});