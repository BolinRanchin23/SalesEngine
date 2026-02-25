import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateContactPriority, calculateCompanyPriority } from '@/lib/enrichment/priority';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity_type, entity_id, provider, operation } = body;

    if (!entity_type || !entity_id || !provider || !operation) {
      return NextResponse.json(
        { error: 'Missing required fields: entity_type, entity_id, provider, operation' },
        { status: 400 }
      );
    }

    const priority = entity_type === 'contact'
      ? await calculateContactPriority(entity_id)
      : await calculateCompanyPriority(entity_id);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('enrichment_queue')
      .upsert(
        {
          entity_type,
          entity_id,
          provider,
          operation,
          priority,
          status: 'pending',
        },
        { onConflict: 'entity_type,entity_id,provider,operation' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, queue_item: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
