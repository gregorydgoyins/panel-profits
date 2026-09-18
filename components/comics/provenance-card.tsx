import { ComicRecord } from "@/lib/comics/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, GitCommit, FileCode, CheckCircle2 } from "lucide-react";

interface ProvenanceCardProps {
  comic: ComicRecord;
}

export function ProvenanceCard({ comic }: ProvenanceCardProps) {
  const ppDataCount = comic.panel_profits_data ? Object.keys(comic.panel_profits_data).length : 0;
  const cbDataCount = comic.comicbase_data ? Object.keys(comic.comicbase_data).length : 0;
  const gcdDataCount = comic.gcd_data ? Object.keys(comic.gcd_data).length : 0;

  return (
    <Card className="border-graphite-700 bg-graphite-900/90 shadow-lg">
      <CardHeader className="pb-3 border-b border-graphite-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cobalt-400" />
            <CardTitle className="text-sm uppercase tracking-wider font-mono">
              PROVENANCE & SOURCE REGISTRY
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">
            AUTHORITATIVE RECORD
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 font-mono text-xs">
        {/* Source Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Panel Profits Source */}
          <div className="rounded border border-graphite-800 bg-graphite-950 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-cobalt-300 text-[11px]">PANEL PROFITS</span>
              <Badge variant={comic.pp_source_id ? "default" : "outline"} className="text-[8px]">
                {comic.pp_source_id ? "CONNECTED" : "UNLINKED"}
              </Badge>
            </div>
            <div className="text-[10px] space-y-1 text-graphite-400">
              <div><span className="text-graphite-500">ID:</span> <span className="text-chalk">{comic.pp_source_id || "—"}</span></div>
              <div><span className="text-graphite-500">PAYLOAD KEYS:</span> <span className="text-chalk">{ppDataCount}</span></div>
            </div>
          </div>

          {/* ComicBase Source */}
          <div className="rounded border border-graphite-800 bg-graphite-950 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-graphite-200 text-[11px]">COMICBASE</span>
              <Badge variant={comic.comicbase_source_id ? "secondary" : "outline"} className="text-[8px]">
                {comic.comicbase_source_id ? "CONNECTED" : "UNLINKED"}
              </Badge>
            </div>
            <div className="text-[10px] space-y-1 text-graphite-400">
              <div><span className="text-graphite-500">ID:</span> <span className="text-chalk">{comic.comicbase_source_id || "—"}</span></div>
              <div><span className="text-graphite-500">PAYLOAD KEYS:</span> <span className="text-chalk">{cbDataCount}</span></div>
            </div>
          </div>

          {/* Grand Comics Database (GCD) */}
          <div className="rounded border border-graphite-800 bg-graphite-950 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-plum-300 text-[11px]">GCD</span>
              <Badge variant={comic.gcd_source_id ? "plum" : "outline"} className="text-[8px]">
                {comic.gcd_source_id ? "CONNECTED" : "UNLINKED"}
              </Badge>
            </div>
            <div className="text-[10px] space-y-1 text-graphite-400">
              <div><span className="text-graphite-500">ID:</span> <span className="text-chalk">{comic.gcd_source_id || "—"}</span></div>
              <div><span className="text-graphite-500">PAYLOAD KEYS:</span> <span className="text-chalk">{gcdDataCount}</span></div>
            </div>
          </div>
        </div>

        {/* Technical Identification Details */}
        <div className="rounded border border-graphite-800 bg-graphite-950 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-graphite-500">RECORD UUID:</span>{" "}
              <span className="font-mono text-chalk break-all">{comic.id}</span>
            </div>
            <div>
              <span className="text-graphite-500">PRIMARY UPC:</span>{" "}
              <span className="font-mono text-chalk">{comic.upc || "—"}</span>
            </div>
            <div>
              <span className="text-graphite-500">ALT UPC:</span>{" "}
              <span className="font-mono text-chalk">{comic.alt_upc || "—"}</span>
            </div>
            <div>
              <span className="text-graphite-500">RECORD CREATED:</span>{" "}
              <span className="font-mono text-chalk">{comic.created_at || "—"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
