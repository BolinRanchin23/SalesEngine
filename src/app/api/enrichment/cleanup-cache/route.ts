import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/enrichment/auth';
import { cleanupExpiredCache } from '@/lib/enrichment/cache';

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const removed = await cleanupExpiredCache();
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
