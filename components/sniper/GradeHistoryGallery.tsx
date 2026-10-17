"use client";

import * as React from "react";
import { LotMarketChart } from "./LotMarketChart";

/** Show a separate real-sales history chart for each grade that actually traded. */
export function GradeHistoryGallery({ series, issue, selectedGrade, itemId, ticker, currentBid }: {
  series: string; issue: string; selectedGrade: number; itemId?: string; ticker: string; currentBid: number;
}) {
  const [grades, setGrades] = React.useState<Array<{grade: number; count: number}>>([]);
  const [busy, setBusy] = React.useState(true);
  const [showAll, setShowAll] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    setBusy(true);
    setGrades([]);
    const q = new URLSearchParams({ series, issue, grade: String(selectedGrade) });
    fetch(`/api/sniper/candles?${q}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (active) { setGrades(data?.success && Array.isArray(data.grades) ? data.grades : []); setBusy(false); } })
      .catch(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [series, issue, selectedGrade]);
  const available = React.useMemo(() => [...grades].sort((a,b) => b.grade-a.grade), [grades]);
  const displayed = showAll ? available : available.slice(0, 6);
  return <section className="space-y-4" aria-label="Grade-by-grade historical sales charts">
    <header className="flex flex-wrap justify-between gap-2 items-center">
      <div><h3 className="text-cyan-300 text-sm font-bold">CGC grade-by-grade historical sales</h3>
        <p className="text-xs text-slate-400">One chart per grade with verified CGC transactions. No estimated or interpolated sales.</p></div>
      {available.length > 6 && <button type="button" onClick={() => setShowAll(x => !x)} className="text-xs text-cyan-300 underline">{showAll ? "Show fewer grades" : `Show all ${available.length} grades`}</button>}
    </header>
    {busy ? <p className="text-xs text-slate-400">Checking recorded grade histories…</p> : available.length === 0 ?
      <div className="text-xs text-amber-300 border border-slate-700 p-3 rounded">No CGC-identified completed transactions are connected for this comic. Charts cannot be drawn from guide prices alone.</div> :
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {displayed.map(({grade, count}) => <article key={grade} className="min-w-0 rounded-lg border border-slate-700 p-3">
          <h4 className="font-bold text-cyan-200 text-sm mb-2">CGC {grade.toFixed(1)} <span className="text-slate-400 font-normal">· {count} recorded sales</span></h4>
          <LotMarketChart series={series} issue={issue} grade={grade} itemId={grade === selectedGrade ? itemId : undefined} ticker={`${ticker} · CGC ${grade.toFixed(1)}`} currentBid={currentBid} />
        </article>)}
      </div>}
  </section>;
}
