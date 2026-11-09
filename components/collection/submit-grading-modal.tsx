"use client";

import { useState } from "react";
import { CollectionItem } from "@/lib/account/types";
import { GRADING_TIER_CONFIGS, GradingServiceTier, GradingCompany } from "@/lib/grading/types";
import { PRESSING_SUPPLY_REGISTRY, PressingSupplyTier, executeDIYPress, DIYPressResult } from "@/lib/grading/diy-pressing";
import { SUBCONTRACTOR_PRESSERS, SubcontractorPresserId, quoteSubcontractorPresser } from "@/lib/grading/pressers";
import { rollEasterEggOpportunity, EasterEggCandidate } from "@/lib/easter-eggs/engine";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Clock, ShieldCheck, CheckCircle2, Wrench, UserCheck, Flame, HelpCircle } from "lucide-react";

type PressingPath = "DIY" | "SUBCONTRACTOR" | "CORPORATE_DIRECT" | "NONE";

interface SubmitGradingModalProps {
  item: CollectionItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (batchId: string) => void;
}

export function SubmitGradingModal({ item, isOpen, onClose, onSubmitted }: SubmitGradingModalProps) {
  const [company, setCompany] = useState<GradingCompany>("CGC");
  const [tier, setTier] = useState<GradingServiceTier>("STANDARD");
  const [pressingPath, setPressingPath] = useState<PressingPath>("SUBCONTRACTOR");
  
  // DIY State
  const [supplyTier, setSupplyTier] = useState<PressingSupplyTier>("STANDARD_HOBBY");
  const [diyResult, setDiyResult] = useState<DIYPressResult | null>(null);
  const [isPracticing, setIsPracticing] = useState<boolean>(false);

  // Subcontractor State
  const [presserId, setPresserId] = useState<SubcontractorPresserId>("COMIC_SHOP_TECH");
  
  // Flow State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [discoveredEgg, setDiscoveredEgg] = useState<EasterEggCandidate | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ batchId: string; eta: string } | null>(null);

  if (!isOpen) return null;

  const tierConfig = GRADING_TIER_CONFIGS[tier];
  const unitGradingFee = tierConfig.costUsd;

  // Calculate Pressing Cost
  let pressingFee = 0;
  let pressingLatencyHours = 0;
  if (pressingPath === "DIY") {
    pressingFee = PRESSING_SUPPLY_REGISTRY[supplyTier].costBasisUsd;
    pressingLatencyHours = 2; // DIY labor is fast
  } else if (pressingPath === "SUBCONTRACTOR") {
    const quote = quoteSubcontractorPresser({ presserId, bookCount: 1, playerNegotiationLevel: 1 });
    pressingFee = quote.unitCostUsd;
    pressingLatencyHours = quote.totalLatencyHours;
  } else if (pressingPath === "CORPORATE_DIRECT") {
    pressingFee = 15.00; // Standard in-house CGC CCS fee
    pressingLatencyHours = 12;
  }

  const totalSubmissionCost = unitGradingFee + pressingFee;
  const totalTurnaroundHours = tierConfig.latencyHours + pressingLatencyHours;

  const series = item.ppcf?.series_name || item.comic?.series || "Unknown Series";
  const issueNumber = item.ppcf?.issue_number || item.comic?.issue_number || "";

  const handleDIYPress = () => {
    const rawGrade = item.grade ? parseFloat(item.grade) : 9.4;
    const result = executeDIYPress({
      rawEstimatedGrade: isNaN(rawGrade) ? 9.4 : rawGrade,
      playerPressingExp: 150,
      supplyTier,
      isPracticeBook: isPracticing
    });
    setDiyResult(result);

    // Roll for Easter Egg anomaly during disassembly
    const egg = rollEasterEggOpportunity({ event: "PRESSING_DISASSEMBLY", playerSkillLevel: 2 });
    if (egg) {
      setDiscoveredEgg(egg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Roll for Easter Egg on submission if not already rolled
    if (!discoveredEgg) {
      const egg = rollEasterEggOpportunity({ event: "PRESSING_DISASSEMBLY", playerSkillLevel: 2 });
      if (egg) {
        setDiscoveredEgg(egg);
      }
    }

    try {
      const res = await fetch("/api/grading/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdingId: item.id,
          comicId: item.comic_id,
          company,
          tier,
          hasPressing: pressingPath !== "NONE",
          pressingPath,
          quantity: 1
        })
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (data.success) {
        setSuccessInfo({ batchId: data.batchId, eta: `${totalTurnaroundHours} Hours` });
        if (onSubmitted) onSubmitted(data.batchId);
      }
    } catch {
      setIsSubmitting(false);
      const generatedId = `SUB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setSuccessInfo({ batchId: generatedId, eta: `${totalTurnaroundHours} Hours` });
      if (onSubmitted) onSubmitted(generatedId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-lg border border-cyan-500/50 bg-[#0E1017] p-6 shadow-2xl shadow-cyan-950/40 text-slate-100 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
          title="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {discoveredEgg && (
          <div className="mb-4 rounded-md border border-amber-500/60 bg-amber-950/30 p-3.5 shadow-lg">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
              <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
              <span>EASTER EGG ANOMALY DISCOVERED!</span>
            </div>
            <h4 className="mt-1 text-sm font-bold text-slate-100">{discoveredEgg.title}</h4>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">{discoveredEgg.narrativeClue}</p>
            <div className="mt-2 text-[11px] font-mono text-amber-400/90 border-t border-amber-500/20 pt-1.5 flex justify-between">
              <span>Market Effect:</span>
              <span>{discoveredEgg.marketConsequenceDescription}</span>
            </div>
          </div>
        )}

        {successInfo ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-lg font-medium text-slate-100">
              Grading Dispatch Initiated
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Batch Tracking: <span className="font-mono text-cyan-300">{successInfo.batchId}</span>
            </p>
            <div className="mt-4 rounded-md border border-slate-800 bg-[#141824] p-3 text-left text-xs space-y-1.5">
              <div className="flex justify-between py-1 text-slate-400 border-b border-slate-800/60">
                <span>Authority Desk:</span>
                <span className="font-medium text-slate-200">{company} Certified Services</span>
              </div>
              <div className="flex justify-between py-1 text-slate-400 border-b border-slate-800/60">
                <span>Pressing Method:</span>
                <span className="font-medium text-cyan-300">
                  {pressingPath === "DIY" ? "DIY Kitchen Table (Free Labor)" : pressingPath === "SUBCONTRACTOR" ? SUBCONTRACTOR_PRESSERS[presserId].name : pressingPath === "CORPORATE_DIRECT" ? "In-House CCS Pressing" : "Direct / Bypass"}
                </span>
              </div>
              <div className="flex justify-between py-1 text-slate-400">
                <span>Simulated Latency:</span>
                <span className="font-medium text-cyan-400">{successInfo.eta} in-flight</span>
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
                Prepare {series} #{issueNumber} for Slabbing
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Clean and press uncertified raw copies to unlock apex condition grades.
              </p>
            </div>

            {/* Pressing Strategy Selection */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1.5">
                Pressing & Cleaning Route
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: "DIY", label: "DIY Self-Press", icon: Wrench, sub: "Materials only" },
                  { id: "SUBCONTRACTOR", label: "Hire Presser", icon: UserCheck, sub: "15%-50% Disc" },
                  { id: "CORPORATE_DIRECT", label: "In-House CCS", icon: ShieldCheck, sub: "Standard $15" },
                  { id: "NONE", label: "Bypass / As-Is", icon: Clock, sub: "Zero delay" },
                ].map((p) => {
                  const Icon = p.icon;
                  const isSelected = pressingPath === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPressingPath(p.id as PressingPath)}
                      className={`rounded border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-sm shadow-cyan-500/20"
                          : "border-slate-800 bg-[#121520] text-slate-400 hover:border-slate-700 hover:text-slate-300"
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1 text-cyan-400" />
                      <div className="font-semibold text-[11px]">{p.label}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{p.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ROUTE 1: DIY Pressing Panel */}
            {pressingPath === "DIY" && (
              <div className="rounded border border-cyan-500/30 bg-[#121622] p-3 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-amber-400" /> DIY Equipment & Practice
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">Labor Cost: Free ($0.00)</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(["DISCOUNT_STORE", "STANDARD_HOBBY", "ARCHIVAL_STUDIO"] as PressingSupplyTier[]).map((st) => {
                    const cfg = PRESSING_SUPPLY_REGISTRY[st];
                    const isSelected = supplyTier === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSupplyTier(st)}
                        className={`rounded border p-2 text-left transition-all ${
                          isSelected
                            ? "border-amber-400 bg-amber-950/30 text-slate-200"
                            : "border-slate-800 bg-[#0e111a] text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="font-medium text-[10px] truncate">{cfg.displayName}</div>
                        <div className="text-amber-400 font-mono text-[10px] mt-0.5">${cfg.costBasisUsd.toFixed(2)}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-0.5">
                          <Flame className="h-2.5 w-2.5 text-rose-400" /> {cfg.burnRiskPct}% Risk
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={isPracticing}
                      onChange={(e) => setIsPracticing(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                    />
                    <span>Practice on Beater / Reader Book (+EXP, safe from ruin)</span>
                  </label>
                  <Button
                    type="button"
                    onClick={handleDIYPress}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] h-7 px-2.5 font-medium"
                  >
                    Run Press Test
                  </Button>
                </div>

                {diyResult && (
                  <div className={`mt-2 rounded p-2.5 text-[11px] ${diyResult.isDamaged ? "bg-rose-950/40 border border-rose-500/40 text-rose-200" : "bg-emerald-950/40 border border-emerald-500/40 text-emerald-200"}`}>
                    <div className="font-semibold">{diyResult.notes}</div>
                    <div className="text-[10px] mt-1 text-slate-400">
                      EXP Earned: +{diyResult.expGained} | Resulting Grade: {diyResult.finalEstimatedGrade}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ROUTE 2: Subcontractor Presser Studios */}
            {pressingPath === "SUBCONTRACTOR" && (
              <div className="rounded border border-cyan-500/30 bg-[#121622] p-3 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-cyan-400" /> Independent Presser Studios
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">Random 15% to 50% Wholesale Discount</span>
                </div>

                <div className="space-y-1.5">
                  {(["KITCHEN_FLIPPER", "COMIC_SHOP_TECH", "BOUTIQUE_LAB", "ARCHIVAL_GUILDSMAN"] as SubcontractorPresserId[]).map((pid) => {
                    const prof = SUBCONTRACTOR_PRESSERS[pid];
                    const quote = quoteSubcontractorPresser({ presserId: pid, bookCount: 1, playerNegotiationLevel: 1 });
                    const isSelected = presserId === pid;
                    return (
                      <div
                        key={pid}
                        onClick={() => setPresserId(pid)}
                        className={`cursor-pointer rounded border p-2 flex items-center justify-between transition-all ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-950/40 text-slate-100 shadow-sm shadow-cyan-500/20"
                            : "border-slate-800 bg-[#0e111a] text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div>
                          <div className="font-medium text-slate-200 text-xs flex items-center gap-2">
                            <span>{prof.name}</span>
                            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 px-1 rounded">
                              {quote.appliedDiscountPct}% OFF
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{prof.reputationTitle} · {prof.latencyHours}h turn</div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-cyan-300 font-medium">${quote.unitCostUsd.toFixed(2)}</span>
                          <span className="line-through text-[9px] text-slate-500 block">${prof.baseFeeUsd.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Grader Authority Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-slate-300">
                  Authentication Grader
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Standard Universal Blue Label
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["CGC", "CBCS", "PSA"] as GradingCompany[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCompany(c)}
                    className={`rounded border p-2 text-center text-xs font-semibold transition-all ${
                      company === c
                        ? "border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-sm shadow-cyan-500/20"
                        : "border-slate-800 bg-[#141824] text-slate-400 hover:border-slate-700 hover:text-slate-300"
                    }`}
                  >
                    {c} {c === "CGC" ? "(Apex Benchmark)" : c === "CBCS" ? "(Signatures)" : "(Crossover)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Turnaround Service Tier */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1.5">
                Service Turnaround Tier
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(["STANDARD", "EXPRESS"] as GradingServiceTier[]).map((t) => {
                  const cfg = GRADING_TIER_CONFIGS[t];
                  const isSelected = tier === t;
                  return (
                    <div
                      key={t}
                      onClick={() => setTier(t)}
                      className={`cursor-pointer rounded border p-2 flex justify-between items-center transition-all ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-950/30 text-slate-100"
                          : "border-slate-800 bg-[#121520] text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{cfg.displayName}</div>
                        <div className="text-[10px] text-slate-500">{cfg.latencyHours}h Latency</div>
                      </div>
                      <span className="font-mono text-cyan-300">${cfg.costUsd.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cost & Latency Summary */}
            <div className="border-t border-slate-800/80 pt-3 text-xs space-y-1">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Authentication Grader Fee:</span>
                <span className="text-slate-200">${unitGradingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Pressing & Treatment Fee:</span>
                <span className="text-slate-200">${pressingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium text-slate-200 pt-1 border-t border-slate-800/40 text-xs">
                <span>Total Simulation Outlay:</span>
                <span className="text-cyan-400 font-mono">${totalSubmissionCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                <span>Estimated Turnaround:</span>
                <span className="text-slate-400">{totalTurnaroundHours} simulated hours</span>
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
