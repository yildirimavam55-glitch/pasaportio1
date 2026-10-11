import { expect, it } from "vitest";
import { lowestBannerPackage } from "../banner-package";
it("uses coverage from the priced package, not overall 190 destinations", () => {
 const selected = lowestBannerPackage([{ salePrice:9,currency:"EUR",coverage:["TR","DE"] },{ salePrice:20,currency:"EUR",coverage:["TR","DE","US","JP"] }]);
 expect(selected?.salePrice).toBe(9); expect(selected?.coverage.length).toBe(2);
});
it("does not invent coverage without a valid package", () => {
 expect(lowestBannerPackage([{salePrice:null,currency:"EUR",coverage:["TR"]}])).toBeNull();
 expect(lowestBannerPackage([{salePrice:3,currency:"EUR",coverage:[]}])).toBeNull();
});
