import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('property_tenants')
      .select('*, companies(*)')
      .eq('property_id', id)
      .order('is_primary_tenant', { ascending: false });

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { company_id } = body;

    if (!company_id) {
      return NextResponse.json(
        { error: 'Missing required field: company_id' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const insertPayload: Record<string, unknown> = {
      property_id: id,
      company_id,
    };

    const optionalFields = [
      'floor_suite',
      'occupied_sqft',
      'lease_start',
      'lease_end',
      'is_primary_tenant',
      'notes',
    ];

    for (const field of optionalFields) {
      if (body[field] !== undefined) {
        insertPayload[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('property_tenants')
      .insert(insertPayload)
      .select('*, companies(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { company_id } = await request.json();

    if (!company_id) {
      return NextResponse.json(
        { error: 'Missing required field: company_id' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('property_tenants')
      .delete()
      .eq('property_id', id)
      .eq('company_id', company_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
