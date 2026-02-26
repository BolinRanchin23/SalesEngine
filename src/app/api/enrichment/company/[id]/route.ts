import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkBudget, consumeCredits } from '@/lib/enrichment/budget';
import { buildCacheKey, checkCache, writeCache } from '@/lib/enrichment/cache';
import { mergeCompanyData, writeProvenance, determineEnrichmentStatus } from '@/lib/enrichment/merge';
import { CompanyEnrichmentData, Provider } from '@/lib/enrichment/types';
import * as apollo from '@/lib/enrichment/providers/apollo';

const STATUS_FIELDS = [
  'industry', 'website', 'phone', 'linkedin_url', 'description',
  'hq_address', 'employee_count_range', 'revenue_range',
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
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const c = company as Record<string, unknown>;
    const results = [];

    for (const provider of providers) {
      if (provider !== 'apollo') continue; // Only Apollo supports company enrichment

      try {
        await checkBudget(provider, 1);

        const enrichParams = {
          name: c.name as string,
          domain: c.website ? new URL(c.website as string).hostname : undefined,
          linkedin_url: c.linkedin_url as string | undefined,
        };

        const cacheKey = buildCacheKey(provider, 'enrich_company', enrichParams as Record<string, unknown>);
        const cached = await checkCache(cacheKey);

        let data: Record<string, unknown>;
        let creditsUsed = 0;

        if (cached) {
          data = cached;
        } else {
          const enrichFn = apollo.enrichCompany;
          const result = await enrichFn(enrichParams);
          data = result.data;
          creditsUsed = result.credits_used;

          if (result.success) {
            await writeCache(cacheKey, provider, 'enrich_company', enrichParams as Record<string, unknown>, data);
          }
        }

        // Log
        await supabase.from('enrichment_logs').insert({
          company_id: id,
          provider,
          request_type: 'enrich_company',
          request_payload: enrichParams as Record<string, unknown>,
          response_payload: data,
          status: 'success',
          credits_used: creditsUsed,
        });

        // Merge
        if (Object.keys(data).length > 0) {
          const merged = mergeCompanyData(c, data as CompanyEnrichmentData, provider);
          if (Object.keys(merged).length > 0) {
            const updated = { ...c, ...merged };
            const enrichmentStatus = determineEnrichmentStatus(updated, STATUS_FIELDS);
            await supabase
              .from('companies')
              .update({ ...merged, enrichment_status: enrichmentStatus, last_enriched_at: new Date().toISOString() })
              .eq('id', id);
          }
          await writeProvenance('company', id, provider, data);
        }

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
