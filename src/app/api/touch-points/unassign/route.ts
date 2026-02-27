import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contact_id, program_id } = body;

    if (!contact_id || !program_id) {
      return NextResponse.json(
        { error: "Missing required fields: contact_id, program_id" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find the active assignment
    const { data: assignment, error: findError } = await supabase
      .from("contact_programs")
      .select("id")
      .eq("contact_id", contact_id)
      .eq("program_id", program_id)
      .eq("is_active", true)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (!assignment) {
      return NextResponse.json(
        { error: "No active assignment found" },
        { status: 404 }
      );
    }

    // Deactivate the assignment
    await supabase
      .from("contact_programs")
      .update({ is_active: false })
      .eq("id", assignment.id);

    // Delete pending tasks for this assignment
    await supabase
      .from("touch_point_tasks")
      .delete()
      .eq("contact_program_id", assignment.id)
      .eq("status", "pending");

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
