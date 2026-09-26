import { Database, ShieldCheck, TrendingUp } from "lucide-react";
import { ComicCensusDossier } from "@/lib/comics/census";

function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export function CensusDossier({ dossier }: { dossier: ComicCensusDossier | null }) {
  if (!dossier) {
    return (
      <section className="border border-slate-700 bg-[#111319] p-4 sm:p-6">
        <div className="flex items-center gap-2 text-slate-200"><Database className="h-4 w-4 text-cyan-300" /><h2 className="text-lg">Census and graded market evidence</h2></div>
        <p className="mt-3 text-sm leading-6 text-slate-400">No exact Clean census identity match is available for this edition. No population or sales value is inferred.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="census-heading" className="border border-cyan-900/60 bg-[#111319] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300"><Database className="h-4 w-4" /><h2 id="census-heading" className="text-lg text-slate-100">Census and graded market evidence</h2></div>
          <p className="mt-1 text-xs text-slate-400">Exact series, issue, and edition boundary · {dossier.snapshot.gradingCompany} · {dossier.snapshot.provider}</p>
        </div>
        <div className="text-right text-xs text-slate-400"><p>Snapshot</p><p className="mt-1 text-slate-200">{dateLabel(dossier.snapshot.snapshot_timestamp)}</p></div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="border border-slate-800 bg-slate-950/50 p-3"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Total graded</p><p className="mt-2 text-xl text-slate-100">{dossier.snapshot.total_graded ?? "Not reported"}</p></div>
        <div className="border border-slate-800 bg-slate-950/50 p-3"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Grade rows</p><p className="mt-2 text-xl text-slate-100">{dossier.grades.length}</p></div>
        <div className="border border-slate-800 bg-slate-950/50 p-3"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Sales observations</p><p className="mt-2 text-xl text-slate-100">{dossier.sales.length || "None"}</p></div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-300" /><h3 className="text-sm uppercase tracking-[0.14em] text-slate-200">Population by grade</h3></div>
          <div className="overflow-x-auto border-y border-slate-800"><table className="w-full min-w-[520px] text-left text-xs"><thead className="text-slate-500"><tr><th className="px-3 py-3">Grade</th><th className="px-3 py-3">Designation</th><th className="px-3 py-3 text-right">Count</th><th className="px-3 py-3 text-right">Higher</th></tr></thead><tbody className="divide-y divide-slate-800">{dossier.grades.map((row, index) => <tr key={`${row.native_grade_text}-${row.native_designation}-${index}`}><td className="px-3 py-3 text-slate-100">{row.native_grade_text}</td><td className="px-3 py-3 text-slate-400">{row.native_designation || "—"}</td><td className="px-3 py-3 text-right text-cyan-300">{row.count_at_grade.toLocaleString()}</td><td className="px-3 py-3 text-right text-slate-400">{row.count_higher ?? "—"}</td></tr>)}</tbody></table></div>
        </div>
        <div>
          <div className="mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-300" /><h3 className="text-sm uppercase tracking-[0.14em] text-slate-200">Recent graded sales</h3></div>
          <div className="divide-y divide-slate-800 border-y border-slate-800">{dossier.sales.slice(0, 8).map((sale, index) => <div key={`${sale.sale_date}-${sale.sale_price}-${index}`} className="flex items-center justify-between gap-3 px-3 py-3 text-xs"><div><p className="text-slate-100">{sale.native_grade_text} <span className="text-slate-500">· {sale.gradingCompany}</span></p><p className="mt-1 text-slate-500">{dateLabel(sale.sale_date)} · {sale.venue || "Venue unlisted"}</p></div><p className="text-emerald-300">{sale.sale_price == null ? "Unpriced" : `$${Number(sale.sale_price).toLocaleString()}`}</p></div>)}{!dossier.sales.length && <p className="px-3 py-6 text-sm text-slate-500">No exact sales observations are available.</p>}</div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-violet-300" /><h3 className="text-sm uppercase tracking-[0.14em] text-slate-200">Certification evidence</h3></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{dossier.certifications.slice(0, 8).map((certification) => <div key={certification.certification_number} className="border border-slate-800 bg-slate-950/50 p-3 text-xs"><p className="text-slate-100">{certification.gradingCompany} {certification.native_grade_text || "Grade unlisted"}</p><p className="mt-1 truncate text-slate-500">Cert {certification.certification_number}</p><p className="mt-2 text-slate-400">{certification.native_designation || "Designation unlisted"}</p></div>)}{!dossier.certifications.length && <p className="text-sm text-slate-500">No certification records are available for this exact identity.</p>}</div>
      </div>
    </section>
  );
}
