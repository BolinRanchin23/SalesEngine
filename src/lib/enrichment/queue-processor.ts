import { createAdminClient } from '@/lib/supabase/admin';
import { Provider, Operation, ContactEnrichmentData, CompanyEnrichmentData } from './types';
import { checkBudget, consumeCredits } from './budget';
import { buildCacheKey, checkCache, writeCache } from './cache';
import { mergeContactData, mergeCompanyData, writeProvenance, determineEnrichmentStatus } from './merge';
import { RateLimitError, BudgetExhaustedError } from './errors';
import * as apollo from './providers/apollo';
import * as pdl from './providers/pdl';
import * as zerobounce from './providers/zerobounce';

const BATCH_SIZE = 10;
const RETRY_DELAYS = [60, 300, 900]; // 1min, 5min, 15min in seconds

const CONTACT_STATUS_FIELDS = [
  'email', 'title', 'linkedin_url', 'bio', 'headshot_url',
  'work_phone', 'cell_phone', 'work_address',
];

const COMPANY_STATUS_FIELDS = [
  'industry', 'website', 'phone', 'linkedin_url', 'description',
  'hq_address', 'employee_count_range', 'revenue_range',
];

export async function processQueue(): Promise<{ processed: number; failed: number }> {
  const supabase = createAdminClient();
  let processed = 0;
  let failed = 0;

  // Claim a batch of items using advisory lock pattern
  const now = new Date().toISOString();
  const { data: items } = await supabase
    .from('enrichment_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_after', now)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (!items || items.length === 0) return { processed: 0, failed: 0 };

  // Lock items
  const itemIds = items.map((i) => i.id);
  await supabase
    .from('enrichment_queue')
    .update({ status: 'processing', locked_at: now, locked_by: 'queue-processor' })
    .in('id', itemIds);

  for (const item of items) {
    try {
      await processItem(item);
      processed++;
    } catch (err) {
      failed++;
      await handleItemError(item, err);
    }
  }

  return { processed, failed };
}

async function processItem(item: Record<string, unknown>): Promise<void> {
  const supabase = createAdminClient();
  const provider = item.provider as Provider;
  const operation = item.operation as Operation;
  const entityType = item.entity_type as string;
  const entityId = item.entity_id as string;

  // 1. Check budget
  const estimatedCredits = 1;
  await checkBudget(provider, estimatedCredits);

  // 2. Build cache key and check
  const entity = await fetchEntity(entityType, entityId);
  if (!entity) {
    await markComplete(item.id as string);
    return;
  }

  const params = buildProviderParams(entity, entityType);
  const cacheKey = buildCacheKey(provider, operation, params);
  const cached = await checkCache(cacheKey);

  let result;
  if (cached) {
    result = { provider, success: true, credits_used: 0, data: cached, cached: true };
  } else {
    // 3. Call provider
    result = await callProvider(provider, operation, params);

    // 4. Log the enrichment
    await supabase.from('enrichment_logs').insert({
      contact_id: entityType === 'contact' ? entityId : null,
      company_id: entityType === 'company' ? entityId : null,
      provider,
      request_type: operation,
      request_payload: params,
      response_payload: result.data,
      status: result.success ? 'success' : 'error',
      credits_used: result.credits_used,
    });

    // 5. Write cache if successful
    if (result.success && Object.keys(result.data).length > 0) {
      await writeCache(cacheKey, provider, operation, params, result.data);
    }
  }

  // 6. Merge data and update entity
  if (result.success && Object.keys(result.data).length > 0) {
    if (entityType === 'contact') {
      const merged = mergeContactData(entity, result.data as ContactEnrichmentData, provider);
      if (Object.keys(merged).length > 0) {
        const updatedEntity = { ...entity, ...merged };
        const enrichmentStatus = determineEnrichmentStatus(updatedEntity, CONTACT_STATUS_FIELDS);
        await supabase
          .from('contacts')
          .update({ ...merged, enrichment_status: enrichmentStatus, last_enriched_at: new Date().toISOString() })
          .eq('id', entityId);
      }
      await writeProvenance('contact', entityId, provider, result.data);
    } else {
      const merged = mergeCompanyData(entity, result.data as CompanyEnrichmentData, provider);
      if (Object.keys(merged).length > 0) {
        const updatedEntity = { ...entity, ...merged };
        const enrichmentStatus = determineEnrichmentStatus(updatedEntity, COMPANY_STATUS_FIELDS);
        await supabase
          .from('companies')
          .update({ ...merged, enrichment_status: enrichmentStatus, last_enriched_at: new Date().toISOString() })
          .eq('id', entityId);
      }
      await writeProvenance('company', entityId, provider, result.data);
    }
  }

  // 7. Consume credits
  if (result.credits_used > 0 && !result.cached) {
    await consumeCredits(provider, result.credits_used);
  }

  // 8. Mark complete
  await markComplete(item.id as string);
}

async function handleItemError(item: Record<string, unknown>, err: unknown): Promise<void> {
  const supabase = createAdminClient();
  const attempts = (item.attempts as number) + 1;
  const maxAttempts = item.max_attempts as number;

  if (err instanceof RateLimitError) {
    // Reschedule with delay
    const delayMs = err.retryAfterMs || 60000;
    await supabase
      .from('enrichment_queue')
      .update({
        status: 'pending',
        locked_at: null,
        locked_by: null,
        attempts,
        last_error: err.message,
        scheduled_after: new Date(Date.now() + delayMs).toISOString(),
      })
      .eq('id', item.id as string);
    return;
  }

  if (err instanceof BudgetExhaustedError) {
    // Reschedule for tomorrow
    await supabase
      .from('enrichment_queue')
      .update({
        status: 'pending',
        locked_at: null,
        locked_by: null,
        last_error: err.message,
        scheduled_after: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', item.id as string);
    return;
  }

  if (attempts >= maxAttempts) {
    await supabase
      .from('enrichment_queue')
      .update({
        status: 'failed',
        attempts,
        last_error: err instanceof Error ? err.message : String(err),
        completed_at: new Date().toISOString(),
      })
      .eq('id', item.id as string);
  } else {
    // Retry with exponential backoff
    const delaySec = RETRY_DELAYS[attempts - 1] || 900;
    await supabase
      .from('enrichment_queue')
      .update({
        status: 'pending',
        locked_at: null,
        locked_by: null,
        attempts,
        last_error: err instanceof Error ? err.message : String(err),
        scheduled_after: new Date(Date.now() + delaySec * 1000).toISOString(),
      })
      .eq('id', item.id as string);
  }
}

async function markComplete(itemId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('enrichment_queue')
    .update({ status: 'completed', completed_at: new Date().toISOString(), locked_at: null, locked_by: null })
    .eq('id', itemId);
}

async function fetchEntity(entityType: string, entityId: string): Promise<Record<string, unknown> | null> {
  const supabase = createAdminClient();
  const table = entityType === 'contact' ? 'contacts' : 'companies';
  const { data } = await supabase.from(table).select('*').eq('id', entityId).single();
  return data as Record<string, unknown> | null;
}

function buildProviderParams(entity: Record<string, unknown>, entityType: string): Record<string, unknown> {
  if (entityType === 'contact') {
    return {
      first_name: entity.first_name,
      last_name: entity.last_name,
      email: entity.email,
      linkedin_url: entity.linkedin_url,
    };
  }
  return {
    name: entity.name,
    website: entity.website,
    linkedin_url: entity.linkedin_url,
  };
}

async function callProvider(
  provider: Provider,
  operation: Operation,
  params: Record<string, unknown>
) {
  switch (provider) {
    case 'apollo':
      if (operation === 'enrich_person' || operation === 'find_email') {
        return apollo.enrichPerson(params);
      }
      return apollo.enrichCompany(params);

    case 'pdl':
      if (operation === 'enrich_person') {
        return pdl.enrichPerson(params);
      }
      // PDL has no company enrichment
      return { provider: 'pdl' as const, success: false, credits_used: 0, data: {}, cached: false };

    case 'zerobounce': {
      const email = params.email as string;
      if (!email) {
        return { provider: 'zerobounce' as const, success: false, credits_used: 0, data: {}, cached: false };
      }
      const result = await zerobounce.verifySingle(email);
      return {
        provider: 'zerobounce' as const,
        success: true,
        credits_used: 1,
        data: { email_status: result.status } as Record<string, unknown>,
        cached: false,
      };
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
