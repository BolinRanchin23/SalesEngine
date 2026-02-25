import { PersonEnrichParams, CompanyEnrichParams, EnrichmentResult } from '../types';
import { ProviderError, RateLimitError } from '../errors';
import { mapProxyCurlPersonToContact, mapProxyCurlCompanyToCompany } from './mappers';

const BASE_URL = 'https://nubela.co/proxycurl/api';

function getApiKey(): string {
  const key = process.env.PROXYCURL_API_KEY;
  if (!key) throw new Error('PROXYCURL_API_KEY not configured');
  return key;
}

async function proxycurlGet(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  });

  if (res.status === 429) {
    throw new RateLimitError('proxycurl', 1000);
  }

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderError('proxycurl', `HTTP ${res.status}: ${text}`, res.status);
  }

  return res.json();
}

export async function enrichPerson(params: PersonEnrichParams): Promise<EnrichmentResult> {
  if (!params.linkedin_url) {
    // Try reverse email lookup to find LinkedIn URL first
    if (params.email) {
      const resolved = await resolveEmailToLinkedIn(params.email);
      if (resolved) {
        params = { ...params, linkedin_url: resolved };
      } else {
        return { provider: 'proxycurl', success: false, credits_used: 0, data: {}, cached: false };
      }
    } else {
      return { provider: 'proxycurl', success: false, credits_used: 0, data: {}, cached: false };
    }
  }

  const response = await proxycurlGet('/v2/linkedin', {
    linkedin_profile_url: params.linkedin_url!,
    use_cache: 'if-present',
    fallback_to_cache: 'on-error',
    skills: 'include',
    personal_email: 'include',
    personal_contact_number: 'include',
  });

  if (!response) {
    return { provider: 'proxycurl', success: false, credits_used: 0, data: {}, cached: false };
  }

  return {
    provider: 'proxycurl',
    success: true,
    credits_used: 3,
    data: mapProxyCurlPersonToContact(response as Record<string, unknown>) as unknown as Record<string, unknown>,
    cached: false,
  };
}

export async function enrichCompany(params: CompanyEnrichParams): Promise<EnrichmentResult> {
  if (!params.linkedin_url) {
    return { provider: 'proxycurl', success: false, credits_used: 0, data: {}, cached: false };
  }

  const response = await proxycurlGet('/linkedin/company', {
    url: params.linkedin_url,
    use_cache: 'if-present',
  });

  if (!response) {
    return { provider: 'proxycurl', success: false, credits_used: 0, data: {}, cached: false };
  }

  return {
    provider: 'proxycurl',
    success: true,
    credits_used: 1,
    data: mapProxyCurlCompanyToCompany(response as Record<string, unknown>) as unknown as Record<string, unknown>,
    cached: false,
  };
}

export async function resolveEmailToLinkedIn(email: string): Promise<string | null> {
  const response = await proxycurlGet('/linkedin/profile/resolve/email', {
    work_email: email,
    lookup_depth: 'deep',
  });

  if (!response) return null;
  const data = response as Record<string, unknown>;
  return (data.linkedin_profile_url as string) || null;
}
