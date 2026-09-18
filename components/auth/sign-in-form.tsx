"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signInWithEmail } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2 } from "lucide-react";

export function SignInForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/comics";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(urlError || "");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("returnTo", returnTo);

      const result = await signInWithEmail(formData);
      if (result?.error) {
        setErrorMessage(result.error);
        setLoading(false);
      }
    } catch {
      // If Next.js redirect threw, let it navigate
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setOauthLoading(true);

    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setOauthLoading(false);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMessage(e.message || "Failed to initiate Google sign-in");
      setOauthLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-lg border border-purple-500/40 bg-[#0E1017] p-6 shadow-2xl dashboard-rimlight-hover">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-light tracking-wide text-slate-100">
          Sign In to Panel Profits
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Access your personal comic collection, portfolio, and watchlist.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 flex items-start gap-2.5 rounded border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Google OAuth Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={oauthLoading || loading}
        className="w-full flex items-center justify-center gap-2 border-slate-700 bg-[#141722] hover:bg-[#1A1E2C] text-slate-200 text-xs py-2 mb-4"
      >
        {oauthLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        <span>Continue with Google</span>
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase">
          <span className="bg-[#0E1017] px-2 text-slate-500">or sign in with email</span>
        </div>
      </div>

      {/* Email & Password Form */}
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-300 mb-1">Email Address</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="collector@panelprofits.com"
            className="border-slate-800 bg-[#12151F] text-slate-100 text-xs focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-300 mb-1">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="border-slate-800 bg-[#12151F] text-slate-100 text-xs focus:border-purple-500"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || oauthLoading}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs py-2 transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing In...
            </span>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href={`/sign-up?returnTo=${encodeURIComponent(returnTo)}`}
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
