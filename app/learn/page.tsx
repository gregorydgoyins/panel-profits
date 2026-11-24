import { Award, BookOpenCheck, GraduationCap } from "lucide-react";
import { getLearningCatalog } from "@/lib/panel-profits/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Market Academy & Career Pathways | Panel Profits",
  description: "Explore the verified Clean learning curriculum, certification requirements, and career pathway credentials.",
};

export default async function LearnPage() {
  const { classes, certifications, exams, levels } = await getLearningCatalog();

  return (
    <div className="relative min-h-screen text-[#e0e6ed] font-sans antialiased selection:bg-cyan-500 selection:text-black">
      {/* High-Resolution Pantheon Academy Full-Page Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-30 transition-opacity duration-700"
        style={{
          backgroundImage: `url('/brand/cbse-academy-pantheon-bg.jpg?v=20261124')`,
        }}
      />
      {/* Atmospheric vignette allowing rich backdrop visibility */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#070b14]/75 via-[#070b14]/65 to-[#070b14]/90" />

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
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
          <Award className="h-5 w-5 text-cyan-400" aria-hidden="true" />
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

      <section id="sniper-practice" className="mt-8 scroll-mt-24 border border-cyan-500/30 bg-[#0b0f15] p-6 shadow-sm">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">Applied market practice</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-100">From research to a paper trade</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Use an existing Sniper lot to test a buying thesis against recorded evidence. Complete each step before entering a simulated order. A decision to pass is a valid result.</p>
        <ol className="mt-5 grid gap-4 md:grid-cols-2 text-sm leading-6 text-slate-300 list-decimal list-inside">
          <li><strong className="text-white">Identify the copy.</strong> Match series, issue, year, printing, cover, grader, grade and label. Open the comic dossier and character links. Record any unresolved identity claim.</li>
          <li><strong className="text-white">Build the collector thesis.</strong> Use the synopsis and credited creators to explain why this particular issue interests a buyer. Separate story evidence from a prediction of future demand.</li>
          <li><strong className="text-white">Compare the evidence.</strong> Check provider, edition, grade, currency and date for each price. Distinguish a guide value, a seller’s asking price and a completed sale. Read <Link href="/lexicon/fair-market-value-fmv-benchmark" className="text-cyan-300 underline">fair market value</Link> before choosing a reference.</li>
          <li><strong className="text-white">Interpret the census.</strong> Check the grading company and edition, then compare the relevant grade with the total. A graded population is not a print run or proof of demand. Study <Link href="/lexicon/scarcity" className="text-cyan-300 underline">scarcity</Link>.</li>
          <li><strong className="text-white">Set the paper entry.</strong> Choose your maximum simulated price, account for the lot’s stated costs, and write the condition that would make you pass. Do not substitute another grade’s guide value for this copy’s value.</li>
          <li><strong className="text-white">Review the outcome.</strong> Compare your thesis and limit with the recorded close when available. Explain whether identity, evidence quality or bidding changed your decision. Connect the result to <Link href="/lexicon/price-discovery" className="text-cyan-300 underline">price discovery</Link>.</li>
        </ol>
        <Link href="/sniper" className="mt-6 inline-block rounded border border-cyan-500/50 bg-cyan-950/40 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-900/40">Open Sniper paper trading →</Link>
        <p className="mt-3 text-xs text-slate-500">Practice uses simulated funds. No order is sent to a venue.</p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Course catalog</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{classes.map(course => <article key={course.id} id={`course-${course.id}`} className="scroll-mt-24 rounded border border-slate-800 bg-[#0b0f15] p-4"><p className="text-xs font-mono text-cyan-400">Level {course.level}</p><h3 className="mt-2 text-sm font-semibold text-slate-200">{course.name}</h3></article>)}</div>
      </section>

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
    </div>
  );
}
