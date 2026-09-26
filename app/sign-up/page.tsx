import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getCurrentUser, getPlayerEntryPath } from "@/lib/account/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Create Account | Panel Profits",
  description: "Create an account to track your personal comic collection and market watchlist.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    const returnTo = params.returnTo || await getPlayerEntryPath();
    const safeReturn = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : await getPlayerEntryPath();
    redirect(safeReturn);
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-xs text-slate-400">Loading sign up...</div>}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
