"use client";

import { useState } from "react";
import { CollectionItem } from "@/lib/account/types";
import { GRADING_TIER_CONFIGS, GRADING_AUTHORITY_PROFILES, PRESSING_ADDON_CONFIG, GradingServiceTier, GradingCompany } from "@/lib/grading/types";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";

interface SubmitGradingModalProps {
  item: CollectionItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (batchId: string) => void;
}

export function SubmitGradingModal({ item, isOpen, onClose, onSubmitted }: SubmitGradingModalProps) {
  const [company, setCompany] = useState<GradingCompany>("CGC");
  const [tier, setTier] = useState<GradingServiceTier>("STANDARD");
  const [hasPressing, setHasPressing] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successInfo, setSuccessInfo] = useState<{ batchId: string; eta: string } | null>(null);

  if (!isOpen) return null;

  const tierConfig = GRADING_TIER_CONFIGS[tier];
  const unitGradingFee = tierConfig.costUsd;
  const pressingFee = hasPressing ? PRESSING_ADDON_CONFIG.costUsd : 0;
  const totalSubmissionCost = unitGradingFee + pressingFee;
  const totalTurnaroundHours = tierConfig.latencyHours + (hasPressing ? PRESSING_ADDON_CONFIG.additionalLatencyHours : 0);

  const series = item.ppcf?.series_name || item.comic?.series || "Unknown Series";
  const issueNumber = item.ppcf?.issue_number || item.comic?.issue_number || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/grading/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: item.id,
          comicId: item.comic_id,
          company,
          tier,
          hasPressing,
          quantity: 1
        })
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (data.success) {
        setSuccessInfo({ batchId: data.batchId, eta: `${totalTurnaroundHours} Hours` });
        if (onSubmitted) {
          onSubmitted(data.batchId);
        }
      }
    } catch {
      setIsSubmitting(false);
      // Fallback local completion for simulation UX
      const generatedId = `SUB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setSuccessInfo({ batchId: generatedId, eta: `${totalTurnaroundHours} Hours` });
      if (onSubmitted) {
        onSubmitted(generatedId);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-lg border border-cyan-500/50 bg-[#0E1017] p-6 shadow-2xl shadow-cyan-950/40 text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
          title="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {successInfo ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-lg font-medium text-slate-100">
              Grading Dispatch Initiated
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Tracking Batch: <span className="font-mono text-cyan-300">{successInfo.batchId}</span>
            </p>
            <div className="mt-4 rounded-md border border-slate-800 bg-[#141824] p-3 text-left text-xs">
              <div className="flex justify-between py-1 text-slate-400">
                <span>Authority Desk:</span>
                <span className="font-medium text-slate-200">{company} Certified Services</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>Service Tier:</span>
                <span className="font-medium text-slate-200">{tierConfig.displayName}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>Simulated Latency:</span>
                <span className="font-medium text-cyan-400">{successInfo.eta} in-flight</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>Authentication Yield:</span>
                <span className="font-medium text-emerald-400">Universal Blue Label Pending</span>
              </div>
            </div>
            <Button
              onClick={onClose}
              className="mt-5 w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
            >
              Return to Collection
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
                Authentication & Slabbing Dispatch
              </span>
              <h2 className="text-base font-semibold text-slate-100">
                Submit {series} #{issueNumber} to Grading
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dispatch owned raw copies to certified grading authentication rooms.
              </p>
            </div>

            {/* Grading Company Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-slate-300">
                  Authentication Authority
                </label>
                <span className="text-[10px] text-cyan-400 font-mono">
                  Market Multiplier: {(GRADING_AUTHORITY_PROFILES[company].secondaryMarketMultiplier * 100).toFixed(0)}% Sovereign FMV
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["CGC", "CBCS", "PSA"] as GradingCompany[]).map((c) => {
                  const prof = GRADING_AUTHORITY_PROFILES[c];
                  const isSelected = company === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCompany(c)}
                      className={`rounded border p-2 text-left transition-all ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-sm shadow-cyan-500/20"
                          : "border-slate-800 bg-[#141824] text-slate-400 hover:border-slate-700 hover:text-slate-300"
                      }`}
                    >
                      <div className="font-semibold text-xs flex items-center justify-between">
                        <span>{c}</span>
                        <span className="text-[9px] font-mono text-slate-400">{prof.marketSharePct}% Vol</span>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1 line-clamp-1">
                        {c === "CGC" ? "Global Benchmark" : c === "CBCS" ? "Verified Signatures" : "Card Crossover"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Service Tier Selector */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1.5">
                Turnaround Latency Tier
              </label>
              <div className="space-y-2">
                {(["ECONOMY_BULK", "STANDARD", "EXPRESS", "SOVEREIGN_DESK"] as GradingServiceTier[]).map((t) => {
                  const cfg = GRADING_TIER_CONFIGS[t];
                  const isSelected = tier === t;
                  return (
                    <div
                      key={t}
                      onClick={() => setTier(t)}
                      className={`cursor-pointer rounded border p-2.5 transition-all flex items-center justify-between text-xs ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/30 text-slate-100 shadow-sm shadow-cyan-500/20"
                          : "border-slate-800 bg-[#121520] text-slate-400 hover:border-slate-700 hover:text-slate-300"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          {cfg.displayName}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-cyan-400" />
                          <span>{cfg.latencyHours} Hours Latency</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-medium text-cyan-300">
                          ${cfg.costUsd.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Clean & Press Option */}
            <div className="rounded border border-slate-800 bg-[#121520] p-3 flex items-start gap-3">
              <input
                id="pressing-toggle"
                type="checkbox"
                checked={hasPressing}
                onChange={(e) => setHasPressing(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
              />
              <label htmlFor="pressing-toggle" className="cursor-pointer text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Professional Clean & Press (+${PRESSING_ADDON_CONFIG.costUsd.toFixed(2)})</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Adds +{PRESSING_ADDON_CONFIG.additionalLatencyHours} hours. Eliminates pressable surface ripples/indentations. Permanent defects (color breaks, spine tears, water stains) cannot be pressed out.
                </p>
              </label>
            </div>

            {/* Summary Breakdown */}
            <div className="border-t border-slate-800/80 pt-3 text-xs space-y-1">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Authentication Service:</span>
                <span className="text-slate-200">${unitGradingFee.toFixed(2)}</span>
              </div>
              {hasPressing && (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Clean & Press Service:</span>
                  <span className="text-slate-200">${PRESSING_ADDON_CONFIG.costUsd.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium text-slate-200 pt-1 border-t border-slate-800/40 text-xs">
                <span>Total Simulation Deductions:</span>
                <span className="text-cyan-400 font-mono">${totalSubmissionCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                <span>Estimated Time-in-Flight:</span>
                <span className="text-slate-400">{totalTurnaroundHours} simulated in-game hours</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-slate-800 text-slate-400 hover:bg-slate-900 text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8 font-medium flex items-center gap-1.5"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {isSubmitting ? "Dispatching..." : "Submit to Vault"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
