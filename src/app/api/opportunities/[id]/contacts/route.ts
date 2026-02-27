import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { contact_id, role } = await request.json();

    if (!contact_id) {
      return NextResponse.json(
        { error: 'Missing required field: contact_id' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const insertPayload: Record<string, unknown> = {
      opportunity_id: id,
      contact_id,
    };

    if (role !== undefined) {
      insertPayload.role = role;
    }

    const { data, error } = await supabase
      .from('opportunity_contacts')
      .insert(insertPayload)
      .select('*, contacts(*)')
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
    const { contact_id } = await request.json();

    if (!contact_id) {
      return NextResponse.json(
        { error: 'Missing required field: contact_id' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('opportunity_contacts')
      .delete()
      .eq('opportunity_id', id)
      .eq('contact_id', contact_id);

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
