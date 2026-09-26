import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getCurrentUser, getPlayerEntryPath, getUserProfile } from "@/lib/account/queries";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?returnTo=/onboarding");

  const entryPath = await getPlayerEntryPath();
  if (entryPath === "/game") redirect("/game");
  if (entryPath === "/repair") redirect("/repair");

  const profile = await getUserProfile();
  return <main className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:py-20"><OnboardingFlow initialName={profile?.display_name || user.email?.split("@")[0] || ""} /></main>;
}