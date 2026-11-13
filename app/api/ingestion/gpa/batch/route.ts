import { NextRequest, NextResponse } from 'next/server';
import { createAdminServerClient } from '@/lib/supabase/admin';
import { processGpaBatchIngestion } from '@/lib/gpa/ingest';
import { GpaBatchIngestionPayload } from '@/lib/gpa/types';

async function logRun(status: string, error: string | null, body: any, summary?: unknown) {
  try {
    await createAdminServerClient().from('job_runs').insert({
      job: 'gpa-ingest',
      status,
      error,
      params: {
        title: body?.title ?? null,
        issue: body?.issue ?? null,
        editions: Array.isArray(body?.editions) ? body.editions.length : null,
        keys: body && typeof body === 'object' ? Object.keys(body) : null,
      },
      summary: summary ?? null,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    });
  } catch {
    /* logging must never break ingestion */
  }
}

export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    const authHeader = req.headers.get('authorization');
    const clean = (v?: string | null) => (v ?? '').trim().replace(/^['"]|['"]$/g, '').trim();
    const secret = clean(process.env.GPA_INGESTION_SECRET);
    const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!secret) {
      return NextResponse.json({ error: 'GPA_INGESTION_SECRET is not set on the server.' }, { status: 500 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized. Bearer token required.' },
        { status: 401 }
      );
    }

    const token = clean(authHeader.slice('Bearer '.length));
    if (token !== secret && (!serviceKey || token !== serviceKey)) {
      return NextResponse.json(
        { error: `Forbidden. Token does not match GPA_INGESTION_SECRET (server value is ${secret.length} chars, sent ${token.length}).` },
        { status: 403 }
      );
    }

    body = (await req.json()) as GpaBatchIngestionPayload;
    if (!body || !body.title || !body.issue) {
      await logRun('error', 'Invalid payload: title and issue objects are required.', body);
      return NextResponse.json(
        { error: 'Invalid payload: title and issue objects are required.' },
        { status: 400 }
      );
    }
    body.title.gpa_title_id = Number(body.title.gpa_title_id);
    body.issue.gpa_issue_id = Number(body.issue.gpa_issue_id);
    if (!Number.isFinite(body.title.gpa_title_id) || !Number.isFinite(body.issue.gpa_issue_id)) {
      await logRun('error', 'gpa_title_id / gpa_issue_id not numeric', body);
      return NextResponse.json({ error: 'gpa_title_id and gpa_issue_id must be numeric.' }, { status: 400 });
    }

    const supabase = createAdminServerClient();

    const result = await processGpaBatchIngestion(supabase, body);
    await logRun(result.success ? 'ok' : 'error', result.error ?? null, body, result);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('GPA batch ingestion error:', error);
    await logRun('error', error?.message || String(error), body);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error during GPA ingestion',
      },
      { status: 500 }
    );
  }
}
