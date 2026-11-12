import { createAdminServerClient } from "@/lib/supabase/admin";

export interface GpaYearlyAggregate {
  year: number;
  count_sold: number;
  high_price: number | null;
  low_price: number | null;
  avg_price: number | null;
}

export interface GpaMarketLadder {
  hasGpaData: boolean;
  grades: Record<string, number>;
  latestSales: Record<string, { price: number; date: string | null }>;
  lifetimeSalesByGrade: Record<string, {
    totalSold: number;
    highPrice: number;
    lowPrice: number;
    years: GpaYearlyAggregate[];
  }>;
  historicalTransactions: Array<{
    grade: string;
    priceUsd: number;
    date: string;
    platform: string;
    countSold?: number;
    highPrice?: number;
    lowPrice?: number;
  }>;
  editions: Array<{
    id: string;
    editionName: string;
    isRegular: boolean;
  }>;
}

/**
 * Retrieves authentic GPA sales and valuation ladder for a given comic.
 * Matches by exact series and issue number, filtering to US Regular Cover A Universal grades.
 */
export async function getGpaValuationLadder(
  series: string,
  issueNumber: string,
  publicationYear?: number | null
): Promise<GpaMarketLadder | null> {
  if (!series || !issueNumber) return null;

  try {
    const supabase = createAdminServerClient();
    const cleanIssue = String(issueNumber).replace(/^#/, "").trim();
    const cleanSeries = String(series).replace(/^The\s+/i, "").trim().toLowerCase();

    // First find matching gpa_titles by title_name
    const { data: gpaTitles } = await supabase
      .from("gpa_titles")
      .select("gpa_title_id, title_name, publication_year");

    const matchingTitleIds: number[] = [];
    if (gpaTitles && gpaTitles.length > 0) {
      for (const gt of gpaTitles) {
        const gtName = String(gt.title_name || "")
          .replace(/,\s*The$/i, "")
          .replace(/^The\s+/i, "")
          .trim()
          .toLowerCase();
        if (gtName === cleanSeries || gtName.includes(cleanSeries) || cleanSeries.includes(gtName)) {
          matchingTitleIds.push(gt.gpa_title_id);
        }
      }
    }

    // Query gpa_issues matching issue_number_raw (and gpa_title_id if resolved)
    let issueQuery = supabase
      .from("gpa_issues")
      .select(`
        id,
        gpa_title_id,
        gpa_issue_id,
        issue_number_raw,
        publication_year,
        gpa_editions (
          id,
          edition_name,
          is_regular_edition,
          gpa_grade_summaries (
            id,
            grade,
            designation,
            serial,
            last_sale_price,
            last_sale_date,
            avg_12m,
            avg_90d,
            gpa_yearly_aggregates (
              year,
              count_sold,
              high_price,
              low_price,
              avg_price
            )
          )
        )
      `)
      .eq("issue_number_raw", cleanIssue);

    if (matchingTitleIds.length > 0) {
      issueQuery = issueQuery.in("gpa_title_id", matchingTitleIds);
    }

    const { data: gpaIssues, error } = await issueQuery;

    if (error || !gpaIssues || gpaIssues.length === 0) return null;

    // Filter to the matching issue based on title or publication year
    let matchedIssue = gpaIssues[0];
    if (gpaIssues.length > 1) {
      if (publicationYear) {
        const yearMatch = gpaIssues.find((gi: any) => gi.publication_year === publicationYear);
        if (yearMatch) matchedIssue = yearMatch;
      }
    }

    const editions = (matchedIssue.gpa_editions as any[]) || [];
    if (editions.length === 0) return null;

    // Find regular Cover A edition (or default to first)
    const regularEd = editions.find((e: any) => e.is_regular_edition) || editions[0];
    const summaries: any[] = regularEd.gpa_grade_summaries || [];

    // Filter to authentic Universal grades without foreign variant serial contamination
    const foreignMarkers = [
      "reprint",
      "german",
      "brazilian",
      "australian",
      "uk price",
      "greek",
      "mexican",
      "facsimile",
    ];

    const grades: Record<string, number> = {};
    const latestSales: Record<string, { price: number; date: string | null }> = {};
    const lifetimeSalesByGrade: GpaMarketLadder["lifetimeSalesByGrade"] = {};
    const historicalTransactions: GpaMarketLadder["historicalTransactions"] = [];

    for (const s of summaries) {
      if (s.designation !== "UNI") continue;

      const serialLower = String(s.serial || "").toLowerCase();
      const isContaminated = foreignMarkers.some((marker) => serialLower.includes(marker));
      if (isContaminated) continue;

      const price = Number(s.last_sale_price);
      if (price > 0 && s.grade) {
        if (!grades[s.grade] || price > grades[s.grade]) {
          grades[s.grade] = price;
          latestSales[s.grade] = {
            price,
            date: s.last_sale_date || null,
          };
        }
      }

      const rawYears: any[] = s.gpa_yearly_aggregates || [];
      if (rawYears.length > 0 && s.grade) {
        const sortedYears: GpaYearlyAggregate[] = rawYears
          .map((y) => ({
            year: Number(y.year),
            count_sold: Number(y.count_sold || 1),
            high_price: y.high_price != null ? Number(y.high_price) : null,
            low_price: y.low_price != null ? Number(y.low_price) : null,
            avg_price: y.avg_price != null ? Number(y.avg_price) : null,
          }))
          .sort((a, b) => b.year - a.year);

        const totalSold = sortedYears.reduce((acc, y) => acc + y.count_sold, 0);
        const highs = sortedYears.map((y) => y.high_price || y.avg_price || 0).filter((v) => v > 0);
        const lows = sortedYears.map((y) => y.low_price || y.avg_price || 0).filter((v) => v > 0);

        lifetimeSalesByGrade[s.grade] = {
          totalSold,
          highPrice: highs.length > 0 ? Math.max(...highs) : price,
          lowPrice: lows.length > 0 ? Math.min(...lows) : price,
          years: sortedYears,
        };

        for (const yr of sortedYears) {
          const isLatestYear = s.last_sale_date && s.last_sale_date.startsWith(String(yr.year));
          const txDate = isLatestYear ? s.last_sale_date : `${yr.year}-06-15`;
          if (yr.count_sold === 1) {
            historicalTransactions.push({
              grade: s.grade,
              priceUsd: yr.avg_price || yr.high_price || price,
              date: txDate,
              platform: "CGC / GPA Verified",
              countSold: 1,
            });
          } else if (yr.count_sold === 2 && yr.high_price && yr.low_price) {
            historicalTransactions.push({
              grade: s.grade,
              priceUsd: yr.high_price,
              date: `${yr.year}-09-01`,
              platform: "CGC / GPA Verified (High)",
              countSold: 1,
            });
            historicalTransactions.push({
              grade: s.grade,
              priceUsd: yr.low_price,
              date: `${yr.year}-03-01`,
              platform: "CGC / GPA Verified (Low)",
              countSold: 1,
            });
          } else {
            // Multiple sales in the year (e.g. 2014 3 sales: $119,222 high, $115,000 low, $116,407 avg)
            if (yr.high_price) {
              historicalTransactions.push({
                grade: s.grade,
                priceUsd: yr.high_price,
                date: `${yr.year}-10-01`,
                platform: `CGC / GPA (${yr.count_sold} yr sales - High)`,
                countSold: yr.count_sold,
              });
            }
            if (yr.low_price) {
              historicalTransactions.push({
                grade: s.grade,
                priceUsd: yr.low_price,
                date: `${yr.year}-02-01`,
                platform: `CGC / GPA (${yr.count_sold} yr sales - Low)`,
                countSold: yr.count_sold,
              });
            }
            for (let k = 2; k < yr.count_sold; k++) {
              historicalTransactions.push({
                grade: s.grade,
                priceUsd: yr.avg_price || yr.high_price || price,
                date: `${yr.year}-06-0${Math.min(9, k)}`,
                platform: `CGC / GPA (${yr.count_sold} yr sales - Avg)`,
                countSold: yr.count_sold,
              });
            }
          }
        }
      } else if (price > 0 && s.grade) {
        historicalTransactions.push({
          grade: s.grade,
          priceUsd: price,
          date: s.last_sale_date || "2026-01-01",
          platform: "CGC / GPA Verified",
          countSold: 1,
        });
      }
    }

    if (Object.keys(grades).length === 0) return null;

    historicalTransactions.sort((a, b) => b.date.localeCompare(a.date));

    return {
      hasGpaData: true,
      grades,
      latestSales,
      lifetimeSalesByGrade,
      historicalTransactions,
      editions: editions.map((e: any) => ({
        id: e.id,
        editionName: e.edition_name,
        isRegular: Boolean(e.is_regular_edition),
      })),
    };
  } catch (err) {
    console.warn("Notice fetching GPA valuation ladder:", err);
    return null;
  }
}
