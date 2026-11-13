import { NextRequest, NextResponse } from 'next/server';
import { createAdminServerClient } from '@/lib/supabase/admin';

// Crawler diagnostics from the GPA Chrome extension (resolution / verification failures).
export async function POST(req: NextRequest) {
  const clean = (v?: string | null) => (v ?? '').trim().replace(/^['"]|['"]$/g, '').trim();
  const secret = clean(process.env.GPA_INGESTION_SECRET);
  const token = clean((req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const json = JSON.stringify(body ?? null);
  const now = new Date().toISOString();
  await createAdminServerClient().from('job_runs').insert({
    job: 'gpa-crawl',
    status: 'error',
    params: json.length > 20000 ? { truncated: json.slice(0, 20000) } : body,
    error: (body as { stage?: string })?.stage ?? null,
    started_at: now,
    finished_at: now,
  });
  return NextResponse.json({ ok: true });
}
