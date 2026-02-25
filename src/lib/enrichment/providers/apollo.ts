import { PersonEnrichParams, CompanyEnrichParams, EnrichmentResult } from '../types';
import { ProviderError, RateLimitError } from '../errors';
import { mapApolloPersonToContact, mapApolloOrgToCompany } from './mappers';

const BASE_URL = 'https://api.apollo.io';

function getApiKey(): string {
  const key = process.env.APOLLO_API_KEY;
  if (!key) throw new Error('APOLLO_API_KEY not configured');
  return key;
}

async function apolloRequest(path: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '60', 10);
    throw new RateLimitError('apollo', retryAfter * 1000);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderError('apollo', `HTTP ${res.status}: ${text}`, res.status);
  }

  return res.json();
}

export async function enrichPerson(params: PersonEnrichParams): Promise<EnrichmentResult> {
  const body: Record<string, unknown> = {};
  if (params.first_name) body.first_name = params.first_name;
  if (params.last_name) body.last_name = params.last_name;
  if (params.email) body.email = params.email;
  if (params.linkedin_url) body.linkedin_url = params.linkedin_url;
  if (params.company_name) body.organization_name = params.company_name;
  if (params.domain) body.domain = params.domain;

  const response = await apolloRequest('/api/v1/people/match', body) as Record<string, unknown>;
  const person = response.person as Record<string, unknown> | null;

  if (!person) {
    return { provider: 'apollo', success: false, credits_used: 0, data: {}, cached: false };
  }

  return {
    provider: 'apollo',
    success: true,
    credits_used: 1,
    data: mapApolloPersonToContact(person) as unknown as Record<string, unknown>,
    cached: false,
  };
}

export async function enrichCompany(params: CompanyEnrichParams): Promise<EnrichmentResult> {
  const body: Record<string, unknown> = {};
  if (params.domain) body.domain = params.domain;
  if (params.name) body.organization_name = params.name;

  const response = await apolloRequest('/api/v1/organizations/enrich', body) as Record<string, unknown>;
  const org = response.organization as Record<string, unknown> | null;

  if (!org) {
    return { provider: 'apollo', success: false, credits_used: 0, data: {}, cached: false };
  }

  return {
    provider: 'apollo',
    success: true,
    credits_used: 1,
    data: mapApolloOrgToCompany(org) as unknown as Record<string, unknown>,
    cached: false,
  };
}
