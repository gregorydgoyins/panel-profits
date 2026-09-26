import { HoldingsSummary } from "@/lib/account/types";
import { Layers, DollarSign, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";

interface HoldingsSummaryBannerProps {
  summary: HoldingsSummary;
  totalItemsCount: number;
}

export function HoldingsSummaryBanner({ summary, totalItemsCount }: HoldingsSummaryBannerProps) {
  const isPositive = summary.dollarGainLoss !== null && summary.dollarGainLoss >= 0;
  const hasGainLoss = summary.dollarGainLoss !== null;

  return (
    <div className="mb-6 rounded-lg border border-orange-500/40 bg-[#0C0E15] p-4 sm:p-5 shadow-xl collection-rimlight-hover">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Quantity */}
        <div className="rounded border border-slate-800/80 bg-[#121520] p-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
            <span>Holdings</span>
            <Layers className="h-3.5 w-3.5 text-orange-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-light text-slate-100">{summary.totalOwnedQuantity}</span>
            <span className="text-[11px] text-slate-400">
              ({totalItemsCount} {totalItemsCount === 1 ? "issue" : "issues"})
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Physical comic count</p>
        </div>

        {/* Total Cost Basis */}
        <div className="rounded border border-slate-800/80 bg-[#121520] p-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
            <span>Cost Basis</span>
            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1 text-2xl font-light text-slate-100">
            {summary.totalAcquisitionCost > 0
              ? `$${summary.totalAcquisitionCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "$0.00"}
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Aggregate acquisition cost basis</p>
        </div>

        {/* Current Market Value */}
        <div className="rounded border border-slate-800/80 bg-[#121520] p-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
            <span>Current Value</span>
            <span className="text-[10px] font-mono text-amber-400">FMV OBSERVED</span>
          </div>
          <div className="mt-1 text-2xl font-light text-emerald-400">
            {summary.totalBaselineValue > 0
              ? `$${summary.totalBaselineValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "$0.00"}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
            <span>{summary.pricedHoldingsCount} priced</span>
            {summary.unpricedHoldingsCount > 0 && (
              <span className="text-amber-400/90 font-light">
                ({summary.unpricedHoldingsCount} unpriced)
              </span>
            )}
          </div>
        </div>

        {/* Unrealized P&L */}
        <div className="rounded border border-slate-800/80 bg-[#121520] p-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400">
            <span>Unrealized P&L</span>
            {hasGainLoss && (
              isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
              )
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            {hasGainLoss ? (
              <>
                <span className={`text-2xl font-light ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                  {isPositive ? "+" : ""}${summary.dollarGainLoss?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {summary.percentageGainLoss !== null && (
                  <span className={`text-xs ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                    ({isPositive ? "+" : ""}{summary.percentageGainLoss.toFixed(1)}%)
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm font-light text-slate-500 italic">No cost recorded</span>
            )}
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Unrealized gain/loss vs cost basis</p>
        </div>
      </div>

      {summary.unpricedHoldingsCount > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 border-t border-slate-800/60 pt-2.5">
          <HelpCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span>
            <em>Honest Pricing Disclosure:</em> {summary.unpricedHoldingsCount} {summary.unpricedHoldingsCount === 1 ? "comic has" : "comics have"} no current secondary market benchmark. Unpriced items are excluded from valuation totals rather than counted as zero value.
          </span>
        </div>
      )}
    </div>
  );
}
