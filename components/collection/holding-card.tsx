"use client";

import { useState } from "react";
import Link from "next/link";
import { CollectionItem } from "@/lib/account/types";
import { calculateItemValuation } from "@/lib/account/calculations";
import { ComicCover } from "@/components/comics/comic-cover";
import { EditHoldingModal } from "./edit-holding-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit3, ExternalLink, TrendingUp, TrendingDown, Layers } from "lucide-react";

interface HoldingCardProps {
  item: CollectionItem;
}

export function HoldingCard({ item }: HoldingCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const comic = item.comic;
  const valuation = calculateItemValuation(item);

  const series = comic?.series || "Unknown Series";
  const issue = comic?.issue_number ? `#${comic.issue_number}` : "";
  const publisher = comic?.publisher || "Unknown Publisher";
  const year = comic?.publication_year;
  const variant = comic?.cover_variant || comic?.direct_or_variant;

  const isPositive = valuation.dollarGainLoss !== null && valuation.dollarGainLoss >= 0;

  return (
    <>
      <div className="group relative flex flex-col rounded-lg border border-orange-500/40 bg-[#0C0E15] p-3.5 shadow-lg transition-all duration-200 hover:border-orange-500 hover:shadow-orange-500/10 collection-rimlight-hover">
        <div className="flex gap-3.5">
          {/* Cover Image */}
          <Link
            href={`/comics/${item.comic_id}`}
            className="relative block h-36 w-24 shrink-0 overflow-hidden rounded border border-slate-800 bg-[#161822]"
          >
            <ComicCover
              coverUrl={comic?.cover_url}
              storagePath={comic?.cover_storage_path}
              series={series}
              issueNumber={comic?.issue_number || ""}
              publisher={publisher}
              size="full"
              priority={false}
            />
          </Link>

          {/* Holding Metadata */}
          <div className="flex flex-1 flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-start justify-between gap-1">
                <Link
                  href={`/comics/${item.comic_id}`}
                  className="group-hover:text-orange-400 transition-colors"
                >
                  <h3 className="line-clamp-1 text-sm font-light text-slate-100">
                    {series} {issue}
                  </h3>
                </Link>
                <button
                  onClick={() => setIsEditOpen(true)}
                  className="text-slate-400 hover:text-orange-400 transition-colors p-1"
                  title="Edit holding"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                <span>{publisher}</span>
                {year && <span>• {year}</span>}
                {comic?.printing && comic.printing !== "1" && <span>• {comic.printing} Prt</span>}
                {variant && (
                  <span className="truncate max-w-[120px] text-slate-500">• {variant}</span>
                )}
              </div>

              {/* Holding Specs (Grade, Quantity, Date) */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                <Badge variant="outline" className="border-orange-500/50 bg-orange-950/30 text-orange-300 font-light px-1.5 py-0">
                  {item.grade ? `${item.grading_company ? item.grading_company + " " : ""}${item.grade}` : "Raw / Ungraded"}
                </Badge>

                {item.quantity > 1 && (
                  <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 font-light px-1.5 py-0 flex items-center gap-1">
                    <Layers className="h-2.5 w-2.5" />
                    QTY: {item.quantity}
                  </Badge>
                )}

                {item.acquisition_date && (
                  <span className="text-slate-500">
                    Acq: {item.acquisition_date}
                  </span>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="mt-2.5 border-t border-slate-800/80 pt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">Cost Basis</span>
                <span className="text-slate-200 font-light">
                  {valuation.totalAcquisitionCost !== null
                    ? `$${valuation.totalAcquisitionCost.toFixed(2)}`
                    : "Not recorded"}
                </span>
                {item.quantity > 1 && valuation.unitAcquisitionCost !== null && (
                  <span className="text-[9px] text-slate-500 block">(${valuation.unitAcquisitionCost.toFixed(2)}/ea)</span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-slate-500">
                    {valuation.isUnadjusted98Reference ? "9.8 Ref Value" : "Est. Value"}
                  </span>
                </div>
                <span className="text-emerald-400 font-light block">
                  {valuation.estimatedHoldingValue !== null
                    ? `$${valuation.estimatedHoldingValue.toFixed(2)}`
                    : valuation.baseline98Price !== null
                    ? `$${(valuation.baseline98Price * item.quantity).toFixed(2)} (9.8 Ref)`
                    : "Unpriced"}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {valuation.baselinePriceResult.source}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Gain/Loss and Actions */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2 text-xs">
          <div>
            {valuation.dollarGainLoss !== null ? (
              <div className="flex items-center gap-1.5">
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                )}
                <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                  {isPositive ? "+" : ""}${valuation.dollarGainLoss.toFixed(2)}
                  {valuation.percentageGainLoss !== null && ` (${isPositive ? "+" : ""}${valuation.percentageGainLoss.toFixed(1)}%)`}
                </span>
              </div>
            ) : valuation.isNon98GradeWithReferenceOnly ? (
              <span className="text-[10px] text-amber-400/80 italic">
                *Non-9.8 grade: 9.8 reference shown
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 italic">
                {valuation.estimatedHoldingValue === null ? "Excluded from totals (unpriced)" : "No cost basis"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="h-7 text-[11px] text-slate-400 hover:text-slate-100 px-2"
            >
              Edit
            </Button>
            <Link
              href={`/comics/${item.comic_id}`}
              className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 px-1"
            >
              Dossier <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      <EditHoldingModal
        item={item}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </>
  );
}
