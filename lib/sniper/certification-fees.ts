/**
 * CGC 2026 US direct-submission fee schedule, effective 2026-01-06.
 * CGC published grading fees are distinct from Panel Profits' fixed $50
 * shipping/handling allowance. Never infer a signature's market premium.
 * https://www.cgccomics.com/news/article/14659/cgc-price-updates-2026/
 * https://www.cgccomics.com/submit/services-fees/cgc-sig-series/
 * https://www.cgccomics.com/submit/services-fees/cgc-grading/?view=comics
 */
export type SignatureMethod = "NONE" | "CGC_WITNESSED" | "JSA_AUTHENTICATED";
export interface CertificationFeeInput {
  publicationYear: number;
  rawFmv: number;
  signatureMethod: SignatureMethod;
  signatureCount: number;
  /** Actual signer/appearance charges are event-specific and must be sourced. */
  signerFees?: number[];
  /** Optional $30 autograph grading; limited to 2 signatures. */
  gradeAutographs?: boolean;
}
export interface CertificationFeeResult {
  tier: "MODERN" | "VINTAGE" | "HIGH_VALUE" | "UNLIMITED_VALUE";
  gradingFee: number;
  signatureAuthenticationFee: number;
  autographGradingFee: number;
  signerFeeTotal: number;
  fixedLogistics: number;
  total: number;
  complete: boolean;
  source: string;
}
const SOURCE = "CGC US fees effective 2026-01-06";
export function calculateCertificationFees(input: CertificationFeeInput): CertificationFeeResult {
  const {publicationYear: year, rawFmv: value, signatureMethod: method, signatureCount: count} = input;
  if (!Number.isInteger(year) || year < 1800 || !Number.isFinite(value) || value <= 0 ||
      !Number.isInteger(count) || count < 0 || (method === "NONE" ? count !== 0 : count < 1)) {
    throw new Error("Verified publication year, positive raw FMV and valid signature count required");
  }
  const tier = value > 1000 ? "UNLIMITED_VALUE" : value > 400 ? "HIGH_VALUE" : year < 1975 ? "VINTAGE" : "MODERN";
  const witnessed = method === "CGC_WITNESSED";
  const gradingFee = tier === "UNLIMITED_VALUE"
    ? Math.max(witnessed ? 175 : 135, value * (witnessed ? 0.05 : 0.04))
    : tier === "HIGH_VALUE" ? (witnessed ? 140 : 105)
    : tier === "VINTAGE" ? (witnessed ? 70 : 45)
    : (witnessed ? 53 : 30);
  const signatureAuthenticationFee = method === "JSA_AUTHENTICATED" ? 30 * count : 0;
  if (input.gradeAutographs && count > 2) throw new Error("CGC autograph grading allows at most two signatures");
  const autographGradingFee = input.gradeAutographs ? 30 : 0;
  const fees = input.signerFees ?? [];
  if (fees.some(x => !Number.isFinite(x) || x < 0)) throw new Error("Invalid signer fees");
  const signerFeeTotal = fees.reduce((sum, fee) => sum + fee, 0);
  const fixedLogistics = 50; // Panel Profits: $25 + $25, not CGC's invoice handling fee
  const complete = method !== "CGC_WITNESSED" || fees.length === count;
  return {
    tier, gradingFee, signatureAuthenticationFee, autographGradingFee, signerFeeTotal,
    fixedLogistics,
    total: Math.round((gradingFee + signatureAuthenticationFee + autographGradingFee + signerFeeTotal + fixedLogistics) * 100) / 100,
    complete, source: SOURCE,
  };
}
