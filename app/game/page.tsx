import { redirect } from "next/navigation";
import { GameShell } from "@/components/game/game-shell";
import { getCurrentUser, getPlayerEntryPath, getUserProfile } from "@/lib/account/queries";

export const dynamic = "force-dynamic";

export default async function GamePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?returnTo=/game");
  const entryPath = await getPlayerEntryPath();
  if (entryPath !== "/game") redirect(entryPath);
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");
  return <GameShell profile={profile} />;
}