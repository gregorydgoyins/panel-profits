import { ComicRecord } from "@/lib/comics/types";
import { resolveComicPricing } from "@/lib/pricing/baseline";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { DollarSign } from "lucide-react";

interface PricingDossierProps {
  comic: ComicRecord;
}

export function PricingDossier({ comic }: PricingDossierProps) {
  const pricing = resolveComicPricing(comic);

  return (
    <Card className="trading-rimlight-hover bg-[#111319] shadow-lg">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <CardTitle className="text-sm uppercase tracking-wider">
              VALUATION & PRICING DOSSIER
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">
            GRADE 9.8 BENCHMARK
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* 3-Tier Valuation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Panel Profits 9.8 Price */}
          <div className="trading-rimlight-hover rounded-lg bg-[#0E1626] p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] uppercase tracking-wider text-blue-300">
                  PANEL PROFITS 9.8
                </span>
                <Badge variant="default" className="text-[8px] px-1 py-0">
                  PP MODEL
                </Badge>
              </div>
              <div className="text-xl text-slate-100 pt-1">
                {pricing.panelProfitsPrice98 !== null
                  ? formatCurrency(pricing.panelProfitsPrice98)
                  : "—"}
              </div>
            </div>
            <div className="pt-2 text-[10px] text-slate-400 line-clamp-1 border-t border-blue-900/60 mt-2">
              {pricing.panelProfitsPriceSource || "No direct 9.8 print"}
            </div>
          </div>

          {/* 2. ComicBase Price */}
          <div className="portfolio-rimlight-hover rounded-lg bg-[#191410] p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] uppercase tracking-wider text-amber-300">
                  COMICBASE PRICE
                </span>
                <Badge variant="secondary" className="text-[8px] px-1 py-0">
                  REFERENCE
                </Badge>
              </div>
              <div className="text-xl text-slate-100 pt-1">
                {pricing.comicbasePrice !== null
                  ? formatCurrency(pricing.comicbasePrice)
                  : "—"}
              </div>
            </div>
            <div className="pt-2 text-[10px] text-slate-400 line-clamp-1 border-t border-amber-900/40 mt-2">
              {comic.comicbase_source_id ? `ID: ${comic.comicbase_source_id}` : "Unlinked"}
            </div>
          </div>

          {/* 3. Blended Baseline */}
          <div className="dashboard-rimlight-hover rounded-lg bg-[#181122] p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1">
                <span className="text-[10px] uppercase tracking-wider text-purple-300">
                  BLENDED BASELINE
                </span>
                <Badge variant="plum" className="text-[8px] px-1 py-0">
                  SYNTHESIS
                </Badge>
              </div>
              <div className="text-xl text-slate-100 pt-1">
                {pricing.baselinePrice98 !== null
                  ? formatCurrency(pricing.baselinePrice98)
                  : "—"}
              </div>
            </div>
            <div className="pt-2 text-[10px] text-slate-400 line-clamp-1 border-t border-purple-900/60 mt-2">
              {pricing.baselineSource || "Uncalibrated"}
            </div>
          </div>
        </div>

        {/* Pricing Metadata & Observation Metrics */}
        <div className="rounded border border-slate-800 bg-[#0A0A0C] p-3 text-xs space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] pb-2 border-b border-slate-800/80">
            <span className="text-slate-400">BASELINE VALUATION SOURCE:</span>
            <span className="text-slate-200 text-right">
              {pricing.baselineSource || "Not established"}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">MARKET OBSERVATION COUNT:</span>
            <span className="text-slate-200">
              {pricing.observationCount !== null ? `${pricing.observationCount} Observations` : "0 Observations"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
