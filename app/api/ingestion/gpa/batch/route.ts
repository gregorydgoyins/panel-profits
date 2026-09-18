import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processGpaBatchIngestion } from '@/lib/gpa/ingest';
import { GpaBatchIngestionPayload } from '@/lib/gpa/types';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const secret = process.env.GPA_INGESTION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-gpa-ingestion-secret';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized. Bearer token required.' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (token !== secret && token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Forbidden. Invalid ingestion authorization token.' },
        { status: 403 }
      );
    }

    const body = (await req.json()) as GpaBatchIngestionPayload;
    if (!body || !body.title || !body.issue) {
      return NextResponse.json(
        { error: 'Invalid payload: title and issue objects are required.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      '';

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const result = await processGpaBatchIngestion(supabase, body);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('GPA batch ingestion error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error during GPA ingestion',
      },
      { status: 500 }
    );
  }
}
