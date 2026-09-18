"use client";

import * as React from "react";
import { signOutAction } from "@/lib/account/actions";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const [isPending, startTransition] = React.useTransition();

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          await signOutAction();
        });
      }}
      disabled={isPending}
      title="Sign Out"
      aria-label="Sign Out"
      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors px-2 py-1 rounded border border-transparent hover:border-rose-900/50 hover:bg-rose-950/20"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span className="hidden md:inline">Sign Out</span>
    </button>
  );
}
