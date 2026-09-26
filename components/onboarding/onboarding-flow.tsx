"use client";

import { useState } from "react";
import { ArrowRight, Check, Compass, Loader2, UserRound } from "lucide-react";
import { completeOnboardingAction } from "@/lib/account/actions";

const stages = ["Identity", "Orientation", "Ready"];

export function OnboardingFlow({ initialName }: { initialName: string }) {
  const [stage, setStage] = useState(0);
  const [displayName, setDisplayName] = useState(initialName);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function finish() {
    setError("");
    setSaving(true);
    const formData = new FormData();
    formData.set("displayName", displayName);
    const result = await completeOnboardingAction(formData);
    if (result?.error) {
      setError(result.error);
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <aside className="border-l border-cyan-400/60 pl-6 lg:pt-12">
        <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300">Player entry / 01</p>
        <h1 className="mt-4 max-w-sm text-4xl leading-tight text-slate-100 sm:text-5xl">Enter the market with intent.</h1>
        <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">Panel Profits is a living market. Your account is the starting point for the decisions, holdings, and opportunities you will encounter.</p>
        <div className="mt-10 space-y-3 text-xs text-slate-500">
          {stages.map((item, index) => (
            <div key={item} className={`flex items-center gap-3 ${index <= stage ? "text-slate-200" : ""}`}>
              <span className={`flex h-6 w-6 items-center justify-center border ${index < stage ? "border-emerald-400 text-emerald-300" : index === stage ? "border-cyan-300 text-cyan-200" : "border-slate-700"}`}>
                {index < stage ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              {item}
            </div>
          ))}
        </div>
      </aside>

      <section className="border border-slate-800 bg-[#0d1118] p-6 shadow-2xl sm:p-10">
        {stage === 0 && (
          <div>
            <UserRound className="h-6 w-6 text-cyan-300" />
            <p className="mt-8 text-[10px] uppercase tracking-[0.24em] text-slate-500">Who are you?</p>
            <h2 className="mt-2 text-2xl text-slate-100">Set your market name</h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">This is how the platform will identify you. You can change it later from your account.</p>
            <label className="mt-8 block text-xs uppercase tracking-widest text-slate-400" htmlFor="display-name">Display name</label>
            <input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-2 w-full border border-slate-700 bg-[#090c12] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300" placeholder="Your market name" />
          </div>
        )}
        {stage === 1 && (
          <div>
            <Compass className="h-6 w-6 text-amber-300" />
            <p className="mt-8 text-[10px] uppercase tracking-[0.24em] text-slate-500">What happens next?</p>
            <h2 className="mt-2 text-2xl text-slate-100">Read the market before you move</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-400">Your account opens with a private collection, watchlist, and the authoritative comic market. The game will reveal decisions as the live systems become available. Nothing hidden is assigned to you here.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[["Observe", "Read signals"], ["Research", "Build conviction"], ["Act", "Make a move"]].map(([title, copy]) => <div key={title} className="border border-slate-800 p-4"><p className="text-sm text-slate-200">{title}</p><p className="mt-2 text-xs text-slate-500">{copy}</p></div>)}
            </div>
          </div>
        )}
        {stage === 2 && (
          <div>
            <Check className="h-6 w-6 text-emerald-300" />
            <p className="mt-8 text-[10px] uppercase tracking-[0.24em] text-slate-500">Ready to play</p>
            <h2 className="mt-2 text-2xl text-slate-100">Your account is ready, {displayName || "operator"}.</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-400">Your private market workspace is prepared. Enter the shell to see your account context and connect with the live systems as they become available.</p>
          </div>
        )}
        {error && <p className="mt-6 border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">{error}</p>}
        <div className="mt-10 flex justify-end gap-3">
          {stage > 0 && <button type="button" onClick={() => setStage((current) => current - 1)} className="border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:border-slate-500">Back</button>}
          {stage < 2 ? <button type="button" onClick={() => setStage((current) => current + 1)} className="flex items-center gap-2 bg-cyan-300 px-4 py-2 text-xs text-slate-950 hover:bg-cyan-200">Continue <ArrowRight className="h-3.5 w-3.5" /></button> : <button type="button" onClick={finish} disabled={saving} className="flex items-center gap-2 bg-emerald-300 px-4 py-2 text-xs text-slate-950 hover:bg-emerald-200">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Enter the game</button>}
        </div>
      </section>
    </div>
  );
}