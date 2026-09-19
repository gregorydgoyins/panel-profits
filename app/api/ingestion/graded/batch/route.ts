/**
 * app/api/ingestion/graded/batch/route.ts
 * Panel Profits Graded Collector — Generic Multi-Provider Batch Ingestion API
 *
 * Accepts batches from all 4 providers: gpa, cbcs, psa, gocollect
 * Each batch contains: raw evidence + normalized observations
 *
 * Authentication: GPA_INGESTION_SECRET (same secret, multi-provider)
 *
 * Request body (JSON):
 * {
 *   provider: 'gpa' | 'cbcs' | 'psa' | 'gocollect',
 *   gradingCompany: 'cgc' | 'cbcs' | 'psa' | 'pgx' | 'raw' | null,
 *   rawEvidence: RawEvidenceRecord[],
 *   censusSnapshots: CensusSnapshot[],    // optional
 *   censuRows: CensusRow[],               // optional
 *   certifications: Certification[],      // optional
 *   salesObservations: SaleObservation[], // optional
 *   indexObservations: IndexObservation[], // optional
 *   gpa_batch?: GpaLegacyBatch,          // backward compat: old GPA format
 * }
 *
 * Each section has its own idempotency mechanism:
 *   - Raw evidence: upsert on response_hash + source_url
 *   - Census: upsert on snapshot fingerprint
 *   - Certifications: upsert on grading_company + cert_number
 *   - Sales: upsert on observation_fingerprint
 *   - Index observations: upsert on index_id + observation_date
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INGESTION_SECRET = process.env.GPA_INGESTION_SECRET!;

const VALID_PROVIDERS = ['gpa', 'cbcs', 'psa', 'gocollect', 'pricecharting'];
const VALID_GRADERS = ['cgc', 'cbcs', 'psa', 'pgx', 'raw', null];

// ─── Type Guards ──────────────────────────────────────────────────────────────

function isValidProvider(p: unknown): p is string {
  return typeof p === 'string' && VALID_PROVIDERS.includes(p);
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function getProviderId(providerSlug: string): Promise<string | null> {
  const { data } = await supabase
    .from('graded_providers')
    .select('id')
    .eq('slug', providerSlug)
    .single();
  return data?.id ?? null;
}

async function getGradingCompanyId(slug: string | null): Promise<string | null> {
  if (!slug) return null;
  const { data } = await supabase
    .from('grading_companies')
    .select('id')
    .eq('slug', slug)
    .single();
  return data?.id ?? null;
}

async function ingestRawEvidence(records: any[], providerId: string): Promise<{ inserted: number; deduped: number; errors: string[] }> {
  if (!records?.length) return { inserted: 0, deduped: 0, errors: [] };
  
  let inserted = 0, deduped = 0;
  const errors: string[] = [];

  for (const rec of records) {
    const sourceUrl = rec.sourceUrl || rec.source_url;
    const responseHash = rec.responseHash || rec.response_hash;
    if (!sourceUrl || !responseHash) {
      errors.push('raw_evidence: sourceUrl and responseHash are required');
      continue;
    }
    const { data: existing, error: lookupError } = await supabase
      .from('graded_source_payloads')
      .select('id')
      .eq('provider_id', providerId)
      .eq('source_url', sourceUrl)
      .eq('response_hash', responseHash)
      .limit(1);
    if (lookupError) { errors.push(`raw_evidence lookup: ${lookupError.message}`); continue; }
    if (existing?.length) { deduped++; continue; }
    const { error } = await supabase
      .from('graded_source_payloads')
      .insert({
        provider_id: providerId,
        source_url: sourceUrl,
        http_method: rec.httpMethod || rec.http_method || 'GET',
        request_body_hash: rec.requestBodyHash || rec.request_body_hash || null,
        request_fingerprint: rec.requestFingerprint || rec.request_fingerprint || null,
        response_hash: responseHash,
        http_status: rec.httpStatus || rec.http_status || 200,
        collection_timestamp: rec.collectionTimestamp || rec.collection_timestamp || new Date().toISOString(),
        source_as_of: rec.sourceAsOfTimestamp || rec.source_as_of_timestamp || null,
        extraction_version: rec.extractionVersion || rec.extraction_version || '1.0.0',
        ...(typeof (rec.rawPayload ?? rec.raw_payload) === 'string'
          ? { raw_text: rec.rawPayload ?? rec.raw_payload }
          : { raw_json: rec.rawPayload ?? rec.raw_payload ?? {} }),
        completeness_status: rec.completenessStatus || rec.completeness_status || 'complete',
        transformation_warnings: rec.transformationWarnings || rec.transformation_warnings || [],
        parent_payload_id: rec.parentEvidenceId || rec.parent_evidence_id || null,
      });
    
    if (error) {
      if (error.code === '23505') deduped++;
      else errors.push(`raw_evidence: ${error.message}`);
    } else {
      inserted++;
    }
  }
  
  return { inserted, deduped, errors };
}

async function ingestCensusSnapshots(snapshots: any[], rows: any[], providerId: string, gradingCompanyId: string | null): Promise<{ inserted: number; deduped: number; errors: string[] }> {
  if (!snapshots?.length) return { inserted: 0, deduped: 0, errors: [] };

  let inserted = 0, deduped = 0;
  const errors: string[] = [];

  for (const snap of snapshots) {
    const { data: snapData, error: snapError } = await supabase
      .from('graded_census_snapshots')
      .upsert({
        provider_id: providerId,
        grading_company_id: gradingCompanyId,
        snapshot_timestamp: snap.snapshotTimestamp || snap.snapshot_timestamp || new Date().toISOString(),
        provider_title_id: snap.providerTitleId || snap.provider_title_id || null,
        provider_issue_id: snap.providerIssueId || snap.provider_issue_id || null,
        provider_edition_id: snap.gpaEditionId || snap.gpa_edition_id || null,
        title_name: snap.titleName || snap.title_name || null,
        issue_number_raw: snap.issueNumber || snap.issue_number_raw || null,
        source_url: snap.sourceUrl || snap.source_url || null,
        raw_evidence_id: snap.rawEvidenceId || snap.source_payload_id || null,
        total_graded: snap.totalGraded ?? snap.total_graded ?? null,
      })
      .select('id')
      .single();

    if (snapError) {
      if (snapError.code === '23505') { deduped++; continue; }
      errors.push(`census_snapshot: ${snapError.message}`);
      continue;
    }

    inserted++;
    const snapId = snapData?.id;

    // Insert census rows for this snapshot
    const snapRows = rows?.filter(r => r.snapshotFingerprint === (snap.snapshotFingerprint || snap.snapshot_fingerprint) || r.snapshotId === snapId);
    if (snapId && snapRows?.length) {
      const rowInserts = snapRows.map(r => ({
        snapshot_id: snapId,
        provider_id: providerId,
        grading_company_id: gradingCompanyId,
        native_grade_text: r.nativeGradeText || r.native_grade_text,
        grade_numeric: r.gradeNumeric ?? r.grade_numeric ?? null,
        native_designation: r.nativeDesignation || r.native_designation || null,
        count_at_grade: r.countAtGrade ?? r.count_at_grade ?? 0,
        count_higher: r.countHigher || r.count_higher || null,
        page_quality: r.pageQuality || r.page_quality || null,
        has_restoration: r.hasRestoration ?? r.has_restoration ?? null,
        has_conservation: r.hasConservation ?? r.has_conservation ?? null,
        has_signature: r.hasSignature ?? r.has_signature ?? null,
        qualifier: r.qualifier || null,
        raw_evidence_id: r.rawEvidenceId || r.raw_evidence_id || null,
      }));
      
      const { error: rowError } = await supabase
        .from('graded_census_rows')
        .insert(rowInserts);
      
      if (rowError) errors.push(`census_rows: ${rowError.message}`);
    }
  }
  
  return { inserted, deduped, errors };
}

async function ingestCertifications(certs: any[], providerId: string, gradingCompanyId: string | null): Promise<{ inserted: number; deduped: number; errors: string[] }> {
  if (!certs?.length) return { inserted: 0, deduped: 0, errors: [] };

  let inserted = 0, deduped = 0;
  const errors: string[] = [];

  for (const cert of certs) {
    const certificationNumber = String(cert.certificationNumber || cert.certification_number || '');
    if (!certificationNumber) { errors.push('cert: certificationNumber is required'); continue; }
    const { data: existing, error: lookupError } = await supabase
      .from('graded_certifications')
      .select('id')
      .eq('grading_company_id', gradingCompanyId)
      .eq('certification_number', certificationNumber)
      .limit(1);
    if (lookupError) { errors.push(`cert lookup: ${lookupError.message}`); continue; }
    const { error } = await supabase
      .from('graded_certifications')
      .upsert({
        grading_company_id: gradingCompanyId,
        provider_id: providerId,
        certification_number: certificationNumber,
        title_name: cert.comicTitle || cert.title_name || null,
        issue_number_raw: cert.issueNumber || cert.issue_number || cert.issue_number_raw || null,
        variant_name: cert.variantName || cert.variant_name || null,
        native_grade_text: cert.nativeGradeText || cert.native_grade_text || null,
        grade_numeric: cert.gradeNumeric ?? cert.grade_numeric ?? null,
        native_designation: cert.nativeDesignation || cert.native_designation || null,
        page_quality: cert.pageQuality || cert.page_quality || null,
        has_restoration: cert.hasRestoration ?? cert.has_restoration ?? null,
        restoration_detail: cert.restorationDetail || cert.restoration_detail || null,
        has_conservation: cert.hasConservation ?? cert.has_conservation ?? null,
        has_signature: cert.hasSignature ?? cert.has_signature ?? null,
        pedigree_name: cert.pedigreeName || cert.pedigree_name || null,
        grader_notes: cert.graderNotes || cert.grader_notes || null,
        asp_status: cert.aspStatus ?? cert.asp_status ?? null,
        vsp_status: cert.vspStatus ?? cert.vsp_status ?? null,
        qualifier: cert.qualifier ?? cert.psa_qualifier ?? null,
        autograph_status: cert.autographStatus || cert.autograph_status || null,
        cert_url: cert.certUrl || cert.cert_url || null,
        raw_evidence_id: cert.rawEvidenceId || cert.raw_evidence_id || null,
        ...(existing?.length ? {} : { first_seen_at: new Date().toISOString() }),
        last_verified_at: new Date().toISOString(),
      }, {
        onConflict: 'certification_number,grading_company_id',
        ignoreDuplicates: false,
      });
    
    if (error) {
      if (error.code === '23505') deduped++;
      else errors.push(`cert: ${error.message}`);
    } else if (existing?.length) {
      deduped++;
    } else {
      inserted++;
    }
  }
  
  return { inserted, deduped, errors };
}

async function ingestSalesObservations(sales: any[], providerId: string, gradingCompanyId: string | null): Promise<{ inserted: number; deduped: number; errors: string[] }> {
  if (!sales?.length) return { inserted: 0, deduped: 0, errors: [] };

  let inserted = 0, deduped = 0;
  const errors: string[] = [];

  for (const sale of sales) {
    const { data, error } = await supabase
      .from('graded_sales_observations')
      .upsert({
        provider_id: providerId,
        grading_company_id: gradingCompanyId,
        observation_fingerprint: sale.observationFingerprint || sale.observation_fingerprint || sale.fingerprint,
        sale_date_text: sale.saleDateText || sale.sale_date_text || null,
        sale_date: sale.saleDate || sale.sale_date || null,
        sale_year: sale.saleYear || sale.sale_year || null,
        sale_price: sale.salePrice || sale.sale_price || sale.price || null,
        currency: sale.currency || 'USD',
        venue: sale.venue || null,
        sale_type: sale.saleType || sale.sale_type || 'completed_sale',
        certification_number: sale.certificationNumber || sale.certification_number || sale.cgcId || sale.cgc_id || null,
        page_quality: sale.pageQuality || sale.page_quality || sale.pq || null,
        has_restoration: sale.hasRestoration ?? sale.has_restoration ?? null,
        has_signature: sale.hasSignature ?? sale.has_signature ?? null,
        pedigree_name: sale.pedigreeName || sale.pedigree_name || null,
        evidence_path: sale.evidencePath || sale.evidence_path || sale.priceUrl || sale.price_url || null,
        provider_sale_id: sale.providerSaleId || sale.provider_sale_id || sale.linkId || sale.link_id || null,
        provider_title_id: sale.providerTitleId || sale.provider_title_id || null,
        provider_issue_id: sale.providerIssueId || sale.provider_issue_id || null,
        edition_name: sale.editionName || sale.edition_name || null,
        provider_serial: sale.providerSerial || sale.provider_serial || null,
        raw_evidence_id: sale.rawEvidenceId || sale.raw_evidence_id || null,
        native_grade_text: sale.nativeGradeText || sale.native_grade_text || null,
        grade_numeric: sale.gradeNumeric || sale.grade_numeric || null,
        native_designation: sale.nativeDesignation || sale.native_designation || null,
        title_name: sale.titleName || sale.title_name || sale.comicTitle || null,
        issue_number_raw: sale.issueNumberRaw || sale.issueNumber || sale.issue_number || sale.issue_number_raw || null,
      }, {
        onConflict: 'observation_fingerprint',
        ignoreDuplicates: true,
      }).select('id');
    
    if (error) {
      if (error.code === '23505') deduped++;
      else errors.push(`sale: ${error.message}`);
    } else if (data?.length) {
      inserted++;
    } else {
      deduped++;
    }
  }
  
  return { inserted, deduped, errors };
}

async function ingestIndexObservations(observations: any[], providerId: string): Promise<{ inserted: number; deduped: number; errors: string[] }> {
  if (!observations?.length) return { inserted: 0, deduped: 0, errors: [] };

  let inserted = 0, deduped = 0;
  const errors: string[] = [];

  for (const obs of observations) {
    // Upsert the index definition first
    const providerIndexId = obs.providerIndexId || obs.provider_index_id;
    if (!providerIndexId) { errors.push('index_def: provider index ID is required'); continue; }
    
    const { data: indexDef } = await supabase
      .from('graded_index_definitions')
      .upsert({
        provider_id: providerId,
        index_name: obs.indexName || obs.index_name,
        index_type: obs.indexType || obs.index_type || 'cpi',
        provider_index_id: providerIndexId,
        description: obs.description || null,
      }, {
        onConflict: 'provider_id,provider_index_id',
        ignoreDuplicates: false,
      })
      .select('id')
      .single();

    if (!indexDef?.id) { errors.push(`index_def: could not upsert for ${providerIndexId}`); continue; }

    const { error } = await supabase
      .from('graded_index_observations')
      .upsert({
        index_id: indexDef.id,
        provider_id: providerId,
        observation_date: obs.observationDate || obs.observation_date,
        index_value: obs.indexValue ?? obs.index_value,
        point_change: obs.pointChange || obs.point_change || null,
        pct_change: obs.pctChange || obs.pct_change || null,
        is_revision: obs.isRevision ?? obs.is_revision ?? false,
        raw_evidence_id: obs.rawEvidenceId || obs.source_payload_id || null,
      }, {
        onConflict: 'index_id,observation_date,is_revision',
        ignoreDuplicates: false,
      });
    
    if (error) {
      if (error.code === '23505') deduped++;
      else errors.push(`index_obs: ${error.message}`);
    } else {
      inserted++;
    }
  }
  
  return { inserted, deduped, errors };
}

// ─── Legacy GPA Batch Handler (backward compat) ────────────────────────────────

async function ingestLegacyGpaBatch(batch: any, providerId: string, gradingCompanyId: string | null): Promise<object> {
  // The old GPA ingestion format from /api/ingestion/gpa/batch
  // Map to the new schema
  const sales = (batch.sales || []).map((s: any) => ({
    ...s,
    observation_fingerprint: s.fingerprint || s.observationFingerprint,
    provider_id: providerId,
    grading_company_id: gradingCompanyId,
  }));
  
  return ingestSalesObservations(sales, providerId, gradingCompanyId);
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  const auth = req.headers.get('Authorization') || '';
  const secret = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!INGESTION_SECRET || secret !== INGESTION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const provider = body.provider || 'gpa';
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: `Unknown provider: ${provider}. Valid: ${VALID_PROVIDERS.join(', ')}` }, { status: 400 });
  }

  // Resolve provider + grading company IDs
  const [providerId, gradingCompanyId] = await Promise.all([
    getProviderId(provider),
    getGradingCompanyId(body.gradingCompany || body.grading_company || null),
  ]);

  if (!providerId) {
    return NextResponse.json({ error: `Provider not found in DB: ${provider}` }, { status: 500 });
  }
  const hasGradedRecords = [body.salesObservations, body.sales_observations, body.certifications, body.censusSnapshots, body.census_snapshots, body.censusRows, body.census_rows]
    .some((records) => Array.isArray(records) && records.length > 0) || Boolean(body.gpa_batch);
  if (hasGradedRecords && !gradingCompanyId) {
    return NextResponse.json({ error: 'Known gradingCompany required for graded records' }, { status: 400 });
  }

  // Run ingestion sections in parallel
  const [
    evidenceResult,
    censusResult,
    certResult,
    salesResult,
    indexResult,
  ] = await Promise.all([
    ingestRawEvidence(body.rawEvidence || body.raw_evidence || [], providerId),
    ingestCensusSnapshots(body.censusSnapshots || body.census_snapshots || [], body.censusRows || body.census_rows || [], providerId, gradingCompanyId),
    ingestCertifications(body.certifications || [], providerId, gradingCompanyId),
    body.gpa_batch
      ? ingestLegacyGpaBatch(body.gpa_batch, providerId, gradingCompanyId)
      : ingestSalesObservations(body.salesObservations || body.sales_observations || [], providerId, gradingCompanyId),
    ingestIndexObservations(body.indexObservations || body.index_observations || [], providerId),
  ]);

  // Record ingestion run
  const allErrors = [
    ...(evidenceResult.errors || []),
    ...((censusResult as any).errors || []),
    ...((certResult as any).errors || []),
    ...((salesResult as any).errors || []),
    ...((indexResult as any).errors || []),
  ];

  const { error: runError } = await supabase.from('graded_ingestion_runs').insert({
    provider_id: providerId,
    grading_company_id: gradingCompanyId,
    status: allErrors.length === 0 ? 'completed' : 'partial',
    items_discovered: (body.rawEvidence?.length || 0) + (body.salesObservations?.length || 0) + (body.certifications?.length || 0),
    items_extracted: (evidenceResult.inserted || 0) + ((salesResult as any).inserted || 0) + ((certResult as any).inserted || 0),
    items_ingested: (evidenceResult.inserted || 0) + ((salesResult as any).inserted || 0) + ((certResult as any).inserted || 0),
    items_skipped: (evidenceResult.deduped || 0) + ((salesResult as any).deduped || 0) + ((certResult as any).deduped || 0),
    items_errored: allErrors.length,
    error_summary: allErrors.length ? allErrors.slice(0, 10).join('; ') : null,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  });
  if (runError) allErrors.push(`ingestion_run: ${runError.message}`);

  return NextResponse.json({
    provider,
    gradingCompany: body.gradingCompany || null,
    rawEvidence: evidenceResult,
    census: censusResult,
    certifications: certResult,
    sales: salesResult,
    indexes: indexResult,
    errors: allErrors.slice(0, 20),
  }, { status: allErrors.length ? 207 : 200 });
}
