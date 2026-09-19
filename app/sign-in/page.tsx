import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getCurrentUser } from "@/lib/account/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign In | Panel Profits",
  description: "Sign in to access your comic holdings, collection valuation, and personal watchlist.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    const returnTo = params.returnTo || "/";
    const safeReturn = returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.startsWith("/\\") ? returnTo : "/";
    redirect(safeReturn);
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-xs text-slate-400">Loading sign in...</div>}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
