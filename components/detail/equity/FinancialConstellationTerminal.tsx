"use client";

import React, { useState } from "react";
import { Info, HelpCircle } from "lucide-react";
import {
  type ConstellationEquilibriumResult,
  calculateConstellationEquilibrium,
  CANONICAL_CONSTELLATION_NODES,
} from "@/lib/pricing/financial-constellation-engine";

interface FinancialConstellationTerminalProps {
  initialResult: ConstellationEquilibriumResult;
  accentColor?: string;
}

export default function FinancialConstellationTerminal({
  initialResult,
  accentColor = "#38bdf8",
}: FinancialConstellationTerminalProps) {
  const [result, setResult] = useState<ConstellationEquilibriumResult>(initialResult);
  const [simulatedAnchorPrice, setSimulatedAnchorPrice] = useState<number>(
    initialResult.anchorNode?.currentFmv98 || 0
  );

  const { node, anchorNode, equilibriumPrice98Usd, networkImpulseDeltaPct, isDecoupled, equilibriumStatus } = result;

  // Handle live transmission simulation
  const handleAnchorPriceChange = (newPrice: number) => {
    setSimulatedAnchorPrice(newPrice);
    if (!anchorNode) return;

    const modifiedAnchor = {
      ...anchorNode,
      currentFmv98: newPrice,
    };

    const recomputed = calculateConstellationEquilibrium(node, modifiedAnchor);
    setResult(recomputed);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 backdrop-blur-md shadow-2xl space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              C-Theory Terminal
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Network Graph Coordinate
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-wide mt-1">
            Financial Constellation & Macro Transmission Matrix
          </h3>
          <p className="text-xs text-slate-400">
            Relative-value gravitational equilibrium anchored to the foundational genesis instruments of sequential art.
          </p>
        </div>

        {/* STATUS BADGE */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
              isDecoupled
                ? "bg-slate-800 text-slate-400 border-slate-700"
                : equilibriumStatus === "PRECISE_EQUILIBRIUM"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : equilibriumStatus === "ANCHOR_TRANSMITTING"
                ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                : "bg-purple-500/10 text-purple-400 border-purple-500/30"
            }`}
          >
            {isDecoupled ? "DECOUPLED ASSET" : equilibriumStatus.replace("_", " ")}
          </div>
        </div>
      </div>

      {/* THE SUPERMAN WINDOW: ARCHETYPE & ANCHOR BANNER */}
      {!isDecoupled && anchorNode && (
        <div className="bg-slate-950/60 rounded-lg p-4 border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Gravitational Macro Anchor
            </span>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{anchorNode.series} #{anchorNode.issue}</span>
              <span className="text-xs text-amber-400 font-mono">
                (${anchorNode.currentFmv98.toLocaleString()})
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {anchorNode.narrativeArchetype}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Network Coupling Elasticity (ω)
            </span>
            <div className="text-sm font-mono font-bold text-sky-400">
              {node.couplingElasticity.toFixed(2)} / 1.00
            </div>
            <p className="text-xs text-slate-300">
              Dampened transmission: 100% anchor surge transmits +{(Math.pow(2, node.couplingElasticity) * 100 - 100).toFixed(1)}% liquidity impulse.
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Narrative Role
            </span>
            <div className="text-sm font-semibold text-slate-200">
              {node.role.replace("_", " ")}
            </div>
            <p className="text-xs text-slate-300">
              {node.narrativeArchetype}
            </p>
          </div>
        </div>
      )}

      {/* PLAIN-ENGLISH PURPOSE & DECOUPLING EXPLANATION */}
      <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 font-sans leading-relaxed space-y-2">
        <div className="flex items-center gap-2 font-mono font-bold text-cyan-300 text-xs uppercase tracking-wider">
          <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>What is the Financial Constellation &amp; Why Does It Matter?</span>
        </div>
        <p>
          The Financial Constellation measures whether an asset is financially tethered to landmark comic benchmarks
          (like <strong className="text-white">Action Comics #1</strong> or <strong className="text-white">Fantastic Four #1</strong>). When rare macro keys surge, they transmit liquidity to coupled books in their orbit.
        </p>
        {isDecoupled ? (
          <p className="border-t border-slate-800/80 pt-2 text-slate-400">
            <strong className="text-amber-400 font-mono font-semibold">Decoupled Status for this Book: </strong>
            Because this is an independent modern issue, it does <strong className="text-white">not</strong> move in lockstep with vintage million-dollar keys.
            Its price is governed strictly by its own real-world buyer auctions, meaning its Network Impulse Spread is <strong className="text-white font-mono">0.0%</strong> and its Constellation Equilibrium matches its actual market clearing price.
          </p>
        ) : (
          <p className="border-t border-slate-800/80 pt-2 text-slate-400">
            <strong className="text-sky-400 font-mono font-semibold">Coupled Status: </strong>
            This book is tethered to <strong className="text-white">{anchorNode?.series} #{anchorNode?.issue}</strong>. Use the transmission shock slider below to simulate how macro market surges impact this book.
          </p>
        )}
      </div>

      {/* NUMERICAL MATRIX GRID WITH INTERACTIVE EXPLANATIONS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/40 rounded-lg p-3 border border-white/5 space-y-1 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-300">Observed Market FMV (9.8)</span>
            <Info className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors cursor-help" />
          </div>
          <div className="text-base font-mono font-bold text-white">
            {node.currentFmv98 > 0
              ? `$${node.currentFmv98.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "UNPRICED"}
          </div>
          <span className="text-[11px] text-slate-400 block">Completed Sales Base</span>
          <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1 mt-1 font-sans">
            The authentic current clearing price established by recent secondary market auctions.
          </div>
        </div>

        <div className="bg-slate-950/40 rounded-lg p-3 border border-white/5 space-y-1 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-300">Constellation Equilibrium</span>
            <Info className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors cursor-help" />
          </div>
          <div className="text-base font-mono font-bold text-amber-400">
            ${equilibriumPrice98Usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 block">Theoretical Relative Yield</span>
          <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1 mt-1 font-sans">
            What relative-value network math predicts the price should be based on peer assets.
          </div>
        </div>

        <div className="bg-slate-950/40 rounded-lg p-3 border border-white/5 space-y-1 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-300">Network Impulse Spread</span>
            <Info className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors cursor-help" />
          </div>
          <div
            className={`text-base font-mono font-bold ${
              networkImpulseDeltaPct >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {networkImpulseDeltaPct > 0 ? `+${networkImpulseDeltaPct.toFixed(1)}%` : `${networkImpulseDeltaPct.toFixed(1)}%`}
          </div>
          <span className="text-[11px] text-slate-400 block">
            {networkImpulseDeltaPct >= 0 ? "Constellation Premium" : "Constellation Discount"}
          </span>
          <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1 mt-1 font-sans">
            Difference between predicted network value and real market price (0.0% = independent).
          </div>
        </div>

        <div className="bg-slate-950/40 rounded-lg p-3 border border-white/5 space-y-1 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-300">Independent Buffer (ψ)</span>
            <Info className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors cursor-help" />
          </div>
          <div className="text-base font-mono font-bold text-slate-300">
            {node.idiosyncraticFactor.toFixed(3)}x
          </div>
          <span className="text-[11px] text-slate-400 block">Anti-Lockstep Multiplier</span>
          <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1 mt-1 font-sans">
            Safeguard factor (1.000x) verifying zero artificial mathematical manipulation.
          </div>
        </div>
      </div>

      {/* INTERACTIVE TRANSMISSION SIMULATION SLIDER (FOR CELESTIAL KEYS) */}
      {!isDecoupled && anchorNode && (
        <div className="bg-slate-950/80 rounded-lg p-4 border border-white/5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-xs font-semibold text-slate-300">
              Live Cross-Asset Transmission Shock Simulator:
            </span>
            <span className="text-xs font-mono text-amber-400">
              Anchor ({anchorNode.series} #{anchorNode.issue}): ${simulatedAnchorPrice.toLocaleString()}
            </span>
          </div>

          <input
            type="range"
            min={1000000}
            max={12000000}
            step={250000}
            value={simulatedAnchorPrice}
            onChange={(e) => handleAnchorPriceChange(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />

          <div className="flex justify-between text-[11px] font-mono text-slate-300">
            <span>$1.0M (Macro Floor)</span>
            <span>$6.0M (Current Record Hammer)</span>
            <span>$12.0M (Next Secular Apex)</span>
          </div>
        </div>
      )}

      {/* ARTIFACT-IP BOUNDARY NOTICE */}
      <div className="text-[11px] text-slate-300 italic border-t border-white/5 pt-3 flex items-center justify-between">
        <span>
          * Artifact-IP Boundary Invariant: Pricing reflects physical genesis document rarity; zero corporate licensing rights implied.
        </span>
        <span className="font-mono text-slate-400">
          Dimensional Unit: [USD]
        </span>
      </div>
    </div>
  );
}
