import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateContactPriority, calculateCompanyPriority } from '@/lib/enrichment/priority';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      entity_type,
      provider,
      operation,
      filter,
    } = body as {
      entity_type: 'contact' | 'company';
      provider: string;
      operation: string;
      filter?: { enrichment_status?: string; source?: string; limit?: number };
    };

    if (!entity_type || !provider || !operation) {
      return NextResponse.json(
        { error: 'Missing required fields: entity_type, provider, operation' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const table = entity_type === 'contact' ? 'contacts' : 'companies';

    let query = supabase.from(table).select('id');
    if (filter?.enrichment_status) {
      query = query.eq('enrichment_status', filter.enrichment_status);
    }
    if (filter?.source) {
      query = query.eq('source', filter.source);
    }
    query = query.limit(filter?.limit || 100);

    const { data: entities } = await query;
    if (!entities || entities.length === 0) {
      return NextResponse.json({ ok: true, enqueued: 0 });
    }

    const queueItems = [];
    for (const entity of entities) {
      const priority = entity_type === 'contact'
        ? await calculateContactPriority(entity.id)
        : await calculateCompanyPriority(entity.id);

      queueItems.push({
        entity_type,
        entity_id: entity.id,
        provider,
        operation,
        priority,
        status: 'pending',
      });
    }

    const { error } = await supabase
      .from('enrichment_queue')
      .upsert(queueItems, { onConflict: 'entity_type,entity_id,provider,operation' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, enqueued: queueItems.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
