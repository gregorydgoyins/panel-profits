"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUpWithEmail } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export function SignUpForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("displayName", displayName);
      formData.set("email", email);
      formData.set("password", password);
      formData.set("returnTo", returnTo);

      const result = await signUpWithEmail(formData);
      if (result?.error) {
        setErrorMessage(result.error);
        setLoading(false);
      } else if (result?.success && result?.message) {
        setSuccessMessage(result.message);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };


  return (
    <div className="w-full max-w-md rounded-lg border border-purple-500/40 bg-[#0E1017] p-6 shadow-2xl dashboard-rimlight-hover">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-light tracking-wide text-slate-100">
          Create Your Account
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Create an account to track your holdings and watchlist.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 flex items-start gap-2.5 rounded border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-start gap-2.5 rounded border border-emerald-500/40 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Sign Up Form */}
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-300 mb-1">Display Name</label>
          <Input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            placeholder="John Doe"
            className="border-slate-800 bg-[#12151F] text-slate-100 text-xs focus:border-purple-500"
          />
        </div>

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
            placeholder="•••••••• (min 6 characters)"
            className="border-slate-800 bg-[#12151F] text-slate-100 text-xs focus:border-purple-500"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs py-2 transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Account...
            </span>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-400">
        Already have an account?{" "}
        <Link
          href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
          className="text-purple-400 hover:text-purple-300 transition-colors"
        >
          Sign In
        </Link>
      </div>
      <p className="mt-5 border-t border-slate-800 pt-4 text-center text-xs text-slate-400">
        Want to look around? <Link href="/" className="text-purple-400 hover:text-purple-300">Enter as a visitor</Link>.
      </p>
    </div>
  );
}
