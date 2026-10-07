/**
 * Panel Profits Canonical Market Tiers & Sovereign Asset Classification
 *
 * Constitution:
 * 1. OTC is less than 25.00 (price <= 24.99)
 * 2. Standard is 25.00 to 44.99 (25.00 <= price <= 44.99)
 * 3. Premium is 45.00 to infinity (price >= 45.00)
 * 4. Sovereign is a direct universal bluelabel 9.8 comic (strictly direct, universal blue label, 9.8 grade)
 */

export type MarketPriceClass = "OTC" | "STD" | "PREMIUM";
export type AssetClass = "SOV" | "PREMIUM" | "STD" | "OTC" | "RAW";

export const OTC_MAX_PRICE = 24.99;
export const STANDARD_MIN_PRICE = 25.0;
export const STANDARD_MAX_PRICE = 44.99;
export const PREMIUM_MIN_PRICE = 45.0;

/**
 * Resolves the primary price tier based strictly on the user's market price boundaries:
 * - OTC: <= 24.99
 * - STD: 25.00 to 44.99
 * - PREMIUM: 45.00 to infinity
 */
export function resolvePriceTier(priceUsd: number | null | undefined): MarketPriceClass {
  const p = Number(priceUsd || 0);
  if (p < STANDARD_MIN_PRICE) {
    return "OTC";
  }
  if (p <= STANDARD_MAX_PRICE) {
    return "STD";
  }
  return "PREMIUM";
}

/**
 * Validates whether an issue is a Direct Edition.
 * Disqualifies variants, newsstands, reprints, facsimiles, incentive, retailer exclusives.
 */
export function isDirectEdition(variantOrEdition?: string | null): boolean {
  if (!variantOrEdition) return true;
  const v = variantOrEdition.trim().toLowerCase();
  if (
    v === "" ||
    v === "direct" ||
    v === "direct edition" ||
    v === "base" ||
    v === "regular" ||
    v === "standard"
  ) {
    return true;
  }
  if (
    v.includes("variant") ||
    v.includes("newsstand") ||
    v.includes("reprint") ||
    v.includes("facsimile") ||
    v.includes("incentive") ||
    v.includes("exclusive") ||
    v.includes("foil")
  ) {
    return false;
  }
  return true;
}

/**
 * Validates whether a certified slab carries a Universal Blue Label.
 * Disqualifies Signature Series (yellow), Qualified (green), Restored (purple), or Conserved labels.
 */
export function isUniversalBlueLabel(labelType?: string | null): boolean {
  if (!labelType) return true; // Default certified slab is Universal Blue Label
  const l = labelType.trim().toUpperCase();
  if (
    l.includes("SIGNATURE") ||
    l.includes("QUALIFIED") ||
    l.includes("RESTORED") ||
    l.includes("CONSERVED") ||
    l.includes("PURPLE") ||
    l.includes("PEDIGREE GREEN")
  ) {
    return false;
  }
  return true;
}

/**
 * Strict Sovereign Verification Gate:
 * "soverign is a direct universal bluelabel 9.8 comic"
 *
 * All criteria MUST be met:
 * 1. Grade must be strictly 9.8 (no lower grade can be called Sovereign).
 * 2. Must be a direct copy (NOT a variant, NOT newsstand, NOT reprint).
 * 3. Must have a Universal Blue Label (NOT signature series, NOT qualified, NOT restored).
 */
export function isSovereignSpecimen(params: {
  grade?: string | number | null;
  editionForm?: string | null;
  variant?: string | null;
  labelType?: string | null;
  isVariant?: boolean | null;
  isNewsstand?: boolean | null;
  isReprint?: boolean | null;
  isSignature?: boolean | null;
}): boolean {
  // 1. Grade MUST be strictly 9.8
  const cleanGrade = String(params.grade || "").trim();
  if (cleanGrade !== "9.8") {
    return false;
  }

  // 2. Disqualify any variant, newsstand, reprint, or incentive edition
  if (params.isVariant || params.isNewsstand || params.isReprint) {
    return false;
  }
  if (!isDirectEdition(params.variant)) {
    return false;
  }
  if (!isDirectEdition(params.editionForm)) {
    return false;
  }

  // 3. Disqualify signatures, qualified, restored, or non-blue labels
  if (params.isSignature) {
    return false;
  }
  if (!isUniversalBlueLabel(params.labelType)) {
    return false;
  }

  return true;
}

/**
 * Resolves the full Asset Class:
 * - RAW: Ungraded artifact
 * - SOV: Direct universal bluelabel 9.8 comic
 * - PREMIUM: 45.00 to infinity
 * - STD: 25.00 to 44.99
 * - OTC: less than 25.00
 */
export function resolveAssetClass(params: {
  priceUsd: number | null | undefined;
  grade?: string | number | null;
  editionForm?: string | null;
  variant?: string | null;
  labelType?: string | null;
  isVariant?: boolean | null;
  isNewsstand?: boolean | null;
  isReprint?: boolean | null;
  isSignature?: boolean | null;
  isRaw?: boolean | null;
}): AssetClass {
  const gradeStr = String(params.grade || "").trim().toUpperCase();
  if (params.isRaw || gradeStr === "RAW" || gradeStr === "UNGRADED" || !gradeStr) {
    return "RAW";
  }

  if (isSovereignSpecimen(params)) {
    return "SOV";
  }

  return resolvePriceTier(params.priceUsd);
}
