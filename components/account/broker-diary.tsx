import * as React from "react";
import { BookOpen, TrendingUp, UserCheck, ShieldAlert, Award, FileText } from "lucide-react";

export interface DiaryEntry {
  id: string;
  type: "trade" | "acquisition" | "valuation_change" | "whale_alert" | "note";
  title: string;
  description: string;
  timestamp: string;
  amountUsd?: number | null;
  ticker?: string;
}

export function BrokerDiary({ entries }: { entries: DiaryEntry[] }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="border border-slate-800 bg-[#0A0D15] p-6 text-center rounded-lg">
        <FileText className="mx-auto h-8 w-8 text-slate-600" />
        <p className="mt-3 text-sm font-semibold text-slate-300">Broker Log & Whales Feed Empty</p>
        <p className="mt-1 text-xs text-slate-500">
          No institutional trades or whale movements recorded in the current session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-cyan-300">
          <BookOpen className="h-4 w-4" />
          Broker Diary & Institutional Whales
        </div>
        <span className="text-[10px] font-mono text-slate-500">{entries.length} Live Records</span>
      </div>

      <div className="divide-y divide-slate-800/60 border border-slate-800/80 bg-[#06080E] rounded-lg overflow-hidden">
        {entries.map((entry) => (
          <div key={entry.id} className="p-4 hover:bg-slate-900/40 transition-colors flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded p-2 bg-slate-950 border border-slate-800 text-slate-300">
                {entry.type === "whale_alert" && <ShieldAlert className="h-4 w-4 text-amber-400" />}
                {entry.type === "trade" && <TrendingUp className="h-4 w-4 text-emerald-400" />}
                {entry.type === "acquisition" && <Award className="h-4 w-4 text-cyan-400" />}
                {entry.type === "valuation_change" && <TrendingUp className="h-4 w-4 text-purple-400" />}
                {entry.type === "note" && <UserCheck className="h-4 w-4 text-slate-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-100">{entry.title}</h4>
                  {entry.ticker && (
                    <span className="text-[9px] font-mono uppercase bg-amber-950/40 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded">
                      {entry.ticker}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">{entry.description}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono text-slate-500 block">{entry.timestamp}</span>
              {entry.amountUsd != null && (
                <span className="mt-1 text-xs font-mono font-semibold text-emerald-300 block">
                  ${entry.amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
