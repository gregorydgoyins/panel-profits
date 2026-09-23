"use client";

import * as React from "react";
import Image from "next/image";
import { ImageOff, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComicCoverProps {
  coverUrl?: string | null;
  storagePath?: string | null;
  series: string;
  issueNumber: string;
  publisher?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "full";
  priority?: boolean;
}

export function ComicCover({
  coverUrl,
  storagePath,
  series,
  issueNumber,
  publisher,
  className,
  size = "md",
  priority = false,
}: ComicCoverProps) {
  const [hasError, setHasError] = React.useState(false);

  // Determine the Clean image URL
  const resolvedUrl = React.useMemo(() => {
    if (coverUrl && coverUrl.trim().length > 0) {
      return coverUrl.trim();
    }
    if (storagePath && storagePath.trim().length > 0) {
      const baseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        "https://vbcmjmakluyjnsmisoth.supabase.co";
      return `${baseUrl}/storage/v1/object/public/${storagePath.trim()}`;
    }
    return null;
  }, [coverUrl, storagePath]);

  const sizeClasses = {
    sm: "aspect-[2/3] w-20 min-w-[5rem]",
    md: "aspect-[2/3] w-full",
    lg: "aspect-[2/3] w-64 max-w-full",
    full: "aspect-[2/3] w-full max-w-md mx-auto",
  };

  if (!resolvedUrl || hasError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-between rounded border border-graphite-800 bg-graphite-950 p-4 text-center shadow-inner relative overflow-hidden group select-none",
          sizeClasses[size],
          className
        )}
      >
        {/* Decorative subtle grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#2a2a2e_1px,transparent_1px)] [background-size:12px_12px] opacity-40 pointer-events-none" />

        <div className="z-10 flex w-full justify-between items-center text-[10px] text-graphite-500 uppercase tracking-widest border-b border-graphite-900 pb-1.5">
          <span>{publisher || "INDEXED"}</span>
          <span>#{issueNumber || "—"}</span>
        </div>

        <div className="z-10 my-auto flex flex-col items-center gap-2 p-2">
          <div className="rounded-full bg-graphite-900 p-2.5 border border-graphite-800 text-graphite-400">
            <BookOpen className="h-5 w-5 text-graphite-400" />
          </div>
          <span className="text-xs text-chalk line-clamp-2 px-1">
            {series}
          </span>
          <span className="text-[10px] text-graphite-400">
            ISSUE #{issueNumber}
          </span>
        </div>

        <div className="z-10 flex w-full items-center justify-center gap-1.5 border-t border-graphite-900 pt-1.5 text-[9px] text-graphite-400 uppercase tracking-wider">
          <ImageOff className="h-3 w-3 text-graphite-400" />
          <span>COVER IN MIGRATION</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded border border-graphite-800 bg-graphite-950 shadow-md group",
        sizeClasses[size],
        className
      )}
    >
      <Image
        src={resolvedUrl}
        alt={`${series} #${issueNumber}`}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        priority={priority}
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
