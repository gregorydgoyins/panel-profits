import { redirect } from "next/navigation";
import { getCurrentUser, getUserProfile, getUserCollections, getWatchlistItems } from "@/lib/account/queries";
import { signOutAction } from "@/lib/account/actions";
import { calculateHoldingsSummary } from "@/lib/account/calculations";
import { createServerClient } from "@/lib/supabase/server";
import { CollectionItem } from "@/lib/account/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Layers, Bookmark, ShieldCheck, Mail, Calendar } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Account | Panel Profits",
  description: "Manage your Panel Profits collector profile, collections, and watchlist.",
};

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?returnTo=/account");
  }

  const profile = await getUserProfile();
  const collections = await getUserCollections();
  const watchlist = await getWatchlistItems({ limit: 1 });

  // Get all collection items across user collections to calculate total quantity
  const supabase = await createServerClient();
  const { data: allItems } = await supabase
    .from("collection_items")
    .select("*, comic:comics(*)")
    .eq("user_id", user.id);

  const items = (allItems as CollectionItem[]) || [];
  const holdingsSummary = calculateHoldingsSummary(items);

  const displayName = profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "Collector";
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null;
  const email = user.email || "No email on record";
  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Active";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Account Overview Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-purple-500/60 bg-[#121520] text-purple-400 overflow-hidden shadow-lg dashboard-rimlight-hover">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-light">{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-light tracking-wide text-slate-100">{displayName}</h1>
              <span className="flex items-center gap-1 rounded bg-purple-950/60 px-2 py-0.5 text-[10px] text-purple-300 border border-purple-500/40">
                <ShieldCheck className="h-3 w-3 text-purple-400" />
                VERIFIED COLLECTOR
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                {email}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Member since {memberSince}
              </span>
            </div>
          </div>
        </div>

        <form action={signOutAction}>
          <Button
            type="submit"
            variant="outline"
            className="flex items-center gap-2 border-rose-900/50 bg-rose-950/20 text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 text-xs px-4 py-2 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>

      {/* Account Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <Card className="border-orange-500/40 bg-[#0E1017] shadow-xl dashboard-rimlight-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-slate-400 flex items-center justify-between">
              <span>Collections</span>
              <Layers className="h-4 w-4 text-orange-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-slate-100">{collections.length}</div>
            <p className="mt-1 text-xs text-slate-400">
              {collections.length === 1 ? "1 active collection" : `${collections.length} custom collections`}
            </p>
            <Link
              href="/collection"
              className="mt-3 inline-block text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              View holdings &rarr;
            </Link>
          </CardContent>
        </Card>

        <Card className="border-orange-500/40 bg-[#0E1017] shadow-xl dashboard-rimlight-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-slate-400 flex items-center justify-between">
              <span>Owned Quantity</span>
              <span className="text-[10px] text-orange-400">TOTAL BOOKS</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-slate-100">{holdingsSummary.totalOwnedQuantity}</div>
            <p className="mt-1 text-xs text-slate-400">
              Across {items.length} unique catalog {items.length === 1 ? "issue" : "issues"}
            </p>
            <Link
              href="/collection"
              className="mt-3 inline-block text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              Manage portfolio &rarr;
            </Link>
          </CardContent>
        </Card>

        <Card className="border-pink-500/40 bg-[#0E1017] shadow-xl dashboard-rimlight-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-slate-400 flex items-center justify-between">
              <span>Watchlist</span>
              <Bookmark className="h-4 w-4 text-pink-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-slate-100">{watchlist.totalCount}</div>
            <p className="mt-1 text-xs text-slate-400">Monitored market assets</p>
            <Link
              href="/watchlist"
              className="mt-3 inline-block text-xs text-pink-400 hover:text-pink-300 transition-colors"
            >
              Open watchlist &rarr;
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-800 bg-[#0A0C13] p-5">
          <h2 className="text-sm font-light text-slate-200 mb-2 flex items-center gap-2">
            <Layers className="h-4 w-4 text-orange-400" />
            Active Collections
          </h2>
          <div className="space-y-2">
            {collections.map((col) => (
              <div
                key={col.id}
                className="flex items-center justify-between rounded border border-slate-800/80 bg-[#10131E] p-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-100 font-normal">{col.name}</span>
                    {col.is_default && (
                      <span className="rounded bg-orange-950/60 px-1.5 py-0.5 text-[9px] text-orange-300 border border-orange-500/40">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  {col.description && <p className="text-[11px] text-slate-400 mt-0.5">{col.description}</p>}
                </div>
                <Link
                  href={`/collection?id=${col.id}`}
                  className="text-orange-400 hover:text-orange-300 transition-colors text-xs"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0A0C13] p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-light text-slate-200 mb-2 flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-pink-400" />
              Market Watchlist
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Track real-time baseline values, 9.8 price updates, and market movements for your priority targets without adding them to your physical holdings.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex justify-end">
            <Link
              href="/watchlist"
              className="rounded bg-pink-950/50 hover:bg-pink-900/60 px-4 py-2 text-xs text-pink-300 border border-pink-500/40 transition-colors"
            >
              Go to Watchlist
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
