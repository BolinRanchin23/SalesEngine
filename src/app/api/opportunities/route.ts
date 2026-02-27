import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const stageId = searchParams.get('stage_id');

    let query = supabase
      .from('opportunities')
      .select('*, opportunity_stages(*), properties(*), companies(*), contacts(*)')
      .order('created_at', { ascending: false });

    if (stageId) {
      query = query.eq('stage_id', stageId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, stage_id } = body;

    if (!name || !stage_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, stage_id' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const insertPayload: Record<string, unknown> = {
      name,
      stage_id,
    };

    const optionalFields = [
      'property_id',
      'company_id',
      'primary_contact_id',
      'estimated_cleanable_sqft',
      'possible_cleanable_sqft',
      'estimated_value',
      'close_date',
      'next_steps',
      'notes',
      'probability',
      'source',
    ];

    for (const field of optionalFields) {
      if (body[field] !== undefined) {
        insertPayload[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('opportunities')
      .insert(insertPayload)
      .select('*, opportunity_stages(*), properties(*), companies(*), contacts(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create initial stage_change activity
    await supabase.from('opportunity_activities').insert({
      opportunity_id: data.id,
      type: 'stage_change',
      new_stage_id: stage_id,
      description: 'Opportunity created',
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
