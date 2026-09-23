import { createAdminServerClient, createCleanReadOnlyServerClient } from "@/lib/supabase/admin";
import { resolveComicPricing } from "@/lib/pricing/baseline";
import { getComicCoverEvidence } from "@/lib/comics/covers";

export async function getAssetRegistry(limit = 48) {
  try {
    const db = createAdminServerClient();
    const { data: comics, error } = await db
      .from("comics")
      .select("id,series,issue_number,publisher,pp_grade_9_8_price,comicbase_price,baseline_grade_9_8_value,baseline_grade_9_8_sources,baseline_grade_9_8_observation_count,source,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    const ids = (comics || []).map((comic) => comic.id);
    if (!ids.length) return [];
    const { data: covers, error: coversError } = await db
      .from("pf_cover_evidence")
      .select("variant_id,image_url,storage_path,quality_tier")
      .in("variant_id", ids)
      .eq("is_broken", false)
      .not("image_url", "is", null);
    if (coversError) console.error("Error fetching cover evidence:", coversError);
    const coverMap = new Map<string, { image_url: string | null; storage_path: string | null }>();
    for (const cover of covers || []) if (!coverMap.has(cover.variant_id)) coverMap.set(cover.variant_id, cover);
    return (comics || []).map((comic) => ({
      ...comic,
      index_value: resolveComicPricing(comic).baselinePrice98,
      cover: coverMap.get(comic.id) || null,
    }));
  } catch (error) {
    console.error("Error fetching asset registry:", error);
    return [];
  }
}

export async function getCleanEquityDetail(variantId: string) {
  const db = createCleanReadOnlyServerClient();
  const [{ data: truth }, { data: artifact }, { data: currentPrice }] = await Promise.all([
    db.from("equity_truth_layer").select("*").eq("variant_id", variantId).maybeSingle(),
    db.from("comic_instrument_market_artifacts").select("*").eq("id", variantId).eq("verification_status", "verified").maybeSingle(),
    db.from("asset_current_prices").select("*").eq("asset_id", variantId).maybeSingle(),
  ]);

  if (!truth || !artifact) return null;
  const productName = String(artifact.product_name || "Verified comic equity");
  const match = productName.match(/^(.*?)(?:\s+#?([^#]+))?\s+\((\d{4})\)$/);
  const series = match?.[1] || productName;
  const issueNumber = match?.[2]?.trim() || "—";
  const { data: history } = await db
    .from("comic_price_history")
    .select("price,source,snapshot_date,grade")
    .ilike("series", series)
    .eq("issue_number", issueNumber)
    .order("snapshot_date", { ascending: false })
    .limit(36);

  return {
    truth,
    artifact,
    currentPrice,
    cover: await getComicCoverEvidence(variantId),
    series,
    issueNumber,
    publicationYear: match?.[3] ? Number(match[3]) : null,
    history: (history || []).reverse(),
  };
}

  export async function getEquityRegistry(limit = 48) {
    const db = createAdminServerClient();
    const { data: truth, error } = await db.from("equity_truth_layer").select("id,variant_id,anchor_grade,anchor_price_usd,anchor_sales_volume,anchor_confidence,sov_grade,sov_price_usd,asset_class,price_9_9_usd,price_10_0_usd,census_total_graded,census_9_8,census_9_9,census_10_0,scarcity_tier,supply_adjustment,computed_at").order("computed_at", { ascending: false }).limit(limit);
    if (error) {
      console.error("Error fetching equity truth layer:", error);
      return [];
    }
    const ids = (truth || []).map((row) => row.variant_id).filter(Boolean);
    const { data: comics } = ids.length ? await db.from("comics").select("id,series,issue_number,publisher").in("id", ids) : { data: [] };
    const comicMap = new Map((comics || []).map((comic) => [comic.id, comic]));
    return (truth || []).map((row) => ({ ...row, comic: comicMap.get(row.variant_id) || null }));
  }
