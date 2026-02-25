import { createAdminClient } from '@/lib/supabase/admin';
import { Provider } from './types';
import { BudgetExhaustedError } from './errors';

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export async function checkBudget(provider: Provider, creditsNeeded: number): Promise<void> {
  const supabase = createAdminClient();

  // Check daily budget
  const { data: daily } = await supabase
    .from('enrichment_credit_budgets')
    .select('credits_used, budget_limit')
    .eq('provider', provider)
    .eq('period', 'daily')
    .eq('period_start', todayDate())
    .single();

  if (daily && daily.credits_used + creditsNeeded > daily.budget_limit) {
    throw new BudgetExhaustedError(provider, 'daily');
  }

  // Check monthly budget
  const { data: monthly } = await supabase
    .from('enrichment_credit_budgets')
    .select('credits_used, budget_limit')
    .eq('provider', provider)
    .eq('period', 'monthly')
    .eq('period_start', monthStartDate())
    .single();

  if (monthly && monthly.credits_used + creditsNeeded > monthly.budget_limit) {
    throw new BudgetExhaustedError(provider, 'monthly');
  }
}

export async function consumeCredits(provider: Provider, amount: number): Promise<void> {
  const supabase = createAdminClient();

  // Atomically increment daily
  const { data: dailyResult } = await supabase.rpc('increment_credit_usage', {
    p_provider: provider,
    p_period: 'daily',
    p_period_start: todayDate(),
    p_amount: amount,
  });

  if (!dailyResult || dailyResult.length === 0) {
    throw new BudgetExhaustedError(provider, 'daily');
  }

  // Atomically increment monthly
  const { data: monthlyResult } = await supabase.rpc('increment_credit_usage', {
    p_provider: provider,
    p_period: 'monthly',
    p_period_start: monthStartDate(),
    p_amount: amount,
  });

  if (!monthlyResult || monthlyResult.length === 0) {
    throw new BudgetExhaustedError(provider, 'monthly');
  }
}

export async function getBudgetStatus(provider?: Provider) {
  const supabase = createAdminClient();
  let query = supabase
    .from('enrichment_credit_budgets')
    .select('*')
    .in('period_start', [todayDate(), monthStartDate()])
    .order('provider')
    .order('period');

  if (provider) {
    query = query.eq('provider', provider);
  }

  const { data } = await query;
  return data ?? [];
}
