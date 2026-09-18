"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center font-mono">
      <div className="max-w-md rounded-lg border border-red-900/60 bg-red-950/30 p-6 space-y-4 shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-900/40 text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-chalk uppercase tracking-wide">
            CATALOG QUERY ERROR
          </h2>
          <p className="text-xs text-graphite-300 font-sans">
            {error.message || "An unexpected error occurred while executing the catalog query."}
          </p>
        </div>
        <Button
          onClick={() => reset()}
          variant="outline"
          size="sm"
          className="mx-auto flex items-center gap-1.5 border-red-800 text-red-200 hover:bg-red-950"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>RETRY OPERATION</span>
        </Button>
      </div>
    </div>
  );
}
