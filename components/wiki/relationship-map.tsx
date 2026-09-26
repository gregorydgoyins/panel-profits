"use client";

import * as React from "react";
import { Cable, Database, DollarSign, Fingerprint, Sparkles, User, Shield, Layers } from "lucide-react";
import { extractComicEntities, buildEntityGraph, type ExtractedEntity } from "@/lib/wiki/entity-extractor";

interface RelationshipMapProps {
  ppcfId: string;
  gcdIssueId: number | null;
  seriesName: string | null;
  sourceLinks: Array<{ source_system: string; source_record_id: string }>;
  hasPricing: boolean;
  extraContextText?: string;
}

export function RelationshipMap({
  ppcfId,
  gcdIssueId,
  seriesName,
  sourceLinks,
  hasPricing,
  extraContextText = "",
}: RelationshipMapProps) {
  const [selectedNode, setSelectedNode] = React.useState<ExtractedEntity | null>(null);

  const entities = React.useMemo(() => {
    const textToScan = `${seriesName || ""} ${extraContextText}`;
    return extractComicEntities(textToScan);
  }, [seriesName, extraContextText]);

  const graphNodes = React.useMemo(() => {
    return buildEntityGraph(entities);
  }, [entities]);

  const panelProfits = sourceLinks.filter((link) => link.source_system === "PANEL_PROFITS").length;
  const comicBase = sourceLinks.filter((link) => link.source_system === "COMICBASE").length;

  return (
    <section className="overflow-hidden border border-pink-500/40 bg-[#080c13] p-5 sm:p-6 shadow-[0_0_30px_rgba(244,114,182,0.06)] rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <Cable className="h-5 w-5 text-pink-400 animate-pulse" />
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-slate-100">
            Prezi Interactive Entity & Lineage Graph
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-pink-300 bg-pink-950/40 border border-pink-500/30 px-2.5 py-1 rounded">
          <Sparkles className="h-3 w-3 text-pink-400" />
          {entities.length} Dynamic Edges Resolved
        </div>
      </div>

      {/* Prezi Node Map Canvas */}
      <div className="relative mt-6 min-h-[320px] rounded border border-slate-800 bg-[#05070C] p-6 overflow-hidden">
        {/* Ambient Grid Line Pattern */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(#F472B6 1px, transparent 1px), radial-gradient(#38BDF8 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundPosition: "0 0, 12px 12px",
          }}
        />

        {/* Central Core Node */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className="relative border-2 border-pink-400/90 bg-pink-950/40 px-6 py-4 text-center shadow-[0_0_30px_rgba(244,114,182,0.3)] rounded-xl max-w-sm">
            <Fingerprint className="mx-auto h-7 w-7 text-pink-300" />
            <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.2em] text-pink-200">
              Canonical Edition
            </p>
            <p className="mt-1 text-xl font-bold text-slate-100">{seriesName || "Edition Record"}</p>
            <p className="mt-1 text-xs text-slate-400">PPCF ID: {ppcfId.slice(0, 12)}...</p>
          </div>
        </div>

        {/* Dynamic Satellite Entity Nodes */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
          <div className="border border-blue-400/50 bg-blue-950/20 p-3.5 rounded hover:border-blue-300 transition-colors">
            <div className="flex items-center gap-1.5 text-blue-300 text-[10px] font-mono uppercase tracking-wider">
              <Database className="h-3.5 w-3.5" /> GCD Record
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-200">
              {gcdIssueId ? `Issue #${gcdIssueId}` : "Source Verified"}
            </p>
          </div>

          <div className="border border-emerald-400/50 bg-emerald-950/20 p-3.5 rounded hover:border-emerald-300 transition-colors">
            <div className="flex items-center gap-1.5 text-emerald-300 text-[10px] font-mono uppercase tracking-wider">
              <Layers className="h-3.5 w-3.5" /> Provenance
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-200">
              {panelProfits} Linked Evidence Edge{panelProfits === 1 ? "" : "s"}
            </p>
          </div>

          <div className="border border-amber-400/50 bg-amber-950/20 p-3.5 rounded hover:border-amber-300 transition-colors">
            <div className="flex items-center gap-1.5 text-amber-300 text-[10px] font-mono uppercase tracking-wider">
              <DollarSign className="h-3.5 w-3.5" /> Market Status
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-200">
              {hasPricing ? "Observed FMV" : "Unpriced Base"}
            </p>
          </div>

          <div className="border border-purple-400/50 bg-purple-950/20 p-3.5 rounded hover:border-purple-300 transition-colors">
            <div className="flex items-center gap-1.5 text-purple-300 text-[10px] font-mono uppercase tracking-wider">
              <Shield className="h-3.5 w-3.5" /> ComicBase
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-200">
              {comicBase} Catalog Crosswalk{comicBase === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Extracted Creator & Character Micro-Nodes */}
        {entities.length > 0 && (
          <div className="mt-6 border-t border-slate-800/80 pt-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400 mb-3">
              Resolved Lore & Creator Crosswalks:
            </p>
            <div className="flex flex-wrap gap-2">
              {entities.map((ent) => (
                <button
                  key={ent.id}
                  type="button"
                  onClick={() => setSelectedNode(ent)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border transition-all ${
                    selectedNode?.id === ent.id
                      ? "border-pink-400 bg-pink-950/80 text-pink-200 shadow-[0_0_12px_rgba(244,114,182,0.3)]"
                      : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <User className="h-3 w-3 text-pink-400" />
                  <span className="font-medium">{ent.name}</span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">
                    ({ent.type})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Node Detail Dossier Popup */}
        {selectedNode && (
          <div className="mt-4 p-4 border border-pink-400/60 bg-[#0B0F19] rounded shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-pink-300 uppercase tracking-wider">
                {selectedNode.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                ✕ Close
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">{selectedNode.description}</p>
          </div>
        )}
      </div>
    </section>
  );
}
