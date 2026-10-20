import { NextRequest, NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GCS_BUCKET_BASE = "https://storage.googleapis.com/panel-profits-covers-all";

const ALLOWED_TABLES = new Set([
  "rail_books",
  "comics",
  "cgc_population",
  "psa_population",
  "sniper_listings",
  "sniper_sales",
  "gocollect_books",
  "gocollect_prices",
  "pp_series_rows",
  "pp_series_rows_full",
  "graded_sales_observations",
]);

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, MCP-Protocol-Version",
};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function encodeGcsKeyToUrl(key: string): string {
  const encodedPath = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${GCS_BUCKET_BASE}/${encodedPath}`;
}

function letterFolderFor(name: string): string {
  const trimmed = name.trim().replace(/^the\s+/i, "");
  const first = trimmed.charAt(0).toUpperCase();
  if (first >= "A" && first <= "Z") return first;
  return "#";
}

function candidateSeriesFolders(series: string): string[] {
  const trimmed = series.trim();
  const out = new Set<string>([trimmed]);
  if (/^the\s+/i.test(trimmed)) {
    const withoutThe = trimmed.replace(/^the\s+/i, "").trim();
    out.add(`${withoutThe}, The`);
    out.add(withoutThe);
  } else if (!/,\s*the$/i.test(trimmed)) {
    out.add(`${trimmed}, The`);
  }
  return Array.from(out);
}

interface GcsListResult {
  bucket: string;
  prefix: string;
  delimiter: string;
  prefixes: string[];
  files: Array<{
    key: string;
    url: string;
    size_bytes: number;
    generation: string;
  }>;
  is_truncated: boolean;
  next_marker: string | null;
}

async function listGcsBucket(params: {
  prefix?: string;
  delimiter?: string;
  max_keys?: number;
  marker?: string;
}): Promise<GcsListResult> {
  const prefix = params.prefix ?? "Pictures/";
  const delimiter = params.delimiter ?? "/";
  const maxKeys = Math.min(Math.max(Number(params.max_keys ?? 100), 1), 1000);
  const qs = new URLSearchParams();
  if (prefix) qs.set("prefix", prefix);
  if (delimiter) qs.set("delimiter", delimiter);
  qs.set("max-keys", String(maxKeys));
  if (params.marker) qs.set("marker", params.marker);

  const url = `${GCS_BUCKET_BASE}/?${qs.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`GCS list returned HTTP ${res.status} for ${url}`);
  }
  const xml = await res.text();

  const prefixes: string[] = [];
  for (const m of xml.matchAll(/<CommonPrefixes><Prefix>([^<]+)<\/Prefix><\/CommonPrefixes>/g)) {
    prefixes.push(decodeXmlEntities(m[1]));
  }

  const files: GcsListResult["files"] = [];
  for (const m of xml.matchAll(
    /<Contents><Key>([^<]+)<\/Key><Generation>(\d+)<\/Generation>.*?<Size>(\d+)<\/Size><\/Contents>/gs
  )) {
    const key = decodeXmlEntities(m[1]);
    files.push({
      key,
      url: encodeGcsKeyToUrl(key),
      size_bytes: Number.parseInt(m[3], 10),
      generation: m[2],
    });
  }

  const isTruncated = xml.includes("<IsTruncated>true</IsTruncated>");
  const nextMarkerMatch = xml.match(/<NextMarker>([^<]+)<\/NextMarker>/);
  const nextMarker = nextMarkerMatch ? decodeXmlEntities(nextMarkerMatch[1]) : null;

  return {
    bucket: "gs://panel-profits-covers-all",
    prefix,
    delimiter,
    prefixes,
    files,
    is_truncated: isTruncated,
    next_marker: nextMarker,
  };
}

async function getComicCoverUrl(params: {
  publisher: string;
  series: string;
  issue?: string;
}) {
  const publisher = params.publisher.trim();
  const series = params.series.trim();
  const issue = params.issue?.trim().replace(/^#/, "");
  const pubLetter = letterFolderFor(publisher);
  const serLetter = letterFolderFor(series);
  const seriesFolders = candidateSeriesFolders(series);

  const triedPrefixes: string[] = [];
  const matches: Array<{
    key: string;
    url: string;
    size_bytes: number;
    generation: string;
  }> = [];

  for (const folder of seriesFolders) {
    const prefix = issue
      ? `Pictures/${pubLetter}/${publisher}/${serLetter}/${folder}/${issue}`
      : `Pictures/${pubLetter}/${publisher}/${serLetter}/${folder}/`;
    triedPrefixes.push(prefix);
    const list = await listGcsBucket({
      prefix,
      delimiter: "",
      max_keys: 100,
    });
    for (const file of list.files) {
      if (!issue) {
        matches.push(file);
      } else {
        const baseName = file.key.split("/").pop() ?? "";
        const normalizedIssue = issue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const issuePattern = new RegExp(`^${normalizedIssue}(?:[-_a-zA-Z0-9]*)?\\.(?:jpg|jpeg|webp|png)$`, "i");
        if (issuePattern.test(baseName)) {
          matches.push(file);
        }
      }
    }
    if (matches.length > 0) break;
  }

  return {
    publisher,
    series,
    issue: issue ?? null,
    tried_prefixes: triedPrefixes,
    count: matches.length,
    covers: matches,
  };
}

async function querySupabaseTable(params: {
  table: string;
  select?: string;
  eq?: Record<string, string | number | boolean>;
  ilike?: Record<string, string>;
  order_by?: string;
  ascending?: boolean;
  limit?: number;
}) {
  const table = params.table.trim();
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(
      `Table "${table}" is not in allowed list: ${Array.from(ALLOWED_TABLES).join(", ")}`
    );
  }
  const supabase = createAdminServerClient();
  const limit = Math.min(Math.max(Number(params.limit ?? 25), 1), 100);
  let query = supabase.from(table).select(params.select || "*").limit(limit);

  if (params.eq && typeof params.eq === "object") {
    for (const [col, val] of Object.entries(params.eq)) {
      query = query.eq(col, val);
    }
  }
  if (params.ilike && typeof params.ilike === "object") {
    for (const [col, pattern] of Object.entries(params.ilike)) {
      query = query.ilike(col, pattern);
    }
  }
  if (params.order_by) {
    query = query.order(params.order_by, { ascending: Boolean(params.ascending) });
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Supabase query error on ${table}: ${error.message}`);
  }
  return {
    table,
    count: data?.length ?? 0,
    rows: data ?? [],
  };
}

async function lookupCensus(params: {
  grader?: string;
  title: string;
  issue?: string;
  issue_date?: string;
  variant?: string;
  limit?: number;
}) {
  const grader = (params.grader ?? "CGC").toUpperCase();
  const supabase = createAdminServerClient();
  const limit = Math.min(Math.max(Number(params.limit ?? 25), 1), 100);

  if (grader === "PSA") {
    let q = supabase
      .from("psa_population")
      .select("*")
      .ilike("series_name", `%${params.title.trim()}%`)
      .limit(limit);
    if (params.issue) {
      q = q.eq("issue_number", params.issue.trim().replace(/^#/, ""));
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { grader: "PSA", count: data?.length ?? 0, rows: data ?? [] };
  }

  let q = supabase
    .from("cgc_population")
    .select("*")
    .ilike("title", `%${params.title.trim()}%`)
    .limit(limit);
  if (params.issue) {
    q = q.eq("issue_number", params.issue.trim().replace(/^#/, ""));
  }
  if (params.issue_date) {
    q = q.ilike("issue_date", `%${params.issue_date.trim()}%`);
  }
  if (params.variant) {
    q = q.ilike("variant", `%${params.variant.trim()}%`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { grader: "CGC", count: data?.length ?? 0, rows: data ?? [] };
}

async function runConnectorSearch(query: string) {
  const q = query.trim();
  if (q.startsWith("Pictures/")) {
    const gcs = await listGcsBucket({ prefix: q, delimiter: "", max_keys: 25 });
    return {
      results: gcs.files.map((f) => ({
        id: `gcs:${f.key}`,
        title: f.key,
        text: `Google Cloud Cover (${f.size_bytes} bytes): ${f.url}`,
        url: f.url,
      })),
    };
  }

  const supabase = createAdminServerClient();
  const issueMatch = q.match(/^(.*?)\s*#([0-9a-zA-Z.-]+)$/);
  const seriesQuery = issueMatch ? issueMatch[1].trim() : q;
  const issueQuery = issueMatch ? issueMatch[2].trim() : null;

  let railQ = supabase
    .from("rail_books")
    .select(
      "comics_id, series, issue_number, year, publisher, edition_form, printing, variant_label, cover_url, pp_id, cb_price, cgc_total"
    )
    .ilike("series", `%${seriesQuery}%`)
    .limit(20);
  if (issueQuery) {
    railQ = railQ.eq("issue_number", issueQuery);
  }

  const { data: railRows } = await railQ;
  const results = (railRows ?? []).map((row: Record<string, any>) => ({
    id: `rail:${row.comics_id}`,
    title: `${row.series} #${row.issue_number} (${row.year ?? "N/A"}) [${row.edition_form ?? "DIRECT"}${row.variant_label ? ` - ${row.variant_label}` : ""}]`,
    text: `Publisher: ${row.publisher ?? "Unknown"} | Price: $${row.cb_price ?? "N/A"} | CGC Total: ${row.cgc_total ?? "N/A"} | Cover: ${row.cover_url ?? "None"}`,
    url: row.cover_url || `https://comicbookstockexchange.com/sniper`,
  }));

  return { results };
}

async function runConnectorFetch(id: string) {
  if (id.startsWith("gcs:")) {
    const key = id.slice(4);
    const url = encodeGcsKeyToUrl(key);
    return {
      id,
      title: key,
      text: JSON.stringify({ key, url, bucket: "gs://panel-profits-covers-all" }, null, 2),
      url,
      metadata: { source: "gcs", key },
    };
  }

  const comicsId = id.startsWith("rail:") ? id.slice(5) : id;
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("rail_books")
    .select("*")
    .eq("comics_id", comicsId)
    .maybeSingle();

  return {
    id,
    title: data ? `${data.series} #${data.issue_number} (${data.year ?? ""})` : id,
    text: JSON.stringify(data ?? { error: "Not found" }, null, 2),
    url: data?.cover_url || `https://comicbookstockexchange.com/sniper`,
    metadata: { source: "supabase.rail_books" },
  };
}

const MCP_TOOLS = [
  {
    name: "list_gcs_covers",
    description:
      "Browse and list folders or comic cover images directly from the Google Cloud Storage bucket gs://panel-profits-covers-all/Pictures/ (1,106,539 covers from # to Z, organized as Pictures/<PublisherLetter>/<Publisher>/<SeriesLetter>/<Series>/<Issue>.jpg).",
    inputSchema: {
      type: "object",
      properties: {
        prefix: {
          type: "string",
          description:
            "Folder or key prefix in the bucket, e.g. 'Pictures/', 'Pictures/M/Marvel/', 'Pictures/M/Marvel/A/Amazing Spider-Man, The/', or 'Pictures/D/DC/B/Batman/'.",
        },
        delimiter: {
          type: "string",
          description: "Use '/' to list immediate subfolders and files, or '' to list all files recursively under the prefix.",
        },
        max_keys: {
          type: "number",
          description: "Maximum number of keys to return (1–1000, default 100).",
        },
        marker: {
          type: "string",
          description: "Optional pagination marker from a previous call's next_marker.",
        },
      },
    },
  },
  {
    name: "get_comic_cover_url",
    description:
      "Resolve and verify the exact public Google Cloud Storage cover URL(s) in gs://panel-profits-covers-all/Pictures/ for a comic by publisher, series, and optional issue number.",
    inputSchema: {
      type: "object",
      properties: {
        publisher: {
          type: "string",
          description: "Publisher folder name in ComicBase format, e.g. 'Marvel', 'DC', 'Image', 'Dark Horse', 'Valiant'.",
        },
        series: {
          type: "string",
          description: "Series title, e.g. 'Amazing Spider-Man', 'Amazing Spider-Man, The', 'Batman', 'Spawn'.",
        },
        issue: {
          type: "string",
          description: "Optional issue number (e.g. '300', '1', '181'). Omit to list covers in the series folder.",
        },
      },
      required: ["publisher", "series"],
    },
  },
  {
    name: "query_supabase",
    description:
      "Run a read-only query against Panel Profits Supabase tables (rail_books, comics, cgc_population, psa_population, sniper_listings, sniper_sales, gocollect_books, gocollect_prices, pp_series_rows, pp_series_rows_full, graded_sales_observations).",
    inputSchema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Supabase table name to query.",
        },
        select: {
          type: "string",
          description: "Comma-separated columns to select (default '*').",
        },
        eq: {
          type: "object",
          description: "Exact-match filters as { column: value }.",
        },
        ilike: {
          type: "object",
          description: "Case-insensitive pattern filters as { column: '%pattern%' }.",
        },
        order_by: {
          type: "string",
          description: "Column name to sort by.",
        },
        ascending: {
          type: "boolean",
          description: "Sort ascending if true, descending if false (default false).",
        },
        limit: {
          type: "number",
          description: "Maximum rows to return (1–100, default 25).",
        },
      },
      required: ["table"],
    },
  },
  {
    name: "lookup_census",
    description:
      "Look up CGC (cgc_population, 401,540 rows) or PSA (psa_population, 11,122 rows) graded population census counts by title, issue, issue_date, and variant.",
    inputSchema: {
      type: "object",
      properties: {
        grader: {
          type: "string",
          enum: ["CGC", "PSA"],
          description: "Grading company census table ('CGC' or 'PSA', default 'CGC').",
        },
        title: {
          type: "string",
          description: "Comic series title, e.g. 'Amazing Spider-Man'.",
        },
        issue: {
          type: "string",
          description: "Issue number, e.g. '300'.",
        },
        issue_date: {
          type: "string",
          description: "Optional cover date or year filter (for CGC).",
        },
        variant: {
          type: "string",
          description: "Optional variant / edition filter (for CGC).",
        },
        limit: {
          type: "number",
          description: "Max rows to return (default 25).",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "search",
    description:
      "Search across Panel Profits comics, covers, and GCS bucket paths (Pictures/...). Standard connector search tool for ChatGPT.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query, e.g. 'Amazing Spider-Man #300' or 'Pictures/M/Marvel/'.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "fetch",
    description:
      "Fetch full details and cover URLs for a result ID returned by search (e.g. 'rail:...' or 'gcs:...').",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Result ID from search.",
        },
      },
      required: ["id"],
    },
  },
];

async function handleJsonRpcMessage(msg: any): Promise<any | null> {
  const { jsonrpc = "2.0", id, method, params = {} } = msg ?? {};

  // Notifications have no `id` and expect no response object in JSON-RPC
  if (id === undefined || id === null) {
    return null;
  }

  try {
    switch (method) {
      case "initialize": {
        const clientVersion =
          typeof params?.protocolVersion === "string" ? params.protocolVersion : "2025-03-26";
        return {
          jsonrpc,
          id,
          result: {
            protocolVersion: clientVersion,
            capabilities: {
              tools: { listChanged: false },
              resources: { listChanged: false },
            },
            serverInfo: {
              name: "panel-profits-cloud-mcp",
              version: "1.0.0",
            },
          },
        };
      }

      case "ping":
        return { jsonrpc, id, result: {} };

      case "tools/list":
        return {
          jsonrpc,
          id,
          result: {
            tools: MCP_TOOLS,
          },
        };

      case "resources/list":
        return {
          jsonrpc,
          id,
          result: {
            resources: [
              {
                uri: "gcs://panel-profits-covers-all/Pictures/",
                name: "Panel Profits 1.1M Comic Covers Bucket (# through Z)",
                mimeType: "application/json",
                description:
                  "Public Google Cloud Storage bucket containing 1,106,539 ComicBase cover JPEGs organized under Pictures/<PublisherLetter>/<Publisher>/<SeriesLetter>/<Series>/<Issue>.jpg",
              },
            ],
          },
        };

      case "resources/read": {
        const uri = String(params?.uri ?? "gcs://panel-profits-covers-all/Pictures/");
        const prefix = uri.replace(/^gcs:\/\/panel-profits-covers-all\//, "") || "Pictures/";
        const listing = await listGcsBucket({ prefix, delimiter: "/", max_keys: 100 });
        return {
          jsonrpc,
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(listing, null, 2),
              },
            ],
          },
        };
      }

      case "prompts/list":
        return { jsonrpc, id, result: { prompts: [] } };

      case "tools/call": {
        const toolName = String(params?.name ?? "");
        const args = params?.arguments ?? {};
        let toolResult: unknown;

        if (toolName === "list_gcs_covers") {
          toolResult = await listGcsBucket(args);
        } else if (toolName === "get_comic_cover_url") {
          toolResult = await getComicCoverUrl(args);
        } else if (toolName === "query_supabase") {
          toolResult = await querySupabaseTable(args);
        } else if (toolName === "lookup_census") {
          toolResult = await lookupCensus(args);
        } else if (toolName === "search") {
          toolResult = await runConnectorSearch(String(args.query ?? ""));
        } else if (toolName === "fetch") {
          toolResult = await runConnectorFetch(String(args.id ?? ""));
        } else {
          return {
            jsonrpc,
            id,
            error: {
              code: -32601,
              message: `Unknown tool: ${toolName}`,
            },
          };
        }

        return {
          jsonrpc,
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(toolResult, null, 2),
              },
            ],
          },
        };
      }

      default:
        return {
          jsonrpc,
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
    }
  } catch (err: any) {
    return {
      jsonrpc,
      id,
      error: {
        code: -32000,
        message: err?.message || "Internal MCP execution error",
      },
    };
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function DELETE() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const accept = request.headers.get("accept") || "";
  if (accept.includes("text/event-stream")) {
    const encoder = new TextEncoder();
    const endpointUrl = new URL("/api/mcp", request.url).toString();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpointUrl}\n\n`));
      },
    });
    return new NextResponse(stream, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  return NextResponse.json(
    {
      name: "panel-profits-cloud-mcp",
      version: "1.0.0",
      protocol: "MCP Streamable HTTP (JSON-RPC 2.0)",
      endpoint: "https://comicbookstockexchange.com/api/mcp",
      gcs_bucket: "gs://panel-profits-covers-all/Pictures/",
      tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
    },
    { status: 200, headers: CORS_HEADERS }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (Array.isArray(body)) {
      const responses = (await Promise.all(body.map((msg) => handleJsonRpcMessage(msg)))).filter(
        (r) => r !== null
      );
      if (responses.length === 0) {
        return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
      }
      return NextResponse.json(responses, { status: 200, headers: CORS_HEADERS });
    }

    const response = await handleJsonRpcMessage(body);
    if (response === null) {
      return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
    }

    return NextResponse.json(response, { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: err?.message || "Parse error",
        },
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }
}
