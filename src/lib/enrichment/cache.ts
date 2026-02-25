import { createAdminClient } from '@/lib/supabase/admin';
import { Provider, Operation } from './types';

const TTL_HOURS: Record<string, number> = {
  enrich_person: 72,
  enrich_company: 168,
  verify_email: 720,
  find_email: 72,
};

export function buildCacheKey(
  provider: Provider,
  operation: Operation,
  params: Record<string, unknown>
): string {
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      if (params[key] != null && params[key] !== '') {
        acc[key] = String(params[key]).toLowerCase().trim();
      }
      return acc;
    }, {} as Record<string, string>);
  return `${provider}:${operation}:${JSON.stringify(sorted)}`;
}

export async function checkCache(
  cacheKey: string
): Promise<Record<string, unknown> | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('enrichment_cache')
    .select('response_data, expires_at')
    .eq('cache_key', cacheKey)
    .single();

  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return data.response_data as Record<string, unknown>;
}

export async function writeCache(
  cacheKey: string,
  provider: Provider,
  operation: Operation,
  requestParams: Record<string, unknown>,
  responseData: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();
  const ttlHours = TTL_HOURS[operation] || 72;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

  await supabase.from('enrichment_cache').upsert(
    {
      cache_key: cacheKey,
      provider,
      operation,
      request_params: requestParams,
      response_data: responseData,
      expires_at: expiresAt,
    },
    { onConflict: 'cache_key' }
  );
}

export async function cleanupExpiredCache(): Promise<number> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('enrichment_cache')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');
  return data?.length ?? 0;
}
