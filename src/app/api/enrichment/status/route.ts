import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBudgetStatus } from '@/lib/enrichment/budget';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Queue counts by status
    const { data: queueCounts } = await supabase
      .from('enrichment_queue')
      .select('status')
      .then(({ data }) => {
        const counts = { pending: 0, processing: 0, completed: 0, failed: 0 };
        for (const item of data ?? []) {
          const s = item.status as keyof typeof counts;
          if (s in counts) counts[s]++;
        }
        return { data: counts };
      });

    // Contact enrichment breakdown
    const { data: contactCounts } = await supabase
      .from('contacts')
      .select('enrichment_status')
      .then(({ data }) => {
        const counts = { pending: 0, partial: 0, complete: 0 };
        for (const item of data ?? []) {
          const s = item.enrichment_status as keyof typeof counts;
          if (s in counts) counts[s]++;
        }
        return { data: counts };
      });

    // Budget status
    const budgets = await getBudgetStatus();

    // Recent activity (last 20 enrichment logs)
    const { data: recentActivity } = await supabase
      .from('enrichment_logs')
      .select('id, provider, request_type, status, credits_used, created_at, contact_id, company_id')
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      queue: queueCounts,
      contacts: contactCounts,
      budgets,
      recent_activity: recentActivity ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
