import { NextResponse } from "next/server";
import { reconcileVerifiedValuation } from "@/lib/sniper/verified-valuation";
import { normalizeAuctionTitle, parseAndFilterListing } from "@/lib/sniper/anti-bullshit";
import { resolveAuthoritativePublisher } from "@/lib/comics/publisher-authority";
import { lookupSqliteCover, lookupSqliteGallery } from "@/lib/comics/sqlite-covers";
import { lookupGoCollectBatch, type GoCollectPrice, type GoCollectQuery } from "@/lib/sniper/gocollect-prices";
import { extractLotBooks, lotBookQueries, priceLotBooks } from "@/lib/sniper/lot-valuation";
import { lookupLabelCensusBatch, lookupGradeCensusBatch, type GradeCensus } from "@/lib/sniper/census-population";
import { readLiveListings } from "@/lib/sniper/market-store";
import { RawAuctionListing } from "@/lib/sniper/types";
import { createAdminServerClient } from "@/lib/supabase/admin";
import { dedupeSales, saleStats, seriesKey, type SaleObs } from "@/lib/sniper/candles";
import { gradeNum, benchmarkSalesForBook, resolveAuctionDbMetadata } from "@/lib/sniper/auction-metadata";
import { filterLiveListings } from "@/lib/sniper/live-listing-normalizer";


const RESP_TTL_MS = 30_000;
const respCache = new Map<string, { at: number; p: Promise<{ status: number; body: string }> }>();

export async function GET(request: Request) {
  const key = new URL(request.url).search;
  const hit = respCache.get(key);
  if (hit && Date.now() - hit.at < RESP_TTL_MS) {
    const r = await hit.p;
    return new Response(r.body, { status: r.status, headers: { "content-type": "application/json", "server-timing": lastTiming, "cache-control": r.status === 200 ? "public, s-maxage=30, stale-while-revalidate=120" : "no-store" } });
  }
  const p = computeGET(request).then(async (res) => { lastTiming = res.headers.get("server-timing") ?? ""; return { status: res.status, body: await res.text() }; });
  respCache.set(key, { at: Date.now(), p });
  p.then((r) => { if (r.status !== 200) respCache.delete(key); }).catch(() => respCache.delete(key));
  if (respCache.size > 50) respCache.delete(respCache.keys().next().value as string);
  const r = await p;
  return new Response(r.body, { status: r.status, headers: { "content-type": "application/json", "server-timing": lastTiming, "cache-control": r.status === 200 ? "public, s-maxage=30, stale-while-revalidate=120" : "no-store" } });
}

let lastTiming = "";
const SALES_TTL_MS = 5 * 60_000;
const salesCache = new Map<string, { at: number; map: Map<string, SaleObs[]> }>();

async function computeGET(request: Request) {
  const tStart = Date.now();
  const marks: string[] = [];
  const mark = (n: string, since: number) => marks.push(`${n};dur=${Date.now() - since}`);
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get("q");
  const sourceFilter = searchParams.get("source");
  const publisherFilter = searchParams.get("publisher");
  const angleFilter = searchParams.get("angle");
  const minGradeParam = searchParams.get("minGrade");
  const minGrade = minGradeParam ? parseFloat(minGradeParam) : 0.5;

  try {
    // Live auctions come from the Sniper store, populated by scheduled snapshots across ComicConnect, Metropolis, Hake's, and eBay.
    const tRead = Date.now();
    let { items: stored, asOf } = await readLiveListings();
    mark("readListings", tRead);
    // Collection runs in the scheduled worker, never in a user-facing GET.
    const combinedAuctions: RawAuctionListing[] = stored;
    const fetchedAtMs = Date.now(); // seconds remaining were computed from each lot's end time just now

    // 4. Apply dynamic filters if query parameters provided
    let filteredAuctions = combinedAuctions;

    // Filter by search query (title or series match)
    if (searchQuery && searchQuery.trim().length > 0) {
      filteredAuctions = filterLiveListings(filteredAuctions, { query: searchQuery });
    }

    // Filter by source (e.g. heritage, mycomicshop, comicconnect, atomicavenue)
    if (sourceFilter && sourceFilter.trim().length > 0) {
      filteredAuctions = filterLiveListings(filteredAuctions, { source: sourceFilter });
    }

    // Filter by publisher (e.g. dc, marvel, image, dark horse, kodansha, viz, lev gleason)
    if (publisherFilter && publisherFilter.trim().length > 0) {
      const pub = publisherFilter.toLowerCase().trim();
      filteredAuctions = filteredAuctions.filter((item) => {
        const itemPub = (item.gcdMetadata?.publisher || "").toLowerCase();
        return itemPub.includes(pub) || String(item.title ?? "").toLowerCase().includes(pub);
      });
    }

    // Filter by special strategy angle
    if (angleFilter && angleFilter.trim().length > 0) {
      const angle = angleFilter.toLowerCase().trim();
      if (angle === "cracked_case" || angle === "reholder") {
        filteredAuctions = filteredAuctions.filter((item) =>
          /crack|scuff|reholder|damaged|shell/i.test(item.title) ||
          /crack|scuff|reholder|damaged|shell/i.test(item.itemDescription || "")
        );
      } else if (angle === "typo" || angle === "misspelled") {
        filteredAuctions = filteredAuctions.filter((item) =>
          /spidre|avenegr|batamn|wovlerine|thng|fantatsic|punsiher|catwman|daredevl/i.test(item.title)
        );
      } else if (angle === "manga") {
        filteredAuctions = filteredAuctions.filter((item) =>
          /akira|dragon ball|one piece|ghost in the shell|nausica[aä]|naruto|bleach|manga/i.test(item.title)
        );
      } else if (angle === "cpv") {
        filteredAuctions = filteredAuctions.filter((item) =>
          /canadian|cpv|75¢|95¢|\$1\.00|alpha flight|captain canuck/i.test(item.title)
        );
      } else if (angle === "foreign") {
        filteredAuctions = filteredAuctions.filter((item) =>
          item.source.includes("ebay_") ||
          /\b(?:french|german|uk\s*edition|editions?\s*lug|special\s*strange|semic|2000\s*ad|captain\s*britain|topolino)\b/i.test(item.title)
        );
      } else if (angle === "placeholder_85") {
        filteredAuctions = filteredAuctions.filter((item) =>
          item.resolvedGrade !== undefined && item.resolvedGrade <= 9.2 && item.resolvedGrade >= 8.5
        );
      }
    }

    // Filter by minimum grade (only if explicitly specified)
    if (minGradeParam && !isNaN(minGrade) && minGrade > 0.5) {
      filteredAuctions = filteredAuctions.filter((item) => {
        if (item.resolvedGrade !== undefined) {
          return item.resolvedGrade >= minGrade;
        }
        const parsed = parseAndFilterListing(item.title);
        return parsed.grade != null && parsed.grade >= minGrade;
      });
    }

    // Filter by listing type (auctions vs buy it now)
    const typeParam = searchParams.get("type");
    if (typeParam === "bin" || typeParam === "buy_it_now") {
      filteredAuctions = filteredAuctions.filter((item) =>
        Boolean(item.isBuyItNow || item.listingType === "BuyItNow")
      );
    } else if (typeParam === "auction" || typeParam === "auctions") {
      filteredAuctions = filteredAuctions.filter((item) =>
        !item.isBuyItNow && item.listingType !== "BuyItNow"
      );
    }

    if (filteredAuctions.length > 0) {
      const tSales = Date.now();
      const salesBySeriesKey = new Map<string, SaleObs[]>();
      try {
        const keys = Array.from(
          new Set(
            filteredAuctions
              .map((it) => {
                const p = parseAndFilterListing(String(it.title || ""));
                return p.extractedSeries && p.extractedSeries !== "Unknown Series"
                  ? seriesKey(p.extractedSeries, p.extractedIssue || "1")
                  : null;
              })
              .filter((k): k is string => Boolean(k))
          )
        );
        const salesCacheKey = keys.slice().sort().join("|");
        const cachedSales = salesCache.get(salesCacheKey);
        if (cachedSales && Date.now() - cachedSales.at < SALES_TTL_MS) {
          for (const [k, v] of cachedSales.map) salesBySeriesKey.set(k, v);
        } else if (keys.length > 0) {
          const db: any = createAdminServerClient();
          // PostgREST caps result pages. Read each bounded batch to completion, not just its first 1,000 rows.
          // Limit concurrent database requests to avoid exhausting the connection pool.
          const keyChunks: string[][] = [];
          for (let i = 0; i < keys.length; i += 25) keyChunks.push(keys.slice(i, i + 25));
          const sChunkResults: Array<{ data: any[] }> = [];
          for (let i = 0; i < keyChunks.length; i += 4) {
            const batches = await Promise.all(keyChunks.slice(i, i + 4).map(async (chunk) => {
              const rows: any[] = [];
              for (let offset = 0; offset < 10000; offset += 1000) {
                const { data, error } = await db.from("sniper_sales")
                  .select("series_key,sold_at,price_usd,grade,grader,venue,source,confirmed,url")
                  .eq("confirmed", true)
                  .in("series_key", chunk)
                  .order("sold_at", { ascending: false })
                  .range(offset, offset + 999);
                if (error) throw error;
                rows.push(...(data ?? []));
                if ((data ?? []).length < 1000) break;
              }
              return { data: rows };
            }));
            sChunkResults.push(...batches);
          }
          const gRows: any[] = [];
          for (let offset = 0; offset < 10000; offset += 1000) {
            const { data, error } = await db.from("graded_sales_observations")
              .select("title_name,issue_number_raw,sale_price,sale_date,grade_numeric,native_grade_text,venue,evidence_path,currency,grading_company_id,certification_number")
              .gt("sale_price", 0)
              .not("sale_date", "is", null)
              .not("evidence_path", "is", null)
              .order("sale_date", { ascending: false })
              .range(offset, offset + 999);
            if (error) throw error;
            gRows.push(...(data ?? []));
            if ((data ?? []).length < 1000) break;
          }
          for (const res of sChunkResults) {
            for (const s of res?.data ?? []) {
              const list = salesBySeriesKey.get(s.series_key) ?? [];
              list.push({
                date: s.sold_at,
                price: Number(s.price_usd),
                grade: s.grade != null ? Number(s.grade) : null,
                grader: s.grader ?? undefined,
                venue: s.venue,
                source: s.source,
                confirmed: !!s.confirmed,
                url: s.url ?? undefined,
              });
              salesBySeriesKey.set(s.series_key, list);
            }
          }
          for (const g of gRows ?? []) {
            if (g.currency && g.currency !== "USD") continue;
            const k = seriesKey(String(g.title_name || ""), String(g.issue_number_raw || "1"));
            if (!k) continue;
            const list = salesBySeriesKey.get(k) ?? [];
            list.push({
              date: String(g.sale_date),
              price: Number(g.sale_price),
              grade: g.grade_numeric != null ? Number(g.grade_numeric) : gradeNum(g.native_grade_text),
              grader: g.grading_company_id === "551583be-0d7a-436a-83e5-0098c2b35af4" ? "CGC" : undefined,
              certNumber: g.certification_number ?? null,
              venue: g.venue || "graded register",
              source: "graded_sales_observations",
              confirmed: Boolean(g.evidence_path),
              url: g.evidence_path ?? undefined,
            });
            salesBySeriesKey.set(k, list);
          }
          salesCache.set(salesCacheKey, { at: Date.now(), map: new Map(salesBySeriesKey) });
          if (salesCache.size > 20) salesCache.delete(salesCache.keys().next().value as string);
        }
      } catch {}
      mark("salesQueries", tSales);

      const cleanGraderNotes = (raw?: string | null): string | undefined => {
        if (!raw) return undefined;
        const cleaned = raw
          .replace(/A\s+15%\s+BUYER'?S\s+PREMIUM\s*\(MINIMUM\s*\$19\.00\)\s*WILL\s+BE\s+ADDED\s+TO\s+THIS\s+ITEM\s+AT\s+CONCLUSION\s+OF\s+THE\s+AUCTION\.?/gi, "")
          .replace(/\s+/g, " ")
          .trim();
        return cleaned.length > 0 ? cleaned : undefined;
      };

      // Census is read directly from the CGC population database on every uncached
      // page request. A persisted "resolved" flag does not prove the stored result
      // is present, current, or correctly matched to the slab.
      const censusByItem = new Map<unknown, GradeCensus | null>();
      const labelQueries = filteredAuctions.flatMap((item, idx) => {
        const l = item.label;
        if (l?.grader?.toUpperCase() !== "CGC" || !l.title || !l.issueNumber || !l.issueDate) return [];
        return [{
          key: String(idx), title: l.title, issue: l.issueNumber,
          date: l.issueDate, publisher: l.publisher ?? null,
          edition: l.edition ?? null, grade: l.grade ?? null,
        }];
      });
      const fallbackQueries = filteredAuctions.flatMap((item, idx) => {
        const l = item.label;
        if (l?.grader?.toUpperCase() !== "CGC" || !l.title || !l.issueNumber ||
            !l.grade || l.edition || !l.issueDate) return [];
        const y = item.year ?? null;
        return [{ key: String(idx), series: l.title, issue: l.issueNumber, grade: l.grade, year: y }];
      });
      try {
        const exact = await lookupLabelCensusBatch(labelQueries);
        // Volume/year lookup is only used for base-edition slabs, never variants.
        // Only one unambiguous volume may match.
        const missing = fallbackQueries.filter(q => !exact.has(q.key));
        const byVolume = missing.length ? await lookupGradeCensusBatch(missing) : new Map<string, GradeCensus>();
        filteredAuctions.forEach((item, idx) => {
          censusByItem.set(item, exact.get(String(idx)) ?? byVolume.get(String(idx)) ?? null);
        });
      } catch (err) {
        console.error("Sniper CGC population lookup failed:", err);
        // No fabricated counts or stale fallback.
        filteredAuctions.forEach(item => censusByItem.set(item, null));
      }

      // Query recorded GoCollect grade/label values for identified slabs, rather than
      // relying exclusively on a previously populated listing payload.
      let gcPrices = new Map<string, GoCollectPrice>();
      try {
        const queries: GoCollectQuery[] = filteredAuctions.flatMap((item, idx) => {
          const label = item.label;
          if (!label?.grader || !label?.title || !label?.issueNumber ||
              !label?.labelType || label.grade == null) return [];
          return [{ key: String(idx), title: label.title, issue: label.issueNumber,
            date: label.issueDate ?? null, grader: label.grader,
            labelType: label.labelType, grade: label.grade }];
        });
        if (queries.length) gcPrices = await lookupGoCollectBatch(queries);
        // Never promote cached listing prices into a verified current FMV.
        // A failed or missing exact slab lookup must remain unavailable.
      } catch (err) {
        console.error("Sniper GoCollect price lookup failed:", err);
        // Fail closed: previously stored payload prices cannot establish FMV.
      }
      const lotBooksByIndex = new Map<number, ReturnType<typeof extractLotBooks>>();
      const lotQueries: GoCollectQuery[] = [];
      filteredAuctions.forEach((item, idx) => {
        const parsedLot = parseAndFilterListing(String(item.title || ""));
        const books = extractLotBooks(String(item.title || ""), String(item.label?.title || parsedLot.extractedSeries), String(item.label?.grader || item.gradingCompany || "CGC"));
        if (books.length) {
          lotBooksByIndex.set(idx, books);
          lotQueries.push(...lotBookQueries(books, "lot" + idx));
        }
      });
      let lotPrices = new Map<string, GoCollectPrice>();
      if (lotQueries.length) {
        try { lotPrices = await lookupGoCollectBatch(lotQueries); }
        catch (err) { console.error("Multi-book GoCollect lookup failed:", err); }
      }
      const gcByItem = new Map<unknown, GoCollectPrice | null>(filteredAuctions.map((item, idx) => [item, gcPrices.get(String(idx)) ?? null] as const));

      const updatedAuctions = filteredAuctions.map((item, itemIndex): RawAuctionListing => {
        const isBin = Boolean(item.isBuyItNow || item.listingType === "BuyItNow" || (item.buyItNowPrice && item.buyItNowPrice > 0));

        // Real time remaining: venue's end time as of the fetch, minus the time since the fetch. No simulated cycle.
        // Buy It Now listings have no end time; 86400 is a placeholder the page does not display.
        const secs = isBin ? 86400 : Math.max(0, Math.round(Number(item.secondsRemaining ?? 0) - (Date.now() - fetchedAtMs) / 1000));

        const rawTitle = String(item.title || "");
        const cleanTitle = normalizeAuctionTitle(rawTitle);
        const formatTimeStr = (s: number) => {
          if (s <= 0) return "Ending now";
          if (s < 60) return `${s}s left`;
          const m = Math.floor(s / 60);
          const remSecs = s % 60;
          if (m < 60) return `${m}m ${remSecs > 0 ? remSecs + "s " : ""}left`;
          const h = Math.floor(m / 60);
          return `${h}h ${m % 60}m left`;
        };

        const parsed = parseAndFilterListing(rawTitle);
        const effectiveGrade = item.resolvedGrade ?? parsed.grade ?? undefined;
        const sKey = parsed.extractedSeries && parsed.extractedSeries !== "Unknown Series"
          ? seriesKey(parsed.extractedSeries, parsed.extractedIssue || "1")
          : "";
        const dbMeta = resolveAuctionDbMetadata(rawTitle, effectiveGrade, sKey ? salesBySeriesKey.get(sKey) : undefined);
        const gradeMatchedGoCollectFmv = gcByItem.get(item)?.fmv;
        // Only an exact, currently resolved grader/grade/label match may establish
        // single-book FMV. Series/issue/grade sales alone do not identify a variant.
        const verifiedLabel = item.label;
        const hasExactSlabIdentity = Boolean(
          verifiedLabel?.title && verifiedLabel?.issueNumber &&
          verifiedLabel?.grader && verifiedLabel?.labelType &&
          verifiedLabel?.grade != null
        );
        // Edition-specific listings cannot use a title/issue-only price.
        // Require the slab transcription to identify the edition explicitly;
        // the current GoCollect RPC has no edition key, so these remain unpriced.
        const editionSpecific = /\b(?:variant|newsstand|direct edition|(?:[2-9]|[1-9][0-9])(?:st|nd|rd|th)\s+print(?:ing)?|foil|sketch cover|virgin cover|incentive|ratio|exclusive|facsimile|second printing)\b/i.test(rawTitle);
        const verifiedGoCollect = gcByItem.get(item);
        const resolvedFmv = !editionSpecific && hasExactSlabIdentity &&
          verifiedGoCollect?.fmv != null && verifiedGoCollect.fmv > 0 &&
          (verifiedGoCollect.salesCount ?? 0) > 0
          ? verifiedGoCollect.fmv : undefined;

        const componentBooks = lotBooksByIndex.has(itemIndex)
          ? priceLotBooks(lotBooksByIndex.get(itemIndex)!, lotPrices, "lot" + itemIndex)
          : [];
        const completeLotFmv = componentBooks.length > 0 && !editionSpecific && componentBooks.every(b => b.fmv !== null)
          ? componentBooks.reduce((sum, b) => sum + (b.fmv ?? 0), 0)
          : undefined;
        const distinctLotIssues = new Set([...rawTitle.matchAll(/#\s*(\d{1,5})(?!\d)/g)].map(m => m[1]));
        const declaredLot = distinctLotIssues.size > 1 || /\b(?:lot of|multiple (?:books|comics)|\d+\s+(?:slabs|books|comics))\b/i.test(rawTitle);
        const declaredCount = Number(rawTitle.match(/\blot of\s+(\d+)\b/i)?.[1] ?? rawTitle.match(/\b(\d+)\s+(?:slabs|books|comics)\b/i)?.[1] ?? 0);
        const isUnresolvedMultiBook = declaredLot && (
          componentBooks.length < 2 ||
          (distinctLotIssues.size > 0 && componentBooks.length !== distinctLotIssues.size) ||
          (declaredCount > 0 && componentBooks.length !== declaredCount)
        );
        const verified = reconcileVerifiedValuation({
          title: rawTitle,
          series: item.label?.title ?? parsed.extractedSeries,
          issue: item.label?.issueNumber ?? parsed.extractedIssue,
          year: Number(String(item.label?.issueDate ?? item.year ?? parsed.extractedYear ?? "").match(/(?:19|20)\d{2}/)?.[0]) || null,
          grade: effectiveGrade,
          grader: item.label?.grader ?? parsed.gradingCompany,
          labelType: item.label?.labelType,
          sales: sKey ? (salesBySeriesKey.get(sKey) ?? []) : [],
          guide: hasExactSlabIdentity ? verifiedGoCollect : undefined,
          isMultiBook: declaredLot,
        });
        const finalFmv = isUnresolvedMultiBook ? undefined : componentBooks.length > 0 ? completeLotFmv : verified.fmv;

        const resolvedPub = dbMeta.publisher || item.gcdMetadata?.publisher || undefined;

        const realTimeBid = Number(item.currentBid || 0);
        const realTimeBidCount = Number(item.bidCount ?? 0);

        const catalogCover = item.imageUrl ? "" : (lookupSqliteCover(parsed.extractedSeries, parsed.extractedIssue) || "");
        const resolvedCover = item.imageUrl || catalogCover;

        const normalizeUrl = (u: string): string => {
          if (!u) return "";
          let curr = u.trim();
          while (curr.includes("%25")) {
            try { curr = decodeURI(curr); } catch { break; }
          }
          try { return encodeURI(decodeURI(curr)); } catch { return curr; }
        };

        const safeCoverUrl = normalizeUrl(resolvedCover);

        const galleryList: string[] = [];
        const seenUrls = new Set<string>();
        const addGallery = (u?: string | null) => {
          if (!u) return;
          const norm = normalizeUrl(u);
          if (norm && !seenUrls.has(norm)) {
            seenUrls.add(norm);
            galleryList.push(norm);
          }
        };

        addGallery(safeCoverUrl);
        if (item.galleryImages && Array.isArray(item.galleryImages)) {
          for (const img of item.galleryImages) addGallery(img);
        }
        if (!item.imageUrl && catalogCover) {
          addGallery(catalogCover);
          for (const img of lookupSqliteGallery(parsed.extractedSeries, parsed.extractedIssue)) addGallery(img);
        }

        // Census is exact per-grade data from cgc_population. Not found = undefined (shown as unavailable).
        const gc = censusByItem.get(item) ?? null;
        const resolvedCensusTotal = gc?.total;
        const resolvedCensusHigher = gc?.higher;
        const resolvedCensus98 = gc?.atGrade;

        const cleanedNotes = cleanGraderNotes(item.graderNotes);
        const cleanedDesc = cleanGraderNotes(item.itemDescription);

        return {
          ...item,
          normalizedTitle: cleanTitle,
          graderNotes: cleanedNotes,
          itemDescription: cleanedDesc,
          year: dbMeta.year ?? item.year ?? parsed.extractedYear,
          era: dbMeta.era ?? item.era ?? parsed.extractedEra,
          imageUrl: safeCoverUrl,
          galleryImages: galleryList.length > 0 ? galleryList : [safeCoverUrl],
          currentBid: isBin ? (item.buyItNowPrice ?? item.currentBid) : realTimeBid,
          bidCount: isBin ? 0 : realTimeBidCount,
          secondsRemaining: secs,
          timeLeftStr: isBin ? "Buy It Now · Available" : formatTimeStr(secs),
          anchorFmv: finalFmv,
          fairMarketValue: finalFmv,
          lotBooks: componentBooks,
          // Historical comps must be proven to match the same edition before display.
          historicalComps: componentBooks.length ? [] : verified.comps,
          pricingSourceProvenance: finalFmv != null ? (componentBooks.length > 0 ? "GoCollect: individually priced lot components" : verified.provenance) : undefined,
          censusTotal: resolvedCensusTotal,
          censusHigher: resolvedCensusHigher,
          censusCount98: resolvedCensus98,
          gocollectPrice: hasExactSlabIdentity ? (gcByItem.get(item) ?? undefined) : undefined,
          listingType: isBin ? "BuyItNow" : "Auction",
          isBuyItNow: isBin,
          buyItNowPrice: isBin ? (item.buyItNowPrice ?? item.currentBid) : undefined,
          gcdMetadata: {
            ...item.gcdMetadata,
            publisher: resolvedPub,
          },
        };
      });

      // FAIL CLOSED: only fully researched, precomputed three-page dossiers are actionable.
      // The scheduled Supabase enrichment worker must populate admissionEvidence.
      // A missing dossier is not a reason to manufacture prices, sales, videos or prose.
      const admissionPassed = (a: RawAuctionListing): boolean => {
        const e = a.admissionEvidence;
        const money = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v > 0;
        const filled = (v: unknown) => typeof v === "string" && v.trim().length > 0;
        const exactGrade = typeof a.resolvedGrade === "number" && Number.isFinite(a.resolvedGrade);
        return Boolean(
          e?.identityVerified === true &&
          e?.certificationVerified === true &&
          e?.sourceReconciled === true &&
          e?.historicalSalesVerified === true &&
          e?.mathematicsAudited === true &&
          e?.threePagesComplete === true &&
          filled(a.title) && filled(a.url) && filled(a.imageUrl) &&
          filled(a.gradingCompany) && filled(a.certNumber) && exactGrade &&
          Number.isInteger(a.year) && Number(a.year) >= 1800 &&
          money(a.anchorFmv) && money(e?.rawFmv) && money(e?.certificationCost) &&
          money(e?.gradedFmv) && filled(a.pricingSourceProvenance) &&
          Array.isArray(a.historicalComps) && a.historicalComps.length > 0 &&
          a.historicalComps.every((c) => money(c.price) && filled(c.date) && filled(c.venue) && c.grade === a.resolvedGrade) &&
          filled(e?.storySynopsis) && filled(e?.storyBreakdown) &&
          Array.isArray(e?.issueVideos) && e.issueVideos.length > 0 &&
          e.issueVideos.every((v) => filled(v)) &&
          Array.isArray(e?.financialExplanations) && e.financialExplanations.length > 0 &&
          e.financialExplanations.every((v) => filled(v)) &&
          Array.isArray(e?.chartObservations) && e.chartObservations.length > 0 &&
          e.chartObservations.every((v) => filled(v.date) && money(v.price) && filled(v.source)) &&
          Math.abs(Number(a.anchorFmv) - Number(e.gradedFmv)) < 0.005 &&
          Math.abs(Number(e.intrinsicValue) - (Number(e.rawFmv) + Number(e.certificationCost))) < 0.005 &&
          Math.abs(Number(e.speculativePremium) - (Number(e.gradedFmv) - Number(e.intrinsicValue))) < 0.005
        );
      };
      // Keep real collected lots visible while research is pending. They are
      // explicitly marked and cannot be treated as investment opportunities by
      // the radar until every evidence gate passes. The previous implementation
      // filtered them out here even though no worker populated admission_ready,
      // making a healthy collector look like an empty feed.
      const activeLots = updatedAuctions
        .filter((a) => (a.isBuyItNow || a.secondsRemaining > 0) && Boolean(a.url))
        .map((a) => ({
          ...a,
          admissionStatus: admissionPassed(a) ? "admitted" : "pending_research",
        }));
      const admittedLots = activeLots.filter((a) => a.admissionStatus === "admitted");
      const activeVenues = Array.from(new Set(activeLots.map((a) => a.source)));
      return NextResponse.json({
        success: true,
        count: activeLots.length,
        admittedCount: admittedLots.length,
        pendingResearchCount: activeLots.length - admittedLots.length,
        auctions: activeLots,
        venues: activeVenues,
        source: "panel_profits_auction_aggregator",
        dataAsOf: asOf,
        fetchedAt: new Date().toISOString(),
      }, { headers: { "server-timing": [...marks, `total;dur=${Date.now() - tStart}`].join(", ") } });
    }

    return NextResponse.json({
      success: true,
      count: 0,
      auctions: [],
      venues: [],
      source: "panel_profits_auction_aggregator",
      dataAsOf: asOf,
      message: asOf
        ? "No stored live listings match the active filters."
        : "No auction listings are stored yet. The snapshot job has not completed a run; check /api/sniper/status.",
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Live auctions route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error)?.message || "Failed to load live auctions",
        auctions: [],
      },
      { status: 500 }
    );
  }
}
