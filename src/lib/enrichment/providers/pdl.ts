import { PersonEnrichParams, EnrichmentResult } from '../types';
import { ProviderError, RateLimitError } from '../errors';
import { mapPdlPersonToContact } from './mappers';

const BASE_URL = 'https://api.peopledatalabs.com/v5';

function getApiKey(): string {
  const key = process.env.PDL_API_KEY;
  if (!key) throw new Error('PDL_API_KEY not configured');
  return key;
}

export async function enrichPerson(params: PersonEnrichParams): Promise<EnrichmentResult> {
  const searchParams = new URLSearchParams();
  searchParams.set('min_likelihood', '6');
  searchParams.set('required', 'experience');

  if (params.linkedin_url) {
    searchParams.set('profile', params.linkedin_url);
  } else if (params.email) {
    searchParams.set('email', params.email);
  } else if (params.first_name && params.last_name && params.company_name) {
    searchParams.set('first_name', params.first_name);
    searchParams.set('last_name', params.last_name);
    searchParams.set('company', params.company_name);
  } else {
    return { provider: 'pdl', success: false, credits_used: 0, data: {}, cached: false };
  }

  const url = `${BASE_URL}/person/enrich?${searchParams.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': getApiKey(),
      'Accept': 'application/json',
    },
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000;
    throw new RateLimitError('pdl', delayMs);
  }

  if (res.status === 404) {
    return { provider: 'pdl', success: false, credits_used: 0, data: {}, cached: false };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderError('pdl', `HTTP ${res.status}: ${text}`, res.status);
  }

  const body = await res.json();
  const person = body.data ?? body;

  return {
    provider: 'pdl',
    success: true,
    credits_used: 1,
    data: mapPdlPersonToContact(person as Record<string, unknown>) as unknown as Record<string, unknown>,
    cached: false,
  };
}
