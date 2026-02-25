import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkBudget, consumeCredits } from '@/lib/enrichment/budget';
import { buildCacheKey, checkCache, writeCache } from '@/lib/enrichment/cache';
import { mergeContactData, writeProvenance, determineEnrichmentStatus } from '@/lib/enrichment/merge';
import { ContactEnrichmentData, Provider } from '@/lib/enrichment/types';
import * as apollo from '@/lib/enrichment/providers/apollo';
import * as proxycurl from '@/lib/enrichment/providers/proxycurl';
import * as zerobounce from '@/lib/enrichment/providers/zerobounce';

const STATUS_FIELDS = [
  'email', 'title', 'linkedin_url', 'bio', 'headshot_url',
  'work_phone', 'cell_phone', 'work_address',
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const providers: Provider[] = body.providers || ['apollo'];

    const supabase = createAdminClient();
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*, companies(name, website, linkedin_url)')
      .eq('id', id)
      .single();

    if (error || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const c = contact as Record<string, unknown>;
    const company = c.companies as Record<string, unknown> | null;
    const results = [];

    for (const provider of providers) {
      try {
        await checkBudget(provider, provider === 'proxycurl' ? 3 : 1);

        const params = {
          first_name: c.first_name as string,
          last_name: c.last_name as string,
          email: c.email as string | undefined,
          linkedin_url: c.linkedin_url as string | undefined,
          company_name: company?.name as string | undefined,
          domain: company?.website ? new URL(company.website as string).hostname : undefined,
        };

        const operation = provider === 'zerobounce' ? 'verify_email' : 'enrich_person';
        const cacheKey = buildCacheKey(provider, operation as 'enrich_person' | 'verify_email', params as Record<string, unknown>);
        const cached = await checkCache(cacheKey);

        let data: Record<string, unknown>;
        let creditsUsed = 0;

        if (cached) {
          data = cached;
        } else if (provider === 'zerobounce') {
          if (!c.email) continue;
          const result = await zerobounce.verifySingle(c.email as string);
          data = { email_status: result.status };
          creditsUsed = 1;

          // Update email verification fields
          await supabase
            .from('contacts')
            .update({
              email_status: result.status,
              email_verified_at: new Date().toISOString(),
            })
            .eq('id', id);

          await writeCache(cacheKey, provider, 'verify_email', params as Record<string, unknown>, data);
        } else {
          const enrichFn = provider === 'apollo' ? apollo.enrichPerson : proxycurl.enrichPerson;
          const result = await enrichFn(params);
          data = result.data;
          creditsUsed = result.credits_used;

          if (result.success) {
            await writeCache(cacheKey, provider, 'enrich_person', params as Record<string, unknown>, data);
          }
        }

        // Log
        await supabase.from('enrichment_logs').insert({
          contact_id: id,
          provider,
          request_type: operation,
          request_payload: params as Record<string, unknown>,
          response_payload: data,
          status: 'success',
          credits_used: creditsUsed,
        });

        // Merge
        if (provider !== 'zerobounce' && Object.keys(data).length > 0) {
          const merged = mergeContactData(c, data as ContactEnrichmentData, provider);
          if (Object.keys(merged).length > 0) {
            const updated = { ...c, ...merged };
            const enrichmentStatus = determineEnrichmentStatus(updated, STATUS_FIELDS);
            await supabase
              .from('contacts')
              .update({ ...merged, enrichment_status: enrichmentStatus, last_enriched_at: new Date().toISOString() })
              .eq('id', id);
          }
          await writeProvenance('contact', id, provider, data);
        }

        // Consume credits
        if (creditsUsed > 0) {
          await consumeCredits(provider, creditsUsed);
        }

        results.push({ provider, success: true, fields_updated: Object.keys(data) });
      } catch (err) {
        results.push({
          provider,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
