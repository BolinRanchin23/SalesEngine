import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: program, error } = await supabase
      .from("programs")
      .select("*, program_steps(*)")
      .eq("id", id)
      .single();

    if (error || !program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // Sort steps by position
    if (Array.isArray(program.program_steps)) {
      program.program_steps.sort(
        (a: { position: number }, b: { position: number }) =>
          a.position - b.position
      );
    }

    return NextResponse.json({ data: program });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const updates: Record<string, unknown> = {};
    const allowedFields = ["name", "description", "is_active", "is_cycling"];
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("programs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Delete tasks associated with this program's assignments
    const { data: assignments } = await supabase
      .from("contact_programs")
      .select("id")
      .eq("program_id", id);

    if (assignments && assignments.length > 0) {
      const assignmentIds = assignments.map((a) => a.id);
      await supabase
        .from("touch_point_tasks")
        .delete()
        .in("contact_program_id", assignmentIds);
    }

    // Delete assignments
    await supabase.from("contact_programs").delete().eq("program_id", id);

    // Delete steps
    await supabase.from("program_steps").delete().eq("program_id", id);

    // Delete program
    const { error } = await supabase.from("programs").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
