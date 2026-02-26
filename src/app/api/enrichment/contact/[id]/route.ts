import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkBudget, consumeCredits } from '@/lib/enrichment/budget';
import { buildCacheKey, checkCache, writeCache } from '@/lib/enrichment/cache';
import { mergeContactData, writeProvenance, determineEnrichmentStatus } from '@/lib/enrichment/merge';
import { ContactEnrichmentData, Provider } from '@/lib/enrichment/types';
import { BudgetExhaustedError } from '@/lib/enrichment/errors';
import * as apollo from '@/lib/enrichment/providers/apollo';
import * as pdl from '@/lib/enrichment/providers/pdl';
import * as zerobounce from '@/lib/enrichment/providers/zerobounce';
import * as brightdata from '@/lib/enrichment/providers/brightdata';

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
        await checkBudget(provider, 1);

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
          const enrichFn = provider === 'apollo'
            ? apollo.enrichPerson
            : provider === 'brightdata'
              ? brightdata.enrichPerson
              : pdl.enrichPerson;
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
        // PDL budget exhausted → try Bright Data fallback if contact has LinkedIn URL
        if (
          err instanceof BudgetExhaustedError &&
          provider === 'pdl' &&
          c.linkedin_url
        ) {
          try {
            await checkBudget('brightdata', 1);
            const bdParams = {
              first_name: c.first_name as string,
              last_name: c.last_name as string,
              linkedin_url: c.linkedin_url as string,
            };
            const bdOperation = 'enrich_person' as const;
            const bdCacheKey = buildCacheKey('brightdata', bdOperation, bdParams as Record<string, unknown>);
            const bdCached = await checkCache(bdCacheKey);

            let bdData: Record<string, unknown>;
            let bdCredits = 0;

            if (bdCached) {
              bdData = bdCached;
            } else {
              const bdResult = await brightdata.enrichPerson(bdParams);
              bdData = bdResult.data;
              bdCredits = bdResult.credits_used;
              if (bdResult.success) {
                await writeCache(bdCacheKey, 'brightdata', bdOperation, bdParams as Record<string, unknown>, bdData);
              }
            }

            await supabase.from('enrichment_logs').insert({
              contact_id: id,
              provider: 'brightdata',
              request_type: bdOperation,
              request_payload: bdParams as Record<string, unknown>,
              response_payload: bdData,
              status: 'success',
              credits_used: bdCredits,
            });

            if (Object.keys(bdData).length > 0) {
              const merged = mergeContactData(c, bdData as ContactEnrichmentData, 'brightdata');
              if (Object.keys(merged).length > 0) {
                const updated = { ...c, ...merged };
                const enrichmentStatus = determineEnrichmentStatus(updated, STATUS_FIELDS);
                await supabase
                  .from('contacts')
                  .update({ ...merged, enrichment_status: enrichmentStatus, last_enriched_at: new Date().toISOString() })
                  .eq('id', id);
              }
              await writeProvenance('contact', id, 'brightdata', bdData);
            }

            if (bdCredits > 0) {
              await consumeCredits('brightdata', bdCredits);
            }

            results.push({
              provider: 'brightdata' as Provider,
              success: true,
              fields_updated: Object.keys(bdData),
              fallback_from: 'pdl',
            });
            continue;
          } catch {
            // Bright Data fallback also failed — report original PDL error
          }
        }

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
