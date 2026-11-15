import { NextRequest, NextResponse } from 'next/server';
import { upsertSlabCert } from '@/lib/supabase/market-db';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const clean = (v?: string | null) => (v ?? '').trim().replace(/^['"]|['"]$/g, '').trim();
    const secret = clean(process.env.GPA_INGESTION_SECRET);
    const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized. Bearer token required.' }, { status: 401 });
    }
    const token = clean(authHeader.slice('Bearer '.length));
    if ((!secret || token !== secret) && (!serviceKey || token !== serviceKey)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = await req.json();
    const certNumber = String(body?.cert_number || '').trim();
    const grade = String(body?.grade || '').trim();

    if (!certNumber || !grade) {
      return NextResponse.json(
        { error: 'cert_number and grade are required.' },
        { status: 400 }
      );
    }

    const record = await upsertSlabCert({
      certNumber,
      assetId: body?.asset_id ? String(body.asset_id) : null,
      grade,
      labelCategory: body?.label_category ?? null,
      pageQuality: body?.page_quality ?? null,
      gradeDate: body?.grade_date ?? null,
      graderNotes: Array.isArray(body?.grader_notes) ? body.grader_notes : [],
      signatures: Array.isArray(body?.signatures) ? body.signatures : [],
      sale:
        body?.sale_price && body?.sale_date
          ? {
              date: String(body.sale_date),
              price: Number(body.sale_price),
              source: String(body.sale_source || 'cgc'),
            }
          : null,
      frontScanUrl: body?.front_scan_url ?? null,
      backScanUrl: body?.back_scan_url ?? null,
    });

    return NextResponse.json({ success: true, record });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
