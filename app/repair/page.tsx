import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getPlayerEntryPath } from "@/lib/account/queries";

export const dynamic = "force-dynamic";

export default async function RepairPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?returnTo=/repair");
  if (await getPlayerEntryPath() !== "/repair") redirect(await getPlayerEntryPath());

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-5 py-12 sm:px-8">
      <section className="w-full border border-rose-500/40 bg-[#120e12] p-7 sm:p-10">
        <p className="text-[10px] uppercase tracking-[0.28em] text-rose-300">Player state repair</p>
        <h1 className="mt-4 text-3xl text-slate-100">Your account needs attention before entry.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">The account reports completed setup, but its player identity is incomplete. No game state was assumed. Return to onboarding to repair the profile safely.</p>
        <Link href="/onboarding" className="mt-8 inline-flex border border-rose-300/70 px-4 py-2 text-xs text-rose-200 hover:bg-rose-300 hover:text-slate-950">Resume setup</Link>
      </section>
    </main>
  );
}