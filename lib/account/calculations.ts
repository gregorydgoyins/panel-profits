import { CollectionItem, HoldingsSummary } from "./types";
import { resolveBaselinePrice, BaselinePriceResult } from "@/lib/pricing/baseline";

export interface ItemValuationDetails {
  unitAcquisitionCost: number | null;
  totalAcquisitionCost: number | null;
  baseline98Price: number | null;
  baselinePriceResult: BaselinePriceResult;
  estimatedHoldingValue: number | null;
  isUnadjusted98Reference: boolean;
  isNon98GradeWithReferenceOnly: boolean;
  dollarGainLoss: number | null;
  percentageGainLoss: number | null;
  hasValidValuation: boolean;
}

export function calculateItemValuation(item: CollectionItem): ItemValuationDetails {
  const pricing = resolveBaselinePrice(item.comic || null);
  const baseline98 = pricing.price;

  const unitCost = item.acquisition_cost !== null && item.acquisition_cost !== undefined ? Number(item.acquisition_cost) : null;
  const totalCost = unitCost !== null && !isNaN(unitCost) ? unitCost * item.quantity : null;

  const rawGrade = item.grade ? item.grade.trim() : "";
  const isGrade98 = rawGrade === "9.8" || parseFloat(rawGrade) === 9.8;
  const isGradeUnspecified = rawGrade === "";

  let estimatedHoldingValue: number | null = null;
  let isUnadjusted98Reference = false;
  let isNon98GradeWithReferenceOnly = false;

  if (baseline98 !== null) {
    if (isGrade98) {
      estimatedHoldingValue = baseline98 * item.quantity;
      isUnadjusted98Reference = false;
    } else if (isGradeUnspecified) {
      estimatedHoldingValue = baseline98 * item.quantity;
      isUnadjusted98Reference = true;
    } else {
      // Grade is specified and is NOT 9.8 (e.g. 9.4, 8.0, raw)
      // Do not treat lower/different grade as 9.8 valuation
      estimatedHoldingValue = null;
      isNon98GradeWithReferenceOnly = true;
    }
  }

  let dollarGainLoss: number | null = null;
  let percentageGainLoss: number | null = null;

  if (estimatedHoldingValue !== null && totalCost !== null) {
    dollarGainLoss = estimatedHoldingValue - totalCost;
    if (totalCost > 0) {
      percentageGainLoss = (dollarGainLoss / totalCost) * 100;
    }
  }

  return {
    unitAcquisitionCost: unitCost,
    totalAcquisitionCost: totalCost,
    baseline98Price: baseline98,
    baselinePriceResult: pricing,
    estimatedHoldingValue,
    isUnadjusted98Reference,
    isNon98GradeWithReferenceOnly,
    dollarGainLoss,
    percentageGainLoss,
    hasValidValuation: estimatedHoldingValue !== null,
  };
}

export function calculateHoldingsSummary(items: CollectionItem[]): HoldingsSummary {
  let totalOwnedQuantity = 0;
  let totalAcquisitionCost = 0;
  let totalBaselineValue = 0;
  let pricedHoldingsCount = 0;
  let unpricedHoldingsCount = 0;

  let pricedCostSum = 0;
  let pricedValueSum = 0;
  let hasPricedCostComparison = false;

  for (const item of items) {
    const qty = Math.max(item.quantity || 1, 1);
    totalOwnedQuantity += qty;

    const val = calculateItemValuation(item);

    if (val.totalAcquisitionCost !== null) {
      totalAcquisitionCost += val.totalAcquisitionCost;
    }

    if (val.estimatedHoldingValue !== null) {
      totalBaselineValue += val.estimatedHoldingValue;
      pricedHoldingsCount += 1;

      if (val.totalAcquisitionCost !== null) {
        pricedCostSum += val.totalAcquisitionCost;
        pricedValueSum += val.estimatedHoldingValue;
        hasPricedCostComparison = true;
      }
    } else {
      unpricedHoldingsCount += 1;
    }
  }

  let dollarGainLoss: number | null = null;
  let percentageGainLoss: number | null = null;

  if (hasPricedCostComparison) {
    dollarGainLoss = pricedValueSum - pricedCostSum;
    if (pricedCostSum > 0) {
      percentageGainLoss = (dollarGainLoss / pricedCostSum) * 100;
    }
  }

  return {
    totalOwnedQuantity,
    totalAcquisitionCost,
    totalBaselineValue,
    pricedHoldingsCount,
    unpricedHoldingsCount,
    dollarGainLoss,
    percentageGainLoss,
  };
}
