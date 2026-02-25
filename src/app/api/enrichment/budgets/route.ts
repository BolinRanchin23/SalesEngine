import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBudgetStatus } from '@/lib/enrichment/budget';

export async function GET() {
  try {
    const budgets = await getBudgetStatus();
    return NextResponse.json({ budgets });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, period, budget_limit } = body;

    if (!provider || !period || budget_limit == null) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, period, budget_limit' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const periodStart = period === 'daily'
      ? new Date().toISOString().slice(0, 10)
      : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('enrichment_credit_budgets')
      .update({ budget_limit })
      .eq('provider', provider)
      .eq('period', period)
      .eq('period_start', periodStart)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, budget: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
