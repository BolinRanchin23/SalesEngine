import { EmailVerificationResult } from '../types';
import { ProviderError, RateLimitError } from '../errors';

const BASE_URL = 'https://api.zerobounce.net/v2';

function getApiKey(): string {
  const key = process.env.ZEROBOUNCE_API_KEY;
  if (!key) throw new Error('ZEROBOUNCE_API_KEY not configured');
  return key;
}

async function zbGet(path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('api_key', getApiKey());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());

  if (res.status === 429) {
    throw new RateLimitError('zerobounce', 1000);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderError('zerobounce', `HTTP ${res.status}: ${text}`, res.status);
  }

  return res.json();
}

async function zbPost(path: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: getApiKey(), ...body }),
  });

  if (res.status === 429) {
    throw new RateLimitError('zerobounce', 1000);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderError('zerobounce', `HTTP ${res.status}: ${text}`, res.status);
  }

  return res.json();
}

export async function verifySingle(email: string): Promise<EmailVerificationResult> {
  const data = await zbGet('/validate', {
    email,
    ip_address: '',
  }) as Record<string, unknown>;

  return {
    email: data.address as string,
    status: data.status as EmailVerificationResult['status'],
    sub_status: data.sub_status as string | undefined,
    free_email: data.free_email as boolean | undefined,
    did_you_mean: data.did_you_mean as string | null | undefined,
    processed_at: data.processed_at as string | undefined,
  };
}

export async function verifyBatch(emails: string[]): Promise<EmailVerificationResult[]> {
  const emailBatch = emails.map((email) => ({
    email_address: email,
    ip_address: '',
  }));

  const data = await zbPost('/validatebatch', { email_batch: emailBatch }) as Record<string, unknown>;
  const results = (data.email_batch as Array<Record<string, unknown>>) || [];

  return results.map((r) => ({
    email: r.address as string,
    status: r.status as EmailVerificationResult['status'],
    sub_status: r.sub_status as string | undefined,
    free_email: r.free_email as boolean | undefined,
    did_you_mean: r.did_you_mean as string | null | undefined,
    processed_at: r.processed_at as string | undefined,
  }));
}

export async function getCredits(): Promise<number> {
  const data = await zbGet('/getcredits', {}) as Record<string, unknown>;
  return parseInt(String(data.Credits || '0'), 10);
}
