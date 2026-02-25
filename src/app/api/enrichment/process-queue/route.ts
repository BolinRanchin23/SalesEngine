import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/enrichment/auth';
import { processQueue } from '@/lib/enrichment/queue-processor';

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processQueue();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
