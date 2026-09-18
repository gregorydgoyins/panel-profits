import { ComicRecord } from "@/lib/comics/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";

interface ProvenanceCardProps {
  comic: ComicRecord;
}

export function ProvenanceCard({ comic }: ProvenanceCardProps) {
  const ppDataCount = comic.panel_profits_data ? Object.keys(comic.panel_profits_data).length : 0;
  const cbDataCount = comic.comicbase_data ? Object.keys(comic.comicbase_data).length : 0;
  const gcdDataCount = comic.gcd_data ? Object.keys(comic.gcd_data).length : 0;

  return (
    <Card className="research-rimlight-hover bg-[#111319] shadow-lg">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-pink-400" />
            <CardTitle className="text-sm uppercase tracking-wider">
              PROVENANCE & SOURCE REGISTRY
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">
            AUTHORITATIVE RECORD
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 text-xs">
        {/* Source Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Panel Profits Source */}
          <div className="trading-rimlight-hover rounded bg-[#0A0A0C] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-blue-300 text-[11px]">PANEL PROFITS</span>
              <Badge variant={comic.pp_source_id ? "default" : "outline"} className="text-[8px]">
                {comic.pp_source_id ? "CONNECTED" : "UNLINKED"}
              </Badge>
            </div>
            <div className="text-[10px] space-y-1 text-slate-400">
              <div><span className="text-slate-500">ID:</span> <span className="text-slate-200">{comic.pp_source_id || "—"}</span></div>
              <div><span className="text-slate-500">PAYLOAD KEYS:</span> <span className="text-slate-200">{ppDataCount}</span></div>
            </div>
          </div>

          {/* ComicBase Source */}
          <div className="portfolio-rimlight-hover rounded bg-[#0A0A0C] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-amber-300 text-[11px]">COMICBASE</span>
              <Badge variant={comic.comicbase_source_id ? "secondary" : "outline"} className="text-[8px]">
                {comic.comicbase_source_id ? "CONNECTED" : "UNLINKED"}
              </Badge>
            </div>
            <div className="text-[10px] space-y-1 text-slate-400">
              <div><span className="text-slate-500">ID:</span> <span className="text-slate-200">{comic.comicbase_source_id || "—"}</span></div>
              <div><span className="text-slate-500">PAYLOAD KEYS:</span> <span className="text-slate-200">{cbDataCount}</span></div>
            </div>
          </div>

          {/* Grand Comics Database (GCD) */}
          <div className="dashboard-rimlight-hover rounded bg-[#0A0A0C] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-purple-300 text-[11px]">GCD</span>
              <Badge variant={comic.gcd_source_id ? "plum" : "outline"} className="text-[8px]">
                {comic.gcd_source_id ? "CONNECTED" : "UNLINKED"}
              </Badge>
            </div>
            <div className="text-[10px] space-y-1 text-slate-400">
              <div><span className="text-slate-500">ID:</span> <span className="text-slate-200">{comic.gcd_source_id || "—"}</span></div>
              <div><span className="text-slate-500">PAYLOAD KEYS:</span> <span className="text-slate-200">{gcdDataCount}</span></div>
            </div>
          </div>
        </div>

        {/* Technical Identification Details */}
        <div className="rounded border border-slate-800 bg-[#0A0A0C] p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500">RECORD UUID:</span>{" "}
              <span className="text-slate-200 break-all">{comic.id}</span>
            </div>
            <div>
              <span className="text-slate-500">PRIMARY UPC:</span>{" "}
              <span className="text-slate-200">{comic.upc || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500">ALT UPC:</span>{" "}
              <span className="text-slate-200">{comic.alt_upc || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500">RECORD CREATED:</span>{" "}
              <span className="text-slate-200">{comic.created_at || "—"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
