import { describe,it,expect } from "vitest";
import {calculateSignedBookValuation} from "@/lib/sniper/signed-book-valuation";
const base={
 certification:{publicationYear:1988,rawFmv:300,signatureMethod:"JSA_AUTHENTICATED" as const,signatureCount:2},
 rawUnsignedFmv:300,rawSignedFmv:450,signedGradedFmv:900,unsignedGradedFmv:600,
 auctionBid:500,acquisitionShipping:15,acquisitionTax:40,buyerPremium:0,
 sellingFeeRate:0.1325,sellingFixedFee:5,outboundShipping:15
};
describe("signed-book financial formula",()=>{
 it("uses actual signed raw and graded FMVs, not an unsigned multiplier",()=>{
   const v=calculateSignedBookValuation(base);
   expect(v.certification.total).toBe(140);
   expect(v.intrinsicValue).toBe(590);
   expect(v.signatureMarketPremium).toBe(150);
   expect(v.gradedSignaturePremium).toBe(300);
   expect(v.speculativePremium).toBe(310);
   expect(v.allInAcquisition).toBe(555);
   expect(v.breakEvenSalePrice).toBe(662.82);
   expect(v.netSaleProceeds).toBe(760.75);
   expect(v.projectedProfit).toBe(205.75);
   expect(v.isComplete).toBe(true);
 });
 it("never fills missing signed FMV from unsigned comparables",()=>{
   const v=calculateSignedBookValuation({...base,rawSignedFmv:null,signedGradedFmv:null});
   expect(v.intrinsicValue).toBeNull();
   expect(v.speculativePremium).toBeNull();
   expect(v.projectedProfit).toBeNull();
   expect(v.isComplete).toBe(false);
 });
 it("does not treat missing witnessed signer charges as complete",()=>{
   const v=calculateSignedBookValuation({...base,certification:{publicationYear:1988,rawFmv:300,signatureMethod:"CGC_WITNESSED",signatureCount:2}});
   expect(v.isComplete).toBe(false);
   expect(v.intrinsicValue).toBeNull();
 });
});
