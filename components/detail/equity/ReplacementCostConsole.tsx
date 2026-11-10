/**
 * Standalone interactive Column 2 component:
 * Replacement Cost & Raw-to-Graded Levels Encasement Console
 */

import React, { useState } from "react";
import type { SovereignEquityPricingOutput, CanonicalGrade } from "@/lib/pricing/sovereign-equity-pricing-engine";
import {
  type CalculatedReplacementHurdle,
  type PressingType,
  type GradingTierSelection,
  type SignatureAuthType,
} from "@/lib/pricing/replacement-cost-engine";
import {
  Package,
  Edit3,
  Receipt,
  ChevronDown,
  ChevronUp,
  Award,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  Box,
  Sparkles,
  Info,
} from "lucide-react";
import { fmt } from "./shared";

interface ReplacementCostConsoleProps {
  engineOutput: SovereignEquityPricingOutput;
  hurdle: CalculatedReplacementHurdle;
  activePurchaseBasis: number;
  setCustomPurchaseBasis: (val: number | null) => void;
  defaultInboundFreight: number;
  setCustomInboundFreight: (val: number | null) => void;
  pressingType: PressingType;
  setPressingType: (val: PressingType) => void;
  customPressingFee: number;
  setCustomPressingFee: (val: number) => void;
  gradingTierChoice: GradingTierSelection;
  setGradingTierChoice: (val: GradingTierSelection) => void;
  shippingBatchShare: number;
  setShippingBatchShare: (val: number) => void;
  signatureAuthChoice: SignatureAuthType;
  setSignatureAuthChoice: (val: SignatureAuthType) => void;
  signatureCount: number;
  setSignatureCount: (val: number) => void;
  preScreenCutoff: "OFF" | "9.6" | "9.8";
  setPreScreenCutoff: (val: "OFF" | "9.6" | "9.8") => void;
  selectedCanonicalGrade: CanonicalGrade | null;
  syncGrade: (g: CanonicalGrade) => void;
  isVintageEra: boolean;
}

export function ReplacementCostConsole({
  engineOutput,
  hurdle,
  activePurchaseBasis,
  setCustomPurchaseBasis,
  defaultInboundFreight,
  setCustomInboundFreight,
  pressingType,
  setPressingType,
  customPressingFee,
  setCustomPressingFee,
  gradingTierChoice,
  setGradingTierChoice,
  shippingBatchShare,
  setShippingBatchShare,
  signatureAuthChoice,
  setSignatureAuthChoice,
  signatureCount,
  setSignatureCount,
  preScreenCutoff,
  setPreScreenCutoff,
  selectedCanonicalGrade,
  syncGrade,
  isVintageEra,
}: ReplacementCostConsoleProps) {
  const [showInspector, setShowInspector] = useState(false);
  const [isEditingRaw, setIsEditingRaw] = useState(false);
  const [tempRawInput, setTempRawInput] = useState(String(activePurchaseBasis));
  const [isEditingInbound, setIsEditingInbound] = useState(false);
  const [tempInboundInput, setTempInboundInput] = useState(String(defaultInboundFreight));

  // Determine active target grade and market FMV
  const activeGrade: CanonicalGrade = selectedCanonicalGrade || (isVintageEra ? "8.0" : "9.8");
  const targetFmv = engineOutput.gradeMatrix[activeGrade]?.currentFmv || (activeGrade === "9.8" ? 117.32 : activePurchaseBasis);

  // Dynamic calculations driven by hurdle
  const isPreScreenRejected = preScreenCutoff !== "OFF" && (
    (preScreenCutoff === "9.8" && activeGrade !== "9.8") ||
    (preScreenCutoff === "9.6" && (activeGrade === "9.4" || activeGrade === "9.2" || activeGrade === "9.0" || activeGrade === "8.0" || activeGrade === "6.0" || activeGrade === "4.0" || activeGrade === "RAW"))
  );

  const effectiveBasis = isPreScreenRejected
    ? hurdle.rawAcquisitionLanded + hurdle.preScreenRejectCost
    : hurdle.totalLandedReplacementCost;

  const grossGain = targetFmv - effectiveBasis;
  const grossRoi = effectiveBasis > 0 ? Math.round((grossGain / effectiveBasis) * 100) : 0;
  const sellingFee = Math.round(targetFmv * 0.10); // 10% Exchange standard
  const netCash = targetFmv - sellingFee;
  const netProfit = netCash - effectiveBasis;
  const netRoi = effectiveBasis > 0 ? Math.round((netProfit / effectiveBasis) * 100) : 0;

  // Grade tiers for ladder
  const ladderGrades: CanonicalGrade[] = isVintageEra
    ? ["9.8", "9.2", "8.0", "6.0", "4.0", "RAW"]
    : ["9.8", "9.6", "9.4", "9.2", "9.0", "RAW"];

  return (
    <div className="p-5 sm:p-6 rounded-xl bg-[#0b1220]/95 border border-cyan-500/35 flex flex-col justify-start shadow-xl">
      <div>
        {/* Column Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-white">
                Replacement Cost &amp; Encasement Ladder
              </h3>
              <p className="text-[11px] font-mono text-cyan-300/80">
                Landed Manufacturing Basis: ${effectiveBasis.toFixed(2)} (Raw + Press + Cert + Freight)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowInspector(!showInspector)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/60 transition-colors shadow-sm cursor-pointer"
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>{showInspector ? "Hide Customizer" : "Customize Costs"}</span>
            {showInspector ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* 1. Landed Acquisition Card with Editable Raw Basis */}
        <div className="mt-4 p-4 sm:p-5 rounded-lg bg-[#0e1626] border border-slate-800">
          <div className="flex items-center justify-between text-xs sm:text-sm font-mono uppercase tracking-wider text-slate-300">
            <span className="flex items-center gap-2 text-cyan-300 font-bold">
              <Package className="h-4 w-4" />
              1. Landed Acquisition Cost Basis
            </span>
            <span className="text-xs text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded bg-emerald-950/50 font-mono font-bold">
              UNENCASED RAW ASSET
            </span>
          </div>

          <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-800">
            {/* Raw Basis */}
            <div>
              <div className="text-xs font-mono text-slate-400">Raw Acquisition Price:</div>
              {isEditingRaw ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base font-mono text-slate-200 font-bold">$</span>
                  <input
                    type="number"
                    className="w-28 px-2 py-1 rounded bg-slate-900 border border-cyan-400 text-sm font-mono text-white focus:outline-none"
                    value={tempRawInput}
                    onChange={(e) => setTempRawInput(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseFloat(tempRawInput);
                      if (!isNaN(val) && val >= 0) setCustomPurchaseBasis(val);
                      setIsEditingRaw(false);
                    }}
                    className="px-2 py-1 rounded bg-cyan-500 text-slate-950 text-xs font-bold font-mono"
                  >
                    Set
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingRaw(false)}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 mt-1">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                    ${activePurchaseBasis.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempRawInput(String(activePurchaseBasis));
                      setIsEditingRaw(true);
                    }}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                    title="Edit raw acquisition price"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Inbound Shipping & Insurance */}
              <div className="flex items-center gap-2 mt-2 text-xs font-mono text-slate-300">
                <span>Inbound Freight:</span>
                {isEditingInbound ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      className="w-20 px-1.5 py-0.5 rounded bg-slate-900 border border-cyan-400 text-xs font-mono text-white"
                      value={tempInboundInput}
                      onChange={(e) => setTempInboundInput(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseFloat(tempInboundInput);
                        if (!isNaN(val) && val >= 0) setCustomInboundFreight(val);
                        setIsEditingInbound(false);
                      }}
                      className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 text-[11px] font-bold"
                    >
                      Set
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingInbound(false)}
                      className="px-1 text-[11px] text-slate-400"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <strong className="text-cyan-300 font-bold">+${defaultInboundFreight.toFixed(2)}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setTempInboundInput(String(defaultInboundFreight));
                        setIsEditingInbound(true);
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
                      title="Edit inbound freight & transit insurance"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Target Value & Return Summary */}
            <div className="text-left sm:text-right">
              <div className="text-xs font-mono text-slate-400">
                Target Value (CGC {activeGrade}):
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-300 mt-1">
                ${targetFmv.toFixed(2)}
              </div>
              <div className="mt-2 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Net Profit:</span>{" "}
                  <strong className={netProfit >= 0 ? "text-emerald-400 text-sm font-bold" : "text-rose-400 text-sm font-bold"}>
                    {netProfit >= 0 ? `+$${netProfit.toFixed(2)}` : `-$${Math.abs(netProfit).toFixed(2)}`}
                  </strong>{" "}
                  <span className={netRoi >= 0 ? "text-emerald-300 font-bold" : "text-rose-400 font-bold"}>
                    ({netRoi >= 0 ? `+${netRoi}%` : `${netRoi}%`} Net ROI)
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Walk-away cash after 10% friction: ${netCash.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Itemized Fixed Overhead Badges */}
          <div className="mt-3.5 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
            {/* Pressing Fee */}
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 text-xs font-semibold">Pressing Desk</div>
              <div className="font-extrabold text-sm sm:text-base text-white mt-1">
                {hurdle.pressingFee > 0 ? `+$${hurdle.pressingFee.toFixed(2)}` : "$0.00"}
              </div>
              <div className="text-[11px] text-cyan-300 truncate mt-0.5">
                {pressingType === "NONE" ? "Skipped" : pressingType === "DIY_SEASONED" ? "DIY (+0.2 Bump)" : pressingType === "DIY_NOVICE" ? "Novice (18% Risk)" : pressingType === "PRIVATE_MASTER" ? "Master Press" : "CCS Factory"}
              </div>
            </div>

            {/* Grading Tier */}
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 text-xs font-semibold">Grading Tier</div>
              <div className="font-extrabold text-sm sm:text-base text-white mt-1">
                +${hurdle.gradingFee.toFixed(2)}
              </div>
              <div className="text-[11px] text-cyan-300 truncate mt-0.5">
                {hurdle.gradingTierName}
              </div>
            </div>

            {/* Signature Auth */}
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 text-xs font-semibold">Signature / Auth</div>
              <div className="font-extrabold text-sm sm:text-base text-white mt-1">
                {hurdle.signatureFee > 0 ? `+$${hurdle.signatureFee.toFixed(2)}` : "$0.00"}
              </div>
              <div className="text-[11px] text-cyan-300 truncate mt-0.5">
                {signatureAuthChoice === "NONE" ? "Universal Blue" : signatureAuthChoice === "CGC_WITNESSED" ? `CGC Sig (${signatureCount}x)` : `JSA Forensic (${signatureCount}x)`}
              </div>
            </div>

            {/* Round-Trip Freight */}
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 text-xs font-semibold">USPS Freight Share</div>
              <div className="font-extrabold text-sm sm:text-base text-white mt-1">
                +${hurdle.freightOverhead.toFixed(2)}
              </div>
              <div className="text-[11px] text-cyan-300 truncate mt-0.5">
                Sarasota / Dallas
              </div>
            </div>
          </div>
        </div>

        {/* 2. Interactive Customizer Drawer */}
        {showInspector && (
          <div className="mt-4 p-4 rounded-lg bg-[#070c18] border border-cyan-500/40 font-mono text-xs space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                Subscriber-Configurable Manufacturing Parameters
              </span>
              <span className="text-slate-400 text-[11px]">Dynamic Live Recalculation</span>
            </div>

            {/* Row A: Pressing Desk with Skill & Damage Probability */}
            <div>
              <div className="text-slate-300 font-semibold mb-1 flex items-center justify-between">
                <span>Pressing Desk &amp; Defect Profile:</span>
                <span className="text-[11px] text-cyan-300">
                  Bump Potential: +{hurdle.pressingBumpPotential.toFixed(1)} grades · Damage Slip Risk: {hurdle.pressingDamageRiskPct}%
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  { id: "NONE", label: "No Press ($0)" },
                  { id: "DIY_NOVICE", label: "Novice DIY ($0)" },
                  { id: "DIY_SEASONED", label: "Seasoned DIY ($0)" },
                  { id: "PRIVATE_MASTER", label: "Master Press ($18)" },
                  { id: "CGC_CCS", label: "CGC / CCS ($15-$30)" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPressingType(p.id as PressingType)}
                    className={`py-1.5 px-2 rounded font-bold text-[11px] transition-all cursor-pointer ${
                      pressingType === p.id
                        ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row B: Grading Tier & Reholder Choice */}
            <div>
              <div className="text-slate-300 font-semibold mb-1">CGC / Grader Fee Tier:</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {[
                  { id: "AUTO", label: "Auto (Era / Value)" },
                  { id: "MODERN", label: "Modern ($25)" },
                  { id: "VINTAGE_PRE1975", label: "Vintage Pre-1975 ($40)" },
                  { id: "HIGH_VALUE_3PCT", label: "> $1k (3% FMV Rule)" },
                  { id: "REHOLDER", label: "Reholder ($15)" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setGradingTierChoice(t.id as GradingTierSelection)}
                    className={`py-1.5 px-2 rounded font-bold text-[11px] transition-all cursor-pointer ${
                      gradingTierChoice === t.id
                        ? "bg-purple-500 text-white shadow-md font-extrabold"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row C: Signature Witness & Forensic Authentication */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <div className="text-slate-300 font-semibold mb-1">Signature &amp; Verification Protocol:</div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: "NONE", label: "Universal ($0)" },
                    { id: "CGC_WITNESSED", label: "Witnessed (+$15)" },
                    { id: "JSA_CBCS_VERIFIED", label: "JSA / CBCS (+$25+)" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSignatureAuthChoice(s.id as SignatureAuthType)}
                      className={`py-1 rounded text-[11px] font-bold cursor-pointer ${
                        signatureAuthChoice === s.id
                          ? "bg-amber-500 text-slate-950 font-extrabold"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-slate-300 font-semibold mb-1">
                  Freight Share (USPS Medium Box Pro-Rated):
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.5"
                    className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                    value={shippingBatchShare}
                    onChange={(e) => setShippingBatchShare(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                  <span className="text-[11px] text-slate-400">Round-trip per-book share</span>
                </div>
              </div>
            </div>

            {/* Pre-Screen Protocol Cutoff */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <span className="text-slate-300 font-semibold">CGC Pre-Screen Rejection Safeguard:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { id: "OFF", label: "OFF (Grade All)" },
                  { id: "9.6", label: "9.6 Floor ($9 Reject)" },
                  { id: "9.8", label: "9.8 Gem Mint Only" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPreScreenCutoff(c.id as any)}
                    className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                      preScreenCutoff === c.id
                        ? "bg-emerald-600 text-white font-extrabold"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. The 6-Rung Raw-to-Graded Yield Ladder */}
        <div className="mt-4 space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between px-1">
            <span>Grade Outcome</span>
            <span>Breakeven Hurdle · Net Dollar Gain</span>
          </div>

          {ladderGrades.map((g) => {
            const isSelected = activeGrade === g;
            const gFmv = engineOutput.gradeMatrix[g]?.currentFmv || (g === "9.8" ? 117.32 : activePurchaseBasis);
            const isReject = preScreenCutoff !== "OFF" && (
              (preScreenCutoff === "9.8" && g !== "9.8") ||
              (preScreenCutoff === "9.6" && ["9.4", "9.2", "9.0", "8.0", "6.0", "4.0", "RAW"].includes(g))
            );

            const costBasisForGrade = isReject
              ? hurdle.rawAcquisitionLanded + hurdle.preScreenRejectCost
              : g === "RAW"
              ? hurdle.rawAcquisitionLanded
              : hurdle.totalLandedReplacementCost;

            const gNet = gFmv * 0.90 - costBasisForGrade;
            const isProfitable = gNet >= 0;

            return (
              <div
                key={g}
                onClick={() => syncGrade(g)}
                className={`p-3 rounded-lg border transition-all cursor-pointer font-mono ${
                  isSelected
                    ? "bg-[#14233c] border-cyan-400 shadow-md ring-1 ring-cyan-400/50"
                    : "bg-[#0e1626] border-slate-800/80 hover:border-slate-700 hover:bg-[#111a2d]"
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-14 text-center py-1 rounded font-extrabold text-xs ${
                        g === "9.8"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50"
                          : g === "9.6"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50"
                          : g === "RAW"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-400/50"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {g}
                    </span>
                    <div>
                      <span className="text-white font-bold block">
                        CGC {g} FMV: ${gFmv.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {isReject ? (
                          <span className="text-amber-400 font-semibold">Pre-Screen Rejected (Saved Encapsulation Fee)</span>
                        ) : (
                          `Hurdle: $${costBasisForGrade.toFixed(2)}`
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        isProfitable
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {isProfitable ? "+" : ""}${gNet.toFixed(2)} Net
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Stratified Float & Scarcity Matrix */}
        <div className="mt-4 p-4 rounded-lg bg-[#0e1626] border border-slate-800 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Box className="h-4 w-4 text-cyan-400" />
              Stratified Float &amp; Discovery Density
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-950 text-purple-300 border border-purple-500/40">
              {hurdle.boxOdds.scarcityRating}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-center">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Master Catalog Density</span>
              <span className="text-white font-bold text-sm mt-0.5 block">{hurdle.boxOdds.shortBoxOdds}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">355,692 Unique Issues</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">Raw Circulating Float</span>
              <span className="text-cyan-300 font-bold text-sm mt-0.5 block">~{hurdle.boxOdds.rawCirculatingFloat.toLocaleString()} Raw</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Unslabbed Float Pool</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">CGC 9.8 Certified Vault</span>
              <span className="text-emerald-400 font-bold text-sm mt-0.5 block">{hurdle.boxOdds.slabVaultOdds}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Separate Graded Float</span>
            </div>
          </div>

          {/* Cluster & Multi-Copy Anomaly Factor */}
          <div className="p-2.5 rounded bg-slate-950/70 border border-cyan-500/20 text-[11px] text-slate-300 flex items-center justify-between flex-wrap gap-1">
            <span className="text-cyan-300 font-semibold">Estate Cluster Anomaly:</span>
            <span className="text-white font-mono">{hurdle.boxOdds.clusterAnomalyMultiplier}</span>
          </div>

          <p className="text-[11px] text-slate-400 pt-0.5 leading-relaxed font-sans">
            {hurdle.boxOdds.scarcityMultiplierDescription}
          </p>
        </div>

        {/* 5. Investment Thesis & Recommendation Card */}
        <div className="mt-4 p-4 rounded-lg bg-[#0e1626] border border-slate-800 font-sans space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 font-mono text-xs">
            <span className="text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>Valuation Thesis &amp; Recommendation</span>
            </span>
            <span className="text-white font-extrabold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/50">
              RATING: {engineOutput.contrarianStrategies?.markovRecommendedAction ? engineOutput.contrarianStrategies.markovRecommendedAction.replace(/_/g, " ") : "HOLD RAW"}
            </span>
          </div>
          <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1 space-y-1.5 font-sans">
            <p>
              <strong className="text-white">Capital Breakeven Hurdle (${effectiveBasis.toFixed(2)}):</strong>{" "}
              {netProfit >= 0
                ? `Clearing secondary sales above $${effectiveBasis.toFixed(2)} generates an authentic manufacturing equity surplus of +$${netProfit.toFixed(2)} on this copy.`
                : `Secondary sales under $${effectiveBasis.toFixed(2)} represent negative manufacturing spread (-$${Math.abs(netProfit).toFixed(2)}); consider pre-screening or holding unslabbed to avoid encapsulation friction.`}
            </p>
            <p className="text-slate-400 text-xs">
              <strong>Macro Benchmark &amp; Era:</strong> {engineOutput.macroBenchmarking?.peggedBenchmarkSeat || "CE70 Benchmarked"} · {engineOutput.era} Era ({engineOutput.portfolioRiskSummary?.scarcityTier ? engineOutput.portfolioRiskSummary.scarcityTier.replace(/_/g, " ") : "MODERATE"})
            </p>
          </div>
        </div>

      </div>

      {/* Bottom Provenance Note for Column 2 */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
        <span>
          CGC Tier: <strong className="text-slate-200">{hurdle.gradingTierName}</strong> · Fixed Overhead: <strong className="text-slate-200">${hurdle.totalFixedEncapsulationOverhead.toFixed(2)}</strong>
        </span>
        <span className="text-cyan-400 font-bold">LADDER CALIBRATED</span>
      </div>
    </div>
  );
}
