import { Activity, Gauge, Radio, ShieldAlert } from "lucide-react";
import { MarketTelemetry } from "@/lib/dashboard/queries";

export function MarketTelemetryRail({ telemetry }: { telemetry: MarketTelemetry | null }) {
  if (!telemetry) return null;
  const drawdown = telemetry.drawdown === null ? "—" : `${(telemetry.drawdown * 100).toFixed(1)}%`;
  const stress = telemetry.stressIndex === null ? "—" : telemetry.stressIndex.toFixed(3);
  return (
    <aside aria-label="Market telemetry" className="border-b border-slate-800 bg-[#05070a] px-4 py-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-500">
      <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto whitespace-nowrap">
        <span className="flex items-center gap-2 text-cyan-300"><Radio className="h-3 w-3" /> MARKET TELEMETRY</span>
        <span className="text-slate-700">|</span>
        <span className="flex items-center gap-1.5"><Activity className="h-3 w-3 text-emerald-300" /> TICK {telemetry.tick}</span>
        <span>CE50 {telemetry.ce50Last === null ? "—" : telemetry.ce50Last.toFixed(2)}</span>
        <span className={telemetry.regime === "CALM" ? "text-emerald-300" : "text-amber-300"}>REGIME {telemetry.regime || "UNKNOWN"}</span>
        <span>DRAWDOWN {drawdown}</span>
        <span>STRESS {stress}</span>
        <span className="flex items-center gap-1.5"><Gauge className="h-3 w-3 text-purple-300" /> TECTONIC {telemetry.tectonicTier ?? "—"}</span>
        {(telemetry.overlayActive || telemetry.cascadeActive) && <span className="flex items-center gap-1.5 text-rose-300"><ShieldAlert className="h-3 w-3" /> ACTIVE MARKET CONDITION</span>}
      </div>
    </aside>
  );
}