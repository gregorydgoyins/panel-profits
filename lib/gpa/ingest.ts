import { SupabaseClient } from '@supabase/supabase-js';
import { GpaBatchIngestionPayload } from './types';
import { generateObservationFingerprint, parseGpaDate, parseGpaPrice } from './fingerprint';
import { findComicMatches } from './matching';

export interface IngestionResult {
  success: boolean;
  title_id: number;
  issue_id: number;
  editions_count: number;
  summaries_count: number;
  aggregates_count: number;
  observations_inserted: number;
  observations_skipped_duplicate: number;
  match_staged: boolean;
  match_status?: string;
  matched_comic_id?: string;
  error?: string;
}

export async function processGpaBatchIngestion(
  supabase: SupabaseClient,
  payload: GpaBatchIngestionPayload
): Promise<IngestionResult> {
  const { title, issue, editions } = payload;

  if (!title?.gpa_title_id || !issue?.gpa_issue_id) {
    return {
      success: false,
      title_id: title?.gpa_title_id || 0,
      issue_id: issue?.gpa_issue_id || 0,
      editions_count: 0,
      summaries_count: 0,
      aggregates_count: 0,
      observations_inserted: 0,
      observations_skipped_duplicate: 0,
      match_staged: false,
      error: 'Missing gpa_title_id or gpa_issue_id',
    };
  }

  // 1. Upsert GPA Title
  const { data: titleRecord, error: titleErr } = await supabase
    .from('gpa_titles')
    .upsert(
      {
        gpa_title_id: title.gpa_title_id,
        title_name: title.title_name,
        publisher: title.publisher || null,
        publication_year: title.publication_year || null,
        raw_metadata: title.raw_metadata || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'gpa_title_id' }
    )
    .select('id, gpa_title_id, title_name, publisher, publication_year')
    .single();

  if (titleErr || !titleRecord) {
    throw new Error(`Failed to upsert gpa_titles: ${titleErr?.message}`);
  }

  // 2. Upsert GPA Issue
  const { data: issueRecord, error: issueErr } = await supabase
    .from('gpa_issues')
    .upsert(
      {
        gpa_title_id: title.gpa_title_id,
        gpa_issue_id: issue.gpa_issue_id,
        issue_number_raw: issue.issue_number_raw,
        gpa_url: issue.gpa_url,
        raw_metadata: issue.raw_metadata || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'gpa_title_id,gpa_issue_id' }
    )
    .select('id, gpa_title_id, gpa_issue_id, issue_number_raw')
    .single();

  if (issueErr || !issueRecord) {
    throw new Error(`Failed to upsert gpa_issues: ${issueErr?.message}`);
  }

  let editionsCount = 0;
  let summariesCount = 0;
  let aggregatesCount = 0;
  let observationsInserted = 0;
  let observationsSkippedDuplicate = 0;

  // 3. Process Editions (idempotent find-or-insert)
  for (const ed of editions || []) {
    const editionName = ed.edition_name || 'Regular';
    const variantName = ed.variant_name || null;

    let edQuery = supabase
      .from('gpa_editions')
      .select('id, edition_name, variant_name')
      .eq('gpa_issue_id', issueRecord.id)
      .eq('edition_name', editionName);

    if (variantName === null) {
      edQuery = edQuery.is('variant_name', null);
    } else {
      edQuery = edQuery.eq('variant_name', variantName);
    }

    let { data: edRecord } = await edQuery.maybeSingle();

    if (!edRecord) {
      const { data: newEd, error: edErr } = await supabase
        .from('gpa_editions')
        .insert({
          gpa_issue_id: issueRecord.id,
          edition_name: editionName,
          variant_name: variantName,
          is_regular_edition: ed.is_regular_edition !== false,
          updated_at: new Date().toISOString(),
        })
        .select('id, edition_name, variant_name')
        .single();

      if (edErr || !newEd) continue;
      edRecord = newEd;
    }
    editionsCount++;

    // 4. Process Grade Summaries (idempotent find-or-update)
    for (const gs of ed.grade_summaries || []) {
      let { data: gsRecord } = await supabase
        .from('gpa_grade_summaries')
        .select('id, grader, grade, designation')
        .eq('gpa_edition_id', edRecord.id)
        .eq('grader', gs.grader)
        .eq('grade', gs.grade)
        .eq('designation', gs.designation)
        .maybeSingle();

      if (!gsRecord) {
        const { data: newGs, error: gsErr } = await supabase
          .from('gpa_grade_summaries')
          .insert({
            gpa_edition_id: edRecord.id,
            grader: gs.grader,
            grade: gs.grade,
            designation: gs.designation,
            serial: gs.serial || null,
            avg_2024: gs.avg_2024 ?? null,
            avg_2025: gs.avg_2025 ?? null,
            avg_12m: gs.avg_12m ?? null,
            avg_90d: gs.avg_90d ?? null,
            last_sale_price: gs.last_sale_price ?? null,
            last_sale_date: gs.last_sale_date || null,
            updated_at: new Date().toISOString(),
          })
          .select('id, grader, grade, designation')
          .single();

        if (gsErr || !newGs) continue;
        gsRecord = newGs;
      } else {
        await supabase
          .from('gpa_grade_summaries')
          .update({
            serial: gs.serial || null,
            avg_2024: gs.avg_2024 ?? null,
            avg_2025: gs.avg_2025 ?? null,
            avg_12m: gs.avg_12m ?? null,
            avg_90d: gs.avg_90d ?? null,
            last_sale_price: gs.last_sale_price ?? null,
            last_sale_date: gs.last_sale_date || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', gsRecord.id);
      }
      summariesCount++;

      // 5. Process Yearly Aggregates (idempotent find-or-update)
      for (const ya of gs.yearly_aggregates || []) {
        let { data: yaRecord } = await supabase
          .from('gpa_yearly_aggregates')
          .select('id, year')
          .eq('gpa_grade_summary_id', gsRecord.id)
          .eq('year', ya.year)
          .maybeSingle();

        if (!yaRecord) {
          const { data: newYa, error: yaErr } = await supabase
            .from('gpa_yearly_aggregates')
            .insert({
              gpa_grade_summary_id: gsRecord.id,
              year: ya.year,
              count_sold: ya.count_sold || 0,
              high_price: ya.high_price ?? null,
              low_price: ya.low_price ?? null,
              avg_price: ya.avg_price ?? null,
              updated_at: new Date().toISOString(),
            })
            .select('id, year')
            .single();

          if (yaErr || !newYa) continue;
          yaRecord = newYa;
        } else {
          await supabase
            .from('gpa_yearly_aggregates')
            .update({
              count_sold: ya.count_sold || 0,
              high_price: ya.high_price ?? null,
              low_price: ya.low_price ?? null,
              avg_price: ya.avg_price ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', yaRecord.id);
        }
        aggregatesCount++;

        // 6. Process Individual Sales Observations (deterministic deduplication)
        for (const obs of ya.observations || []) {
          const fingerprint = generateObservationFingerprint({
            gpa_title_id: title.gpa_title_id,
            gpa_issue_id: issue.gpa_issue_id,
            edition_variant: edRecord.edition_name,
            grader: gsRecord.grader,
            grade: gsRecord.grade,
            designation: gsRecord.designation,
            observed_year: ya.year,
            displayed_date_text: obs.displayed_date_text,
            displayed_price_text: obs.displayed_price_text,
            certification_number: obs.certification_number,
            evidence_redirect_path: obs.evidence_redirect_path,
          });

          const dateResult = parseGpaDate(obs.displayed_date_text, ya.year);
          const priceResult = parseGpaPrice(obs.displayed_price_text);
          const parsedPrice = obs.parsed_numeric_price || priceResult.numericPrice;
          const currSymbol = obs.displayed_currency_symbol || priceResult.currencySymbol;

          const { error: obsErr } = await supabase
            .from('gpa_sales_observations')
            .upsert(
              {
                observation_fingerprint: fingerprint,
                gpa_yearly_aggregate_id: yaRecord.id,
                gpa_grade_summary_id: gsRecord.id,
                gpa_edition_id: edRecord.id,
                gpa_issue_id: issueRecord.id,
                gpa_title_id: title.gpa_title_id,
                displayed_date_text: obs.displayed_date_text,
                observed_year: ya.year,
                observed_month: dateResult.observed_month,
                observed_day: dateResult.observed_day,
                observed_date: dateResult.observed_date,
                date_precision: dateResult.date_precision,
                displayed_price_text: obs.displayed_price_text,
                parsed_numeric_price: parsedPrice,
                displayed_currency_symbol: currSymbol,
                normalized_currency: obs.normalized_currency || null,
                certification_number: obs.certification_number || null,
                grader: gsRecord.grader,
                grade: gsRecord.grade,
                designation: gsRecord.designation,
                edition_variant: edRecord.edition_name,
                venue: null,
                evidence_redirect_path: obs.evidence_redirect_path || null,
                evidence_url_status: 'UNRESOLVED_REDIRECT',
                raw_payload: obs.raw_payload || null,
              },
              { onConflict: 'observation_fingerprint', ignoreDuplicates: true }
            );

          if (obsErr) {
            if (obsErr.code === '23505') {
              observationsSkippedDuplicate++;
            }
          } else {
            observationsInserted++;
          }
        }
      }
    }
  }

  // 7. Stage Comic Match
  let matchStaged = false;
  let matchCandidate = null;

  try {
    matchCandidate = await findComicMatches(supabase, {
      gpa_title_name: title.title_name,
      gpa_issue_number: issue.issue_number_raw,
      gpa_publication_year: title.publication_year,
    });

    if (matchCandidate) {
      const { error: matchErr } = await supabase.from('gpa_comic_matches').upsert(
        {
          gpa_issue_id: issueRecord.id,
          proposed_comic_id: matchCandidate.comic_id,
          match_method: matchCandidate.match_method,
          match_confidence: matchCandidate.match_confidence,
          match_status: matchCandidate.match_status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'gpa_issue_id,proposed_comic_id' }
      );

      if (!matchErr) {
        matchStaged = true;
      }
    }
  } catch (err) {
    console.warn('Matching check warning:', err);
  }

  return {
    success: true,
    title_id: title.gpa_title_id,
    issue_id: issue.gpa_issue_id,
    editions_count: editionsCount,
    summaries_count: summariesCount,
    aggregates_count: aggregatesCount,
    observations_inserted: observationsInserted,
    observations_skipped_duplicate: observationsSkippedDuplicate,
    match_staged: matchStaged,
    match_status: matchCandidate?.match_status,
    matched_comic_id: matchCandidate?.comic_id,
  };
}
