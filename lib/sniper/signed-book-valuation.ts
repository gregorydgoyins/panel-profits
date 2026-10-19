import { calculateCertificationFees, type CertificationFeeInput, type CertificationFeeResult } from "./certification-fees";
import { calculateSniperFinancials, calculateTargetExitPrice } from "./financials";

/**
 * Signed-book financial model. Each FMV must be an independently observed
 * value for the same issue, edition, grade, label, signature set and signer(s).
 * An unsigned slab price is never multiplied to invent a signed slab price.
 */
export interface SignedBookValuationInput {
  certification: CertificationFeeInput;
  /** Independent observed FMV of the unsigned RAW issue/edition. */
  rawUnsignedFmv: number;
  /** Independent observed FMV of this exact signed RAW book, if available. */
  rawSignedFmv?: number | null;
  /** Independent observed FMV of the exact signed graded slab. */
  signedGradedFmv?: number | null;
  /** Independently observed unsigned slab FMV at the same grade. */
  unsignedGradedFmv?: number | null;
  auctionBid: number;
  acquisitionShipping: number;
  acquisitionTax: number;
  buyerPremium: number;
  sellingFeeRate: number;
  sellingFixedFee: number;
  outboundShipping: number;
}
export interface SignedBookValuation {
  certification: CertificationFeeResult;
  rawBasis: number | null;
  intrinsicValue: number | null;
  signatureMarketPremium: number | null;
  gradedSignaturePremium: number | null;
  speculativePremium: number | null;
  signedGradedFmv: number | null;
  allInAcquisition: number;
  totalInvestment: number;
  breakEvenSalePrice: number;
  netSaleProceeds: number | null;
  projectedProfit: number | null;
  roiPercent: number | null;
  isComplete: boolean;
}
const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const observed = (n: number | null | undefined): number | null =>
  typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
export function calculateSignedBookValuation(input: SignedBookValuationInput): SignedBookValuation {
  const c = calculateCertificationFees(input.certification);
  const costs = [input.auctionBid,input.acquisitionShipping,input.acquisitionTax,input.buyerPremium,input.sellingFixedFee,input.outboundShipping];
  if (costs.some(n => !Number.isFinite(n) || n < 0) || !Number.isFinite(input.sellingFeeRate) ||
      input.sellingFeeRate < 0 || input.sellingFeeRate >= 1) throw new Error("Valid nonnegative acquisition and disposal costs required");
  const rawUnsigned = observed(input.rawUnsignedFmv);
  const rawSigned = observed(input.rawSignedFmv);
  const signedGraded = observed(input.signedGradedFmv);
  const unsignedGraded = observed(input.unsignedGradedFmv);
  // A known signed RAW value is the basis; do not invent it by adding a
  // percentage premium to an unsigned book.
  const rawBasis = rawSigned;
  const intrinsicValue = rawBasis !== null && c.complete ? money(rawBasis + c.total) : null;
  const signatureMarketPremium = rawSigned !== null && rawUnsigned !== null ? money(rawSigned - rawUnsigned) : null;
  const gradedSignaturePremium = signedGraded !== null && unsignedGraded !== null ? money(signedGraded - unsignedGraded) : null;
  const speculativePremium = signedGraded !== null && intrinsicValue !== null ? money(signedGraded - intrinsicValue) : null;
  const ledger = calculateSniperFinancials({
    purchasePrice: input.auctionBid,
    shipping: input.acquisitionShipping,
    taxRate: input.auctionBid > 0 ? input.acquisitionTax / input.auctionBid : 0,
    buyerPremium: { rate: 0, minimum: input.buyerPremium },
    gradingCost: c.total,
    exitPrice: signedGraded,
    sellingFeeRate: input.sellingFeeRate,
    sellingFixedFee: input.sellingFixedFee,
    outboundShipping: input.outboundShipping,
  });
  const allInAcquisition = ledger.acquisitionCost;
  const totalInvestment = ledger.capitalAtRisk;
  const breakEvenSalePrice = calculateTargetExitPrice(totalInvestment, 0, { sellingFeeRate: input.sellingFeeRate, sellingFixedFee: input.sellingFixedFee, outboundShipping: input.outboundShipping }) ?? 0;
  const netSaleProceeds = ledger.netSaleProceeds;
  const projectedProfit = ledger.netProfit;
  const roiPercent = ledger.roiPercent;
  return {certification:c,rawBasis,intrinsicValue,signatureMarketPremium,gradedSignaturePremium,
    speculativePremium,signedGradedFmv:signedGraded,allInAcquisition,totalInvestment,breakEvenSalePrice,
    netSaleProceeds,projectedProfit,roiPercent,isComplete:c.complete && rawBasis !== null && signedGraded !== null};
}
