import { Cable, Database, DollarSign, Fingerprint } from "lucide-react";

interface RelationshipMapProps {
  ppcfId: string;
  gcdIssueId: number | null;
  seriesName: string | null;
  sourceLinks: Array<{ source_system: string; source_record_id: string }>;
  hasPricing: boolean;
}

export function RelationshipMap({ ppcfId, gcdIssueId, seriesName, sourceLinks, hasPricing }: RelationshipMapProps) {
  const panelProfits = sourceLinks.filter((link) => link.source_system === "PANEL_PROFITS").length;
  const comicBase = sourceLinks.filter((link) => link.source_system === "COMICBASE").length;

  return (
    <section className="border border-slate-800 bg-[#080c13] p-5 sm:p-6">
      <div className="flex items-center gap-2"><Cable className="h-4 w-4 text-pink-300" /><h2 className="text-sm uppercase tracking-[0.16em] text-slate-200">Identity relationship map</h2><span className="text-[10px] uppercase tracking-[0.14em] text-slate-600">Verified graph edges</span></div>
      <div className="relative mt-6 grid gap-3 md:grid-cols-3 md:grid-rows-3">
        <div className="hidden md:block absolute left-1/2 top-1/2 h-px w-[66%] -translate-x-1/2 bg-pink-300/25" />
        <div className="hidden md:block absolute left-1/2 top-1/2 h-[66%] w-px -translate-y-1/2 bg-pink-300/25" />
        <div className="relative z-10 border border-pink-300/80 bg-pink-950/20 p-4 text-center shadow-[0_0_22px_rgba(244,114,182,0.18)] md:col-start-2 md:row-start-2"><Fingerprint className="mx-auto h-5 w-5 text-pink-300" /><p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-pink-200">Panel Profits edition</p><p className="mt-2 text-lg text-slate-100">{seriesName || "Edition record"}</p><p className="mt-1 text-xs text-slate-500">Canonical identity</p></div>
        <div className="border border-blue-300/50 bg-blue-950/20 p-4 md:col-start-2 md:row-start-1"><Database className="h-4 w-4 text-blue-300" /><p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-blue-200">GCD identity</p><p className="mt-1 text-sm text-slate-200">{gcdIssueId ? `Issue ${gcdIssueId}` : "Source-only record"}</p></div>
        <div className="border border-red-300/50 bg-red-950/20 p-4 md:col-start-1 md:row-start-2"><Database className="h-4 w-4 text-red-300" /><p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-red-200">Panel Profits source</p><p className="mt-1 text-sm text-slate-200">{panelProfits} linked record{panelProfits === 1 ? "" : "s"}</p></div>
        <div className="border border-orange-300/50 bg-orange-950/20 p-4 md:col-start-3 md:row-start-2"><Database className="h-4 w-4 text-orange-300" /><p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-orange-200">ComicBase source</p><p className="mt-1 text-sm text-slate-200">{comicBase} linked record{comicBase === 1 ? "" : "s"}</p></div>
        <div className="border border-amber-300/50 bg-amber-950/20 p-4 md:col-start-2 md:row-start-3"><DollarSign className="h-4 w-4 text-amber-300" /><p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-amber-200">Pricing evidence</p><p className="mt-1 text-sm text-slate-200">{hasPricing ? "Observed" : "Pending"}</p></div>
      </div>
    </section>
  );
}
