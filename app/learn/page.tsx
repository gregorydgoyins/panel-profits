import { Award, BookOpenCheck, GraduationCap } from "lucide-react";
import { getLearningCatalog } from "@/lib/panel-profits/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Market Academy & Career Pathways | Panel Profits",
  description: "Explore the verified Clean learning curriculum, certification requirements, and career pathway credentials.",
};

export default async function LearnPage() {
  const { classes, certifications, exams, levels } = await getLearningCatalog();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="border-b border-slate-800 pb-7">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.28em] text-cyan-300">
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Market Academy // Learning Catalog</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
          Comic Valuation & Market Curriculum
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          The verified Clean learning catalog exposes classes, certifications, exams, and career pathway levels. Grounded in standard comic book history, CGC grading standards, and Investopedia-grade portfolio principles.
        </p>
      </header>

      {/* Overview Stat Metrics */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <section className="border border-slate-800 bg-[#0b0f15] p-5 shadow-sm">
          <GraduationCap className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Curriculum Classes</p>
          <p className="mt-1 text-3xl font-light text-slate-100">{classes.length}</p>
          <p className="mt-1 text-xs text-slate-500">Available learning units</p>
        </section>
        <section className="border border-slate-800 bg-[#0b0f15] p-5 shadow-sm">
          <Award className="h-5 w-5 text-amber-300" aria-hidden="true" />
          <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Certifications</p>
          <p className="mt-1 text-3xl font-light text-slate-100">{certifications.length}</p>
          <p className="mt-1 text-xs text-slate-500">Credential definitions</p>
        </section>
        <section className="border border-slate-800 bg-[#0b0f15] p-5 shadow-sm">
          <BookOpenCheck className="h-5 w-5 text-purple-300" aria-hidden="true" />
          <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Assessments</p>
          <p className="mt-1 text-3xl font-light text-slate-100">{exams.length}</p>
          <p className="mt-1 text-xs text-slate-500">Standard examinations</p>
        </section>
      </div>

      {/* Career Pathway Levels */}
      <section className="mt-8 border border-slate-800 bg-[#0b0f15] shadow-sm">
        <div className="border-b border-slate-800 p-5 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-100">Career Pathway Levels</h2>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{levels.length} Levels Defined</span>
        </div>
        <div className="divide-y divide-slate-800">
          {levels.map((level) => (
            <div key={level.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-900/30 transition-colors">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
                  Tier {level.level_number}
                </span>
                <h3 className="text-sm font-semibold text-slate-200 mt-0.5">{level.name}</h3>
                {level.description && (
                  <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">{level.description}</p>
                )}
              </div>
              <div className="text-xs font-mono text-slate-500 shrink-0">
                {level.required_points} PTS REQUIRED
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
