import { NextRequest, NextResponse } from 'next/server';
import { createAdminServerClient } from '@/lib/supabase/admin';

// Target lists for the GPA Chrome extension (rows in public.gpa_target_lists).
export async function GET(req: NextRequest) {
  const clean = (v?: string | null) => (v ?? '').trim().replace(/^['"]|['"]$/g, '').trim();
  const secret = clean(process.env.GPA_INGESTION_SECRET);
  const token = clean((req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const list = req.nextUrl.searchParams.get('list') || '';
  if (!/^[a-z0-9_-]{1,40}$/.test(list)) {
    return NextResponse.json({ error: 'Unknown list' }, { status: 400 });
  }
  const { data, error } = await createAdminServerClient()
    .from('gpa_target_lists')
    .select('rank, series, issue, year_min, year_max, note')
    .eq('list', list)
    .order('rank', { ascending: true })
    .limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ list, count: data?.length ?? 0, targets: data ?? [] });
}
