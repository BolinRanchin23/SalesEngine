import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const { entityId } = await params;
    const supabase = createAdminClient();

    // Get enrichment logs
    const { data: logs } = await supabase
      .from('enrichment_logs')
      .select('*')
      .or(`contact_id.eq.${entityId},company_id.eq.${entityId}`)
      .order('created_at', { ascending: false });

    // Get field provenance
    const { data: provenance } = await supabase
      .from('enrichment_field_provenance')
      .select('*')
      .eq('entity_id', entityId)
      .order('enriched_at', { ascending: false });

    return NextResponse.json({
      logs: logs ?? [],
      provenance: provenance ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
