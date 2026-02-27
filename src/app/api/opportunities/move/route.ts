import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { opportunityId, newStageId } = await request.json();

    if (!opportunityId || !newStageId) {
      return NextResponse.json(
        { error: 'Missing required fields: opportunityId, newStageId' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch current opportunity to get old stage_id
    const { data: opportunity, error: fetchError } = await supabase
      .from('opportunities')
      .select('stage_id')
      .eq('id', opportunityId)
      .single();

    if (fetchError || !opportunity) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    const oldStageId = opportunity.stage_id;

    // Update the opportunity stage
    const { error: updateError } = await supabase
      .from('opportunities')
      .update({
        stage_id: newStageId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log stage change activity
    const { error: activityError } = await supabase
      .from('opportunity_activities')
      .insert({
        opportunity_id: opportunityId,
        type: 'stage_change',
        old_stage_id: oldStageId,
        new_stage_id: newStageId,
      });

    if (activityError) {
      return NextResponse.json({ error: activityError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
