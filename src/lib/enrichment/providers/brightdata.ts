import { PersonEnrichParams, EnrichmentResult } from '../types';
import { ProviderError, RateLimitError } from '../errors';
import { mapBrightDataPersonToContact } from './mappers';

const SCRAPE_URL =
  'https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_l1viktl72bvl7bjuj0&format=json&uncompressed_webhook=true';
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_MS = 90000;

function getApiKey(): string {
  const key = process.env.BRIGHTDATA_API_KEY;
  if (!key) throw new Error('BRIGHTDATA_API_KEY not configured');
  return key;
}

export async function enrichPerson(params: PersonEnrichParams): Promise<EnrichmentResult> {
  const linkedinUrl = params.linkedin_url;
  if (!linkedinUrl) {
    return { provider: 'brightdata', success: false, credits_used: 0, data: {}, cached: false };
  }

  const res = await fetch(SCRAPE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ url: linkedinUrl }]),
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000;
    throw new RateLimitError('brightdata', delayMs);
  }

  if (res.status === 200) {
    const body = await res.json();
    const profile = Array.isArray(body) ? body[0] : body;
    if (!profile) {
      return { provider: 'brightdata', success: false, credits_used: 1, data: {}, cached: false };
    }
    return {
      provider: 'brightdata',
      success: true,
      credits_used: 1,
      data: mapBrightDataPersonToContact(profile as Record<string, unknown>) as unknown as Record<string, unknown>,
      cached: false,
    };
  }

  if (res.status === 202) {
    const accepted = await res.json();
    const snapshotId = accepted.snapshot_id as string | undefined;
    if (!snapshotId) {
      throw new ProviderError('brightdata', 'No snapshot_id in 202 response', 202, accepted);
    }
    const profile = await pollForResult(snapshotId);
    if (!profile) {
      return { provider: 'brightdata', success: false, credits_used: 1, data: {}, cached: false };
    }
    return {
      provider: 'brightdata',
      success: true,
      credits_used: 1,
      data: mapBrightDataPersonToContact(profile) as unknown as Record<string, unknown>,
      cached: false,
    };
  }

  const text = await res.text().catch(() => '');
  throw new ProviderError('brightdata', `HTTP ${res.status}: ${text}`, res.status);
}

async function pollForResult(snapshotId: string): Promise<Record<string, unknown> | null> {
  const progressUrl = `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`;
  const snapshotUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`;
  const deadline = Date.now() + MAX_POLL_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const progressRes = await fetch(progressUrl, {
      headers: { Authorization: `Bearer ${getApiKey()}` },
    });

    if (!progressRes.ok) continue;

    const progress = await progressRes.json();
    if (progress.status === 'ready') {
      const snapshotRes = await fetch(snapshotUrl, {
        headers: { Authorization: `Bearer ${getApiKey()}` },
      });
      if (!snapshotRes.ok) return null;
      const data = await snapshotRes.json();
      const profile = Array.isArray(data) ? data[0] : data;
      return (profile as Record<string, unknown>) ?? null;
    }

    if (progress.status === 'failed') return null;
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
