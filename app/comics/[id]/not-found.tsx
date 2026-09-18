import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Search } from "lucide-react";

export default function ComicNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center font-mono">
      <div className="max-w-md rounded-xl border border-graphite-700 bg-graphite-900/90 p-8 space-y-6 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-graphite-800 text-copper-400 border border-graphite-700">
          <FileQuestion className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-chalk uppercase">
            COMIC RECORD NOT FOUND
          </h2>
          <p className="text-xs text-graphite-300 font-sans leading-relaxed">
            The requested comic record ID does not exist in the authoritative
            Panel Profits Clean database of 3,481,445 comics.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/comics" className="w-full sm:w-auto">
            <Button size="default" className="w-full gap-2 text-xs">
              <Search className="h-3.5 w-3.5" />
              <span>SEARCH CATALOG</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
